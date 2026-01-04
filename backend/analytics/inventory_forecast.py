import sqlite3
import json
import os
import sys
from datetime import datetime, timedelta
import pandas as pd

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'checkout.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def forecast_low_stock(days_history=30, days_forecast=7, low_stock_threshold=10):
    """
    Analyzes sales history to predict stockouts.
    Returns a list of items at risk of running out within 'days_forecast' OR already below 'low_stock_threshold'.
    """
    try:
        conn = get_db_connection()
        
        # 1. Get current stock levels
        products_df = pd.read_sql_query("SELECT id, name, stock_quantity, category FROM products WHERE is_active = 1", conn)
        
        # 2. Get sales history (last N days)
        cutoff_date = (datetime.now() - timedelta(days=days_history)).strftime('%Y-%m-%d')
        
        # Join transactions and transaction_items to get quantity sold per product
        # Note: We need to adjust based on the actual schema. 
        # Assuming transaction_items has product_id and quantity, and transactions has created_at
        sales_query = f"""
            SELECT 
                ti.product_id, 
                SUM(ti.quantity) as total_sold,
                COUNT(DISTINCT t.id) as num_transactions
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.created_at >= '{cutoff_date}'
            GROUP BY ti.product_id
        """
        sales_df = pd.read_sql_query(sales_query, conn)
        
        conn.close()
        
        if products_df.empty:
            return []

        # Merge sales data with products
        merged_df = pd.merge(products_df, sales_df, left_on='id', right_on='product_id', how='left')
        
        # Fill NaN sales with 0
        merged_df['total_sold'] = merged_df['total_sold'].fillna(0)
        
        # Calculate daily velocity
        # If an item sold 0, velocity is 0
        merged_df['daily_velocity'] = merged_df['total_sold'] / days_history
        
        alerts = []
        
        for index, row in merged_df.iterrows():
            stock = row['stock_quantity']
            velocity = row['daily_velocity']
            
            # Risk condition 1: Hard threshold
            is_low_stock = stock < low_stock_threshold
            
            # Risk condition 2: Predictive Stockout
            days_to_stockout = float('inf')
            if velocity > 0:
                days_to_stockout = stock / velocity
            
            is_stockout_risk = days_to_stockout < days_forecast
            
            if is_low_stock or is_stockout_risk:
                alert = {
                    'product_id': row['id'],
                    'product_name': row['name'],
                    'current_stock': int(stock),
                    'daily_velocity': round(velocity, 2),
                    'days_until_stockout': round(days_to_stockout, 1) if days_to_stockout != float('inf') else 'N/A',
                    'reason': []
                }
                
                if is_low_stock:
                    alert['reason'].append('Low Stock Level')
                if is_stockout_risk:
                    alert['reason'].append(f'Predicted stockout in {round(days_to_stockout, 1)} days')
                
                alerts.append(alert)
        
        # Sort by days_until_stockout (urgent first) then stock level
        # Handle 'N/A' for sorting by treating it as infinity
        alerts.sort(key=lambda x: (
            x['days_until_stockout'] if isinstance(x['days_until_stockout'], (int, float)) else float('inf'), 
            x['current_stock']
        ))
        
        return alerts

    except Exception as e:
        return {'error': str(e)}

if __name__ == "__main__":
    result = forecast_low_stock()
    print(json.dumps(result, indent=2))
