import sqlite3
import json
import os
import sys
import pandas as pd
from collections import Counter, defaultdict
import argparse

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'database', 'checkout.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_recommendations(user_id=None, limit=5, current_items=None):
    """
    Generates product recommendations.
    1. If user_id is provided, look at their recent purchases.
    2. Find items frequently bought together with their recent purchases (Co-occurrence).
    3. If no history or not enough recommendations, fill with top selling items.
    """
    if current_items:
        current_items = [str(x).strip() for x in current_items] # Strip whitespace just in case

    try:
        conn = get_db_connection()
        
        # 1. Get all transactions for co-occurrence matrix
        # We need transaction_id and product_id
        query = """
            SELECT t.id as transaction_id, ti.product_id
            FROM transactions t
            JOIN transaction_items ti ON t.id = ti.transaction_id
        """
        all_transactions_df = pd.read_sql_query(query, conn)
        
        # Build Co-occurrence Matrix
        # Map product_id -> { related_product_id: count }
        co_occurrence = defaultdict(Counter)
        
        # Group by transaction
        grouped = all_transactions_df.groupby('transaction_id')['product_id'].apply(list)
        
        for products in grouped:
            # For each pair in the transaction
            for i in range(len(products)):
                for j in range(len(products)):
                    if i != j:
                        p1, p2 = products[i], products[j]
                        co_occurrence[p1][p2] += 1
        
        # 2. Get User's recent history (if user_id provided)
        user_history_ids = []
        if user_id:
            user_history_query = """
                SELECT ti.product_id
                FROM transactions t
                JOIN transaction_items ti ON t.id = ti.transaction_id
                WHERE t.user_id = ?
                ORDER BY t.created_at DESC
                LIMIT 10
            """
            user_history_df = pd.read_sql_query(user_history_query, conn, params=(user_id,))
            user_history_ids = user_history_df['product_id'].tolist()
            
        # 3. Generate Candidates based on history
        candidates = Counter()
        
        # 3a. Generate Candidates based on current cart (High Priority)
        # We give these more weight because they are immediate context
        if current_items:
            for product_id in current_items:
                # Iterate over keys and casting to string to match current_items
                # This is a bit inefficient but safe given unknown types
                
                # Check directly if type matches, otherwise try to find match
                found_match = False
                if product_id in co_occurrence:
                     for related_id, count in co_occurrence[product_id].items():
                        candidates[str(related_id)] += count * 2
                     found_match = True
                else:
                    # Try casting keys to string to find match
                    for key in co_occurrence:
                        if str(key) == product_id:
                             for related_id, count in co_occurrence[key].items():
                                 candidates[str(related_id)] += count * 2
                             found_match = True
                             break

        # 3b. Generate Candidates based on history
        for product_id in user_history_ids:
            # Add related items weighted by co-occurrence count
            if product_id in co_occurrence:
                for related_id, count in co_occurrence[product_id].items():
                    # Don't recommend what they just bought (optional, but good for discovery)
                    # But if it's consumable, maybe they want more? Let's keep it but prioritize others.
                    candidates[str(related_id)] += count
        
        # 4. Get Top Sellers (Global Popularity) as fallback/filler
        top_sellers_query = """
            SELECT product_id, COUNT(*) as count
            FROM transaction_items
            GROUP BY product_id
            ORDER BY count DESC
            LIMIT 20
        """
        top_sellers_df = pd.read_sql_query(top_sellers_query, conn)
        top_sellers_ids = top_sellers_df['product_id'].tolist()
        
        # 5. Finalize List
        # Start with candidates from co-occurrence
        # Sort by score
        recommended_ids = [pid for pid, score in candidates.most_common()]
        
        # Filter out items already in current cart
        if current_items:
             recommended_ids = [pid for pid in recommended_ids if str(pid) not in current_items]
        
        # Filter out items already in user's recent history? 
        # For a supermarket, re-buying is common. Let's keep them but maybe penalize?
        # For simplicity, we keep them.
        
        # Fill with top sellers if needed
        for pid in top_sellers_ids:
            # Explicit check
            seller_id_str = str(pid)
            if seller_id_str in recommended_ids:
                continue
            if current_items and seller_id_str in current_items:
                continue
                
            recommended_ids.append(pid)
                
        # Take top N
        final_ids = recommended_ids[:limit]
        
        if not final_ids:
            return []

        # 6. Fetch Product Details
        placeholders = ','.join(['?'] * len(final_ids))
        details_query = f"""
            SELECT id, name, price, barcode, image_url, description
            FROM products
            WHERE id IN ({placeholders})
        """
        # We need to preserve order, so we'll fetch then re-sort
        products_df = pd.read_sql_query(details_query, conn, params=final_ids)
        conn.close()
        
        if products_df.empty:
            return []
            
        # Convert to dictionary for easy lookup
        products_map = products_df.set_index('id').to_dict('index')
        
        # Build final result preserving recommendation order
        results = []
        for pid in final_ids:
            if pid in products_map:
                item = products_map[pid]
                item['id'] = pid
                # Add a "reason" tag
                if candidates[pid] > 0:
                     if current_items and any(pid in co_occurrence.get(c_item, {}) for c_item in current_items):
                         item['recommendation_reason'] = 'Goes well with your cart'
                     else:
                         item['recommendation_reason'] = 'Frequently bought with your items'
                else:
                     item['recommendation_reason'] = 'Popular item'
                results.append(item)
                
        return results

    except Exception as e:
        return {'error': str(e)}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Generate product recommendations')
    parser.add_argument('--user_id', type=str, help='User ID for personalized recommendations')
    parser.add_argument('--limit', type=int, default=5, help='Number of recommendations to return')
    parser.add_argument('--current_items', type=str, help='Comma-separated list of product IDs in current cart')
    
    args = parser.parse_args()
    
    current_items = []
    if args.current_items:
        current_items = args.current_items.split(',')
        
    result = get_recommendations(user_id=args.user_id, limit=args.limit, current_items=current_items)
    print(json.dumps(result, indent=2))
