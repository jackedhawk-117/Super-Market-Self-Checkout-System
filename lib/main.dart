// ============== DATA MODELS ==============
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';

// Product model
class Product {
  final String id;
  final String name;
  final double price;
  final String barcode;

  const Product({
    required this.id,
    required this.name,
    required this.price,
    required this.barcode,
  });
}

// CartItem model
class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, required this.quantity});
}

// ============== MOCK DATA ==============
const List<Product> mockProducts = [
  Product(id: '1', name: 'Fresh Milk', price: 1.50, barcode: '111111'),
  Product(id: '2', name: 'Brown Bread', price: 2.20, barcode: '222222'),
  Product(id: '3', name: 'Organic Eggs (12)', price: 4.50, barcode: '333333'),
  Product(id: '4', name: 'Avocado', price: 1.80, barcode: '444444'),
  Product(id: '5', name: 'Chicken Breast', price: 8.99, barcode: '555555'),
  Product(id: '6', name: 'Cheddar Cheese', price: 5.40, barcode: '666666'),
];

const List<Product> mockRecommendations = [
  Product(id: '7', name: 'Greek Yogurt', price: 3.25, barcode: '777777'),
  Product(id: '8', name: 'Almond Milk', price: 2.99, barcode: '888888'),
  Product(id: '9', name: 'Whole Wheat Pasta', price: 1.75, barcode: '999999'),
];

// ============== MAIN APP ==============
void main() {
  runApp(SelfCheckoutApp());
}

class SelfCheckoutApp extends StatelessWidget {
  const SelfCheckoutApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Self-Checkout',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: LoginScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}

// ============== AUTHENTICATION SCREEN ==============
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Colors.teal, Colors.tealAccent],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.shopping_cart_checkout,
                  size: 80,
                  color: Colors.white,
                ),
                const SizedBox(height: 24),
                Text(
                  'Welcome to Self-Checkout',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                _buildTextField(
                  controller: emailController,
                  hint: 'Email',
                  icon: Icons.email,
                  obscure: false,
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: passwordController,
                  hint: 'Password',
                  icon: Icons.lock,
                  obscure: true,
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.teal,
                    ),
                    child: const Text(
                      'Login',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    onPressed: () {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => HomeScreen()),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required bool obscure,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(
          0.9,
        ), // FIXED: use withOpacity, not withValues
        hintText: hint,
        prefixIcon: Icon(icon, color: Colors.teal),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

// ============== HOME SCREEN ==============
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<CartItem> cart = [];

  // Helper: get total price
  double get totalPrice =>
      cart.fold(0, (sum, item) => sum + item.product.price * item.quantity);

  // Helper: get unique cart items count
  int get cartCount => cart.length;

  // Simulate scanning a product
  void scanProduct() {
    final random = Random();
    final product = mockProducts[random.nextInt(mockProducts.length)];
    setState(() {
      final index = cart.indexWhere((item) => item.product.id == product.id);
      if (index >= 0) {
        cart[index].quantity += 1;
      } else {
        cart.add(CartItem(product: product, quantity: 1));
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Added "${product.name}" to cart!'),
        duration: Duration(seconds: 1),
      ),
    );
  }

  // Navigate to Cart Screen
  Future<void> goToCart() async {
    final updatedCart = await Navigator.of(context).push<List<CartItem>>(
      MaterialPageRoute(
        builder: (_) => CartScreen(cart: List<CartItem>.from(cart)),
      ),
    );
    if (updatedCart != null) {
      setState(() {
        cart = updatedCart;
      });
    }
  }

  // Navigate to Checkout Screen
  void goToCheckout() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(cart: cart, onFinish: clearCart),
      ),
    );
  }

  // Clear cart after checkout
  void clearCart() {
    setState(() {
      cart.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Start Shopping'),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.shopping_cart),
                onPressed: goToCart,
              ),
              if (cartCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.redAccent,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$cartCount',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Just For You',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 120,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: mockRecommendations.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, index) {
                      final product = mockRecommendations[index];
                      return buildRecommendationCard(product);
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 2,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      vertical: 20,
                      horizontal: 24,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total:',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        Text(
                          '\$${totalPrice.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.teal,
                          ),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.teal,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          onPressed: cart.isEmpty ? null : goToCheckout,
                          child: const Text('Checkout'),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Expanded(
                  child: Center(
                    child: Text(
                      cart.isEmpty
                          ? 'Your cart is empty.\nTap "Scan Product" to start shopping!'
                          : 'You have $cartCount item(s) in your cart.',
                      style: TextStyle(fontSize: 16, color: Colors.grey[700]),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
          ),
          // Scan Product Button
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 4,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                icon: const Icon(Icons.qr_code_scanner, size: 28),
                label: const Text(
                  'Scan Product',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                onPressed: scanProduct,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget buildRecommendationCard(Product product) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      elevation: 3,
      child: Container(
        width: 140,
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_offer, color: Colors.teal, size: 32),
            const SizedBox(height: 8),
            Text(
              product.name,
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 6),
            Text(
              '\$${product.price.toStringAsFixed(2)}',
              style: TextStyle(color: Colors.teal, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}

// ============== CART SCREEN ==============
class CartScreen extends StatefulWidget {
  final List<CartItem> cart;

  const CartScreen({super.key, required this.cart});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  late List<CartItem> cart;

  @override
  void initState() {
    super.initState();
    cart = widget.cart;
  }

  double get totalPrice =>
      cart.fold(0, (sum, item) => sum + item.product.price * item.quantity);

  void increaseQty(int index) {
    setState(() {
      cart[index].quantity += 1;
    });
  }

  void decreaseQty(int index) {
    setState(() {
      cart[index].quantity -= 1;
      if (cart[index].quantity <= 0) {
        cart.removeAt(index);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your Cart')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: cart.isEmpty
            ? Center(
                child: Text(
                  'Your cart is empty.',
                  style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                ),
              )
            : Column(
                children: [
                  Expanded(
                    child: ListView.separated(
                      itemCount: cart.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = cart[index];
                        return Card(
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 2,
                          child: ListTile(
                            title: Text(
                              item.product.name,
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                            subtitle: Text(
                              '\$${item.product.price.toStringAsFixed(2)}',
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: Icon(
                                    Icons.remove_circle_outline,
                                    color: Colors.teal,
                                  ),
                                  onPressed: () => decreaseQty(index),
                                ),
                                Text(
                                  '${item.quantity}',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.add_circle_outline,
                                    color: Colors.teal,
                                  ),
                                  onPressed: () => increaseQty(index),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total:',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Text(
                        '\$${totalPrice.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.teal,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: const Text(
                        'Back to Shopping',
                        style: TextStyle(fontSize: 16),
                      ),
                      onPressed: () {
                        Navigator.of(context).pop(cart);
                      },
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

// ============== CHECKOUT SCREEN ==============
class CheckoutScreen extends StatelessWidget {
  final List<CartItem> cart;
  final VoidCallback onFinish;

  const CheckoutScreen({super.key, required this.cart, required this.onFinish});

  double get totalPrice =>
      cart.fold(0, (sum, item) => sum + item.product.price * item.quantity);

  String get userId => 'user_001'; // Mock userId

  String get billJson {
    final bill = {
      'userId': userId,
      'timestamp': DateTime.now().toIso8601String(),
      'total': totalPrice,
      'items': cart
          .map(
            (item) => {
              'id': item.product.id,
              'name': item.product.name,
              'price': item.product.price,
              'quantity': item.quantity,
              'barcode': item.product.barcode,
            },
          )
          .toList(),
    };
    return jsonEncode(bill);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          children: [
            Text(
              'Please show this QR code to a staff member for payment verification.',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w500),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            Center(
              child: SizedBox(
                width: 220.0,
                height: 220.0,
                child: QrImageView(data: billJson, size: 220.0),
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'Total Bill: \$${totalPrice.toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Colors.teal,
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                icon: Icon(Icons.check_circle_outline),
                label: Text(
                  'Finish Shopping',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                onPressed: () {
                  onFinish();
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => HomeScreen()),
                    (route) => false,
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
