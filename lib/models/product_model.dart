class Product {
  final String id;
  final String name;
  final double price;
  final String barcode;
  final String? description;
  final String? category;
  final int stockQuantity;
  final String? imageUrl;

  const Product({
    required this.id,
    required this.name,
    required this.price,
    required this.barcode,
    this.description,
    this.category,
    this.stockQuantity = 0,
    this.imageUrl,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      name: json['name'],
      price: (json['price'] as num).toDouble(),
      barcode: json['barcode'],
      description: json['description'],
      category: json['category'],
      stockQuantity: json['stock_quantity'] ?? 0,
      imageUrl: json['image_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'barcode': barcode,
      'description': description,
      'category': category,
      'stock_quantity': stockQuantity,
      'image_url': imageUrl,
    };
  }

  Product copyWith({
    String? id,
    String? name,
    double? price,
    String? barcode,
    String? description,
    String? category,
    int? stockQuantity,
    String? imageUrl,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      barcode: barcode ?? this.barcode,
      description: description ?? this.description,
      category: category ?? this.category,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      imageUrl: imageUrl ?? this.imageUrl,
    );
  }
}

class User {
  final String id;
  final String email;
  final String name;

  const User({required this.id, required this.email, required this.name});

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'].toString(),
      email: json['email'],
      name: json['name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {'id': id, 'email': email, 'name': name};
  }
}

class TransactionItem {
  final String productId;
  final String productName;
  final int quantity;
  final double unitPrice;
  final double totalPrice;
  final String? barcode;

  const TransactionItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.totalPrice,
    this.barcode,
  });

  factory TransactionItem.fromJson(Map<String, dynamic> json) {
    return TransactionItem(
      productId: json['product_id'],
      productName: json['product_name'] ?? '',
      quantity: json['quantity'],
      unitPrice: (json['unit_price'] as num).toDouble(),
      totalPrice: (json['total_price'] as num).toDouble(),
      barcode: json['barcode'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'product_id': productId,
      'product_name': productName,
      'quantity': quantity,
      'unit_price': unitPrice,
      'total_price': totalPrice,
      'barcode': barcode,
    };
  }
}

class Transaction {
  final String id;
  final String userId;
  final double totalAmount;
  final String status;
  final String? paymentMethod;
  final String? qrCodeData;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<TransactionItem> items;

  const Transaction({
    required this.id,
    required this.userId,
    required this.totalAmount,
    required this.status,
    this.paymentMethod,
    this.qrCodeData,
    required this.createdAt,
    required this.updatedAt,
    this.items = const [],
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'],
      userId: json['user_id'].toString(),
      totalAmount: (json['total_amount'] as num).toDouble(),
      status: json['status'],
      paymentMethod: json['payment_method'],
      qrCodeData: json['qr_code_data'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
      items:
          (json['items'] as List<dynamic>?)
              ?.map((item) => TransactionItem.fromJson(item))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'total_amount': totalAmount,
      'status': status,
      'payment_method': paymentMethod,
      'qr_code_data': qrCodeData,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}


