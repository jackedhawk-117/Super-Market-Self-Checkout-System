# Super Market Self-Checkout System

## Project Overview
This project is a comprehensive Self-Checkout System featuring a Flutter mobile app for customers and a robust Node.js backend with advanced analytics capabilities. The system enables users to scan products, manage carts, and checkout seamlessly, while providing administrators with powerful insights via machine learning.

## System Architecture

### Frontend (Mobile App)
- **Framework**: Flutter (Dart)
- **Key Features**:
  - **Authentication**: User registration and login (Customer & Admin roles).
  - **Barcode Scanning**: Integrated QR/Barcode scanner for adding products to cart.
  - **Cart Management**: Real-time cart updates and total calculation.
  - **Dynamic Recommendations**: "Just For You" section displaying product recommendations.
  - **Checkout Flow**: Secure checkout process (simulation).
  - **Admin Dashboard**: Special access for admin users.

### Backend (API & Database)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (`checkout.db`)
- **Key Features**:
  - **REST API**: Endpoints for authentication, products, transactions, and analytics.
  - **JWT Authentication**: Secure API access using JSON Web Tokens.
  - **Rate Limiting**: Protection against API abuse.
  - **Data Persistence**: Stores users, products, transactions, and line items.

### Analytics & Machine Learning
The project includes a sophisticated analytics module capable of leveraging real-time database data.

#### 1. Dynamic Pricing Engine (`dynamic_pricing.py`)
- **Purpose**: Predicts optimal product unit prices based on historical transaction data.
- **Data Source**: Automatically fetches training data from `checkout.db` (Transactions & Items).
- **Algorithm**: Linear Regression (Scikit-Learn) with feature engineering (OneHotEncoding for categories).
- **Features Used**: Date (Year, Month, Day), Product Category, Transaction metadata.
- **Outputs**:
  - Predicted prices CSV.
  - Performance metrics (RMSE, R2, MAE).
  - Visualizations (Actual vs Predicted, Residuals).

#### 2. Price Update Automation (`apply_price_updates.js`)
- **Purpose**: Applies the predicted prices back to the product database.
- **Features**:
  - **Safety Checks**: Prevents extreme price changes (configurable threshold, default 50%).
  - **Dry Run**: Capability to preview changes before applying.
  - **Audit**: Tracks updated, skipped, and error rows.

## Setup & Running

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- Flutter SDK

### Quick Start

1.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    # Initialize database
    node server.js
    ```

2.  **Analytics Setup**:
    ```bash
    cd backend/analytics
    pip install -r requirements.txt
    
    # Run Dynamic Pricing Model (connects to DB automatically)
    python3 dynamic_pricing.py --use-db
    ```

3.  **Frontend Setup**:
    ```bash
    cd ..
    flutter pub get
    flutter run
    ```
