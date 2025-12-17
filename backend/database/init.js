const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './database/checkout.db';

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);

async function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'customer',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Add role column if it doesn't exist (migration)
      db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'`, (err) => {
        // Ignore error if column already exists
      });

      // Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          price REAL NOT NULL,
          barcode TEXT UNIQUE NOT NULL,
          description TEXT,
          category TEXT,
          stock_quantity INTEGER DEFAULT 0,
          image_url TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Transactions table
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          total_amount REAL NOT NULL,
          status TEXT DEFAULT 'pending',
          payment_method TEXT,
          qr_code_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Transaction items table
      db.run(`
        CREATE TABLE IF NOT EXISTS transaction_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transaction_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          total_price REAL NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (transaction_id) REFERENCES transactions (id),
          FOREIGN KEY (product_id) REFERENCES products (id)
        )
      `);

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id)`);

      // Insert sample data
      db.run(`
        INSERT OR IGNORE INTO users (email, password, name, role) VALUES 
        ('admin@checkout.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'admin'),
        ('test@checkout.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Test User', 'customer')
      `);

      db.run(`
        INSERT OR IGNORE INTO products (id, name, price, barcode, description, category, stock_quantity) VALUES 
        ('1', 'Fresh Milk', 1.50, '111111', 'Fresh whole milk 1L', 'Dairy', 50),
        ('2', 'Brown Bread', 2.20, '222222', 'Whole wheat brown bread', 'Bakery', 30),
        ('3', 'Organic Eggs (12)', 4.50, '333333', 'Free-range organic eggs', 'Dairy', 25),
        ('4', 'Avocado', 1.80, '444444', 'Fresh Hass avocado', 'Produce', 40),
        ('5', 'Chicken Breast', 8.99, '555555', 'Fresh chicken breast 500g', 'Meat', 20),
        ('6', 'Cheddar Cheese', 5.40, '666666', 'Aged cheddar cheese 200g', 'Dairy', 35),
        ('7', 'Greek Yogurt', 3.25, '777777', 'Plain Greek yogurt 500g', 'Dairy', 30),
        ('8', 'Almond Milk', 2.99, '888888', 'Unsweetened almond milk 1L', 'Dairy Alternatives', 25),
        ('9', 'Whole Wheat Pasta', 1.75, '999999', 'Organic whole wheat pasta 500g', 'Pantry', 40)
      `);

      console.log('✅ Database tables created successfully');
      console.log('✅ Sample data inserted successfully');
      resolve();
    });

    db.on('error', (err) => {
      console.error('Database error:', err);
      reject(err);
    });
  });
}

function getDatabase() {
  return db;
}

module.exports = {
  initDatabase,
  getDatabase
};

