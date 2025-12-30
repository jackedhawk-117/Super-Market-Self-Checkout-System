#!/usr/bin/env python3
"""
Import marketing campaign CSV data into the database
Creates users and transactions from the marketing campaign data
"""

import sqlite3
import sys
import os
import pandas as pd
import uuid
from datetime import datetime, timedelta

# Get database path
db_path = os.getenv('DATABASE_PATH', './database/checkout.db')
if not os.path.isabs(db_path):
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(backend_dir, db_path)

# Get CSV path
csv_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'analytics', 'marketing_campaign.csv'
)

default_password = 'password'
# Use the same bcrypt hash as in init.js (hash of 'password')
hashed_password = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'

def import_marketing_data():
    """Import marketing campaign data into database"""
    
    print(f"📂 Reading CSV file: {csv_path}")
    
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found: {csv_path}")
    
    # Read CSV
    df = pd.read_csv(csv_path)
    print(f"✅ Loaded {len(df)} rows from CSV")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        conn.execute('BEGIN TRANSACTION')
        
        users_imported = 0
        transactions_imported = 0
        
        # Process each row
        for idx, row in df.iterrows():
            customer_id = int(row['ID'])
            email = f"customer{customer_id}@marketing.com"
            name = f"Customer {customer_id}"
            
            # Calculate total spending
            spending_cols = ['MntWines', 'MntFruits', 'MntMeatProducts', 
                           'MntFishProducts', 'MntSweetProducts', 'MntGoldProds']
            total_spending = sum(float(row.get(col, 0) or 0) for col in spending_cols)
            
            # Calculate total purchases
            purchase_cols = ['NumDealsPurchases', 'NumWebPurchases', 
                           'NumCatalogPurchases', 'NumStorePurchases']
            total_purchases = sum(int(row.get(col, 0) or 0) for col in purchase_cols)
            
            # Parse enrollment date
            enrollment_date = datetime.now()
            if pd.notna(row.get('Dt_Customer')):
                try:
                    enrollment_date = pd.to_datetime(row['Dt_Customer'], format='%d-%m-%Y')
                except:
                    pass
            
            # Calculate last purchase date from Recency
            recency = int(row.get('Recency', 0) or 0)
            last_purchase_date = enrollment_date + timedelta(days=365 - recency)
            
            # Insert or update user
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO users (id, email, password, name, role, created_at)
                    VALUES (?, ?, ?, ?, 'customer', ?)
                """, (customer_id, email, hashed_password, name, enrollment_date.isoformat()))
                users_imported += 1
            except sqlite3.IntegrityError as e:
                # User might already exist, try update
                cursor.execute("""
                    UPDATE users SET email = ?, name = ?, created_at = ?
                    WHERE id = ?
                """, (email, name, enrollment_date.isoformat(), customer_id))
                users_imported += 1
            
            # Create transactions
            if total_purchases > 0 and total_spending > 0:
                avg_transaction_amount = total_spending / total_purchases
                
                for i in range(total_purchases):
                    # Distribute transactions over time
                    days_since_enrollment = (last_purchase_date - enrollment_date).days
                    transaction_day = int((days_since_enrollment / max(total_purchases, 1)) * i)
                    transaction_date = enrollment_date + timedelta(days=transaction_day)
                    
                    # Add variation to transaction amounts
                    import random
                    variation = 0.8 + random.random() * 0.4  # 80% to 120%
                    transaction_amount = round(avg_transaction_amount * variation, 2)
                    
                    transaction_id = str(uuid.uuid4())
                    
                    cursor.execute("""
                        INSERT INTO transactions 
                        (id, user_id, total_amount, status, payment_method, created_at, updated_at)
                        VALUES (?, ?, ?, 'paid', 'marketing_data', ?, ?)
                    """, (transaction_id, customer_id, transaction_amount, 
                          transaction_date.isoformat(), transaction_date.isoformat()))
                    transactions_imported += 1
                    
            elif total_spending > 0:
                # Create one transaction if there's spending but no purchase count
                transaction_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO transactions 
                    (id, user_id, total_amount, status, payment_method, created_at, updated_at)
                    VALUES (?, ?, ?, 'paid', 'marketing_data', ?, ?)
                """, (transaction_id, customer_id, round(total_spending, 2),
                      last_purchase_date.isoformat(), last_purchase_date.isoformat()))
                transactions_imported += 1
        
        conn.commit()
        print(f"\n✅ Import complete!")
        print(f"   Users imported: {users_imported}")
        print(f"   Transactions imported: {transactions_imported}")
        print(f"   Default password for all users: {default_password}")
        
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

if __name__ == '__main__':
    try:
        import_marketing_data()
    except Exception as e:
        print(f"❌ Import failed: {e}")
        sys.exit(1)

