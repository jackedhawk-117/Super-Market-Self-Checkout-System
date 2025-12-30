# Self-Checkout Backend API

A Node.js/Express backend API for the Flutter Self-Checkout application.

## 🚀 Features

- **User Authentication** (Register/Login with JWT)
- **Product Management** (CRUD operations)
- **Transaction Processing** (Create transactions, QR code generation)
- **Barcode Scanning Integration**
- **Stock Management**
- **Analytics & Customer Segmentation** (K-Means clustering, RFM analysis)
- **Marketing Campaign Analysis** (CSV-based campaign response analysis)
- **SQLite Database** (Easy setup, can be upgraded to PostgreSQL/MySQL)

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## 🛠️ Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy the config file
   cp config.env .env
   
   # Edit .env file with your settings
   # Change JWT_SECRET to a secure random string
   ```

4. **Initialize the database:**
   ```bash
   npm run init-db
   ```

5. **Start the server:**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3000`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Products
- `GET /api/products` - Get all products
- `GET /api/products/barcode/:barcode` - Get product by barcode
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)
- `GET /api/products/category/:category` - Get products by category

### Transactions
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions` - Get user's transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `PATCH /api/transactions/:id/status` - Update transaction status
- `POST /api/transactions/verify-qr` - Verify QR code data

### Analytics (Admin Only)
- `GET /api/analytics/segmentation` - Customer segmentation analysis
- `GET /api/analytics/statistics` - Customer and transaction statistics
- `GET /api/analytics/marketing-campaign?path=<csv_path>` - Marketing campaign analysis

### Health Check
- `GET /api/health` - Server health status

## 🔐 Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## 📊 Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email address
- `password` - Hashed password
- `name` - User's full name
- `created_at`, `updated_at` - Timestamps

### Products Table
- `id` - Unique product ID
- `name` - Product name
- `price` - Product price
- `barcode` - Unique barcode
- `description` - Product description
- `category` - Product category
- `stock_quantity` - Available stock
- `image_url` - Product image URL
- `is_active` - Product status
- `created_at`, `updated_at` - Timestamps

### Transactions Table
- `id` - Unique transaction ID
- `user_id` - Foreign key to users
- `total_amount` - Total transaction amount
- `status` - Transaction status (pending/paid/cancelled/refunded)
- `payment_method` - Payment method used
- `qr_code_data` - JSON data for QR code
- `created_at`, `updated_at` - Timestamps

### Transaction Items Table
- `id` - Primary key
- `transaction_id` - Foreign key to transactions
- `product_id` - Foreign key to products
- `quantity` - Item quantity
- `unit_price` - Price per unit
- `total_price` - Total price for this item
- `created_at` - Timestamp

## 🧪 Testing the API

### Sample Requests

**Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get product by barcode:**
```bash
curl http://localhost:3000/api/products/barcode/111111
```

**Create transaction:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "items": [
      {
        "product_id": "1",
        "quantity": 2
      }
    ],
    "payment_method": "cash"
  }'
```

**Marketing campaign analysis (Admin):**
```bash
curl -X GET \
  "http://localhost:3000/api/analytics/marketing-campaign?path=/path/to/campaign.csv" \
  -H "Authorization: Bearer <your_jwt_token>"
```

See `API_DOCUMENTATION.md` for detailed analytics endpoint documentation.

## 🔧 Configuration

Edit `config.env` to customize:

- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - Token expiration time
- `DATABASE_PATH` - SQLite database file path
- `CORS_ORIGIN` - Allowed CORS origins

## 🚀 Production Deployment

1. **Use a production database** (PostgreSQL/MySQL)
2. **Set secure environment variables**
3. **Use a reverse proxy** (nginx)
4. **Enable HTTPS**
5. **Set up monitoring and logging**

## 📱 Flutter Integration

The Flutter app needs to be updated to use these APIs. Key changes:

1. Add `http` package for API calls
2. Implement JWT token storage
3. Replace mock data with API calls
4. Add error handling for network requests
5. Implement proper loading states

## 🐛 Troubleshooting

**Database issues:**
- Ensure SQLite file permissions
- Check database path in config
- Run `npm run init-db` to recreate tables

**Authentication issues:**
- Verify JWT_SECRET is set
- Check token expiration
- Ensure Authorization header format

**CORS issues:**
- Update CORS_ORIGIN in config
- Check Flutter app URL

## 📄 License

MIT License - feel free to use this project for learning and development.


