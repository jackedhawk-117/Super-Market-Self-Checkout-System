import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use computer's IP address for device access
  // static const String baseUrl = 'http://127.0.0.1:3000/api';
  static const String baseUrl = 'http://192.168.29.49:3000/api'; 
  static String? _token;
  static String? _userRole;

  // Initialize token from storage
  static Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    _userRole = prefs.getString('user_role');
  }

  // Get current user role
  static String? get userRole => _userRole;

  // Check if user is admin
  static bool get isAdmin => _userRole == 'admin';

  // Save token and user info to storage
  static Future<void> saveToken(String token, {String? role}) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    _token = token;
    if (role != null) {
      await prefs.setString('user_role', role);
      _userRole = role;
    }
  }

  // Clear token and user info from storage
  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('user_role');
    _token = null;
    _userRole = null;
  }

  // Get headers with authentication
  static Map<String, String> _getHeaders() {
    final headers = {'Content-Type': 'application/json'};

    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }

    return headers;
  }

  // Handle API responses
  static Map<String, dynamic> _handleResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return json.decode(response.body);
    } else {
      final error = json.decode(response.body);
      throw Exception(error['error'] ?? 'Request failed');
    }
  }

  // Authentication APIs
  static Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _getHeaders(),
      body: json.encode({'email': email, 'password': password, 'name': name}),
    );

    final result = _handleResponse(response);
    if (result['token'] != null) {
      await saveToken(result['token'], role: result['user']?['role']);
    }
    return result;
  }

  static Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _getHeaders(),
      body: json.encode({'email': email, 'password': password}),
    );

    final result = _handleResponse(response);
    if (result['token'] != null) {
      await saveToken(result['token'], role: result['user']?['role']);
    }
    return result;
  }

  static Future<Map<String, dynamic>> verifyToken() async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/verify'),
      headers: _getHeaders(),
    );

    final result = _handleResponse(response);
    // Update role from response if available
    if (result['user']?['role'] != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_role', result['user']['role']);
      _userRole = result['user']['role'];
    }
    return result;
  }

  static Future<void> logout() async {
    await clearToken();
  }

  // Product APIs
  static Future<List<dynamic>> getProducts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/products'),
      headers: _getHeaders(),
    );

    final result = _handleResponse(response);
    return result['data'] ?? [];
  }

  static Future<Map<String, dynamic>> getProductByBarcode(
    String barcode,
  ) async {
    final response = await http.get(
      Uri.parse('$baseUrl/products/barcode/$barcode'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> getProduct(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/products/$id'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  // Transaction APIs
  static Future<Map<String, dynamic>> createTransaction({
    required List<Map<String, dynamic>> items,
    String? paymentMethod,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/transactions'),
      headers: _getHeaders(),
      body: json.encode({'items': items, 'payment_method': paymentMethod}),
    );

    return _handleResponse(response);
  }

  static Future<List<dynamic>> getTransactions({
    int limit = 20,
    int offset = 0,
    String? status,
  }) async {
    String url = '$baseUrl/transactions?limit=$limit&offset=$offset';
    if (status != null) {
      url += '&status=$status';
    }

    final response = await http.get(Uri.parse(url), headers: _getHeaders());

    final result = _handleResponse(response);
    return result['data'] ?? [];
  }

  static Future<Map<String, dynamic>> getTransaction(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/transactions/$id'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> updateTransactionStatus({
    required String transactionId,
    required String status,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/transactions/$transactionId/status'),
      headers: _getHeaders(),
      body: json.encode({'status': status}),
    );

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> verifyQrCode(
    Map<String, dynamic> qrData,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/transactions/verify-qr'),
      headers: _getHeaders(),
      body: json.encode({'qr_data': qrData}),
    );

    return _handleResponse(response);
  }

  // Health check
  static Future<Map<String, dynamic>> healthCheck() async {
    final response = await http.get(
      Uri.parse('$baseUrl/health'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  // Analytics APIs
  static Future<Map<String, dynamic>> getCustomerSegmentation() async {
    final response = await http.get(
      Uri.parse('$baseUrl/analytics/segmentation'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> getStatistics() async {
    final response = await http.get(
      Uri.parse('$baseUrl/analytics/statistics'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> getMarketingCampaignAnalysis({
    String? csvPath,
  }) async {
    String url = '$baseUrl/analytics/marketing-campaign';
    if (csvPath != null) {
      url += '?path=${Uri.encodeComponent(csvPath)}';
    }
    
    final response = await http.get(
      Uri.parse(url),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  static Future<List<dynamic>> getLowStockAlerts() async {
    final response = await http.get(
      Uri.parse('$baseUrl/analytics/low-stock'),
      headers: _getHeaders(),
    );

    final result = _handleResponse(response);
    return result['data'] ?? [];
  }

  static Future<List<dynamic>> getRecommendations() async {
    final response = await http.get(
      Uri.parse('$baseUrl/analytics/recommendations'),
      headers: _getHeaders(),
    );

    final result = _handleResponse(response);
    return result['data'] ?? [];
  }

  static Future<Map<String, dynamic>> getDynamicPricing({
    String? csvPath,
  }) async {
    String url = '$baseUrl/analytics/dynamic-pricing';
    if (csvPath != null) {
      url += '?path=${Uri.encodeComponent(csvPath)}';
    }
    
    final response = await http.get(
      Uri.parse(url),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> getPricingSuggestion(String id) async {
    final response = await http.get(
      Uri.parse('$baseUrl/products/$id/pricing-suggestion'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
    return _handleResponse(response);
  }

  static Future<Map<String, dynamic>> applyPricingSuggestion(String id) async {
    final response = await http.post(
      Uri.parse('$baseUrl/products/$id/apply-pricing'),
      headers: _getHeaders(),
    );

    return _handleResponse(response);
  }
}
