#!/usr/bin/env python3
"""
Customer Segmentation Analysis
Performs K-Means clustering on customer purchase data
"""

import sqlite3
import json
import sys
import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def get_db_path():
    """Get database path from environment or use default"""
    db_path = os.getenv('DATABASE_PATH', './database/checkout.db')
    # If relative path, make it relative to backend directory
    if not os.path.isabs(db_path):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(backend_dir, db_path)
    return db_path

def load_customer_data():
    """Load customer purchase data from SQLite database"""
    db_path = get_db_path()
    
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found at: {db_path}")
    
    conn = sqlite3.connect(db_path)
    
    # Query to get total purchase amount per customer
    query = """
        SELECT 
            u.id as user_id,
            u.name,
            u.email,
            COALESCE(SUM(t.total_amount), 0) as total_purchase,
            COUNT(t.id) as transaction_count,
            COALESCE(AVG(t.total_amount), 0) as avg_transaction_amount,
            MAX(t.created_at) as last_purchase_date
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'paid'
        GROUP BY u.id, u.name, u.email
        HAVING total_purchase > 0
    """
    
    df = pd.read_sql_query(query, conn)
    conn.close()
    
    if df.empty:
        raise ValueError("No customer purchase data found")
    
    return df

def perform_segmentation(df, n_clusters=3):
    """Perform K-Means clustering on customer purchase data"""
    
    # Prepare features for clustering
    # Using total_purchase and transaction_count
    X = df[['total_purchase', 'transaction_count']].values
    
    # Scale the features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Perform K-Means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df['cluster'] = kmeans.fit_predict(X_scaled)
    
    # Calculate cluster statistics
    cluster_summary = df.groupby('cluster').agg({
        'total_purchase': ['mean', 'min', 'max', 'count'],
        'transaction_count': ['mean', 'min', 'max'],
        'avg_transaction_amount': 'mean'
    }).round(2)
    
    # Create cluster labels
    cluster_labels = {}
    for cluster_id in sorted(df['cluster'].unique()):
        avg_purchase = df[df['cluster'] == cluster_id]['total_purchase'].mean()
        if avg_purchase < df['total_purchase'].quantile(0.33):
            cluster_labels[cluster_id] = 'Low Value'
        elif avg_purchase < df['total_purchase'].quantile(0.66):
            cluster_labels[cluster_id] = 'Medium Value'
        else:
            cluster_labels[cluster_id] = 'High Value'
    
    df['cluster_label'] = df['cluster'].map(cluster_labels)
    
    return df, cluster_summary, kmeans, scaler

def calculate_elbow_method(df, max_k=10):
    """Calculate WCSS for different k values (Elbow Method)"""
    X = df[['total_purchase', 'transaction_count']].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    wcss = []
    k_range = range(1, min(max_k + 1, len(df) + 1))
    
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        kmeans.fit(X_scaled)
        wcss.append(kmeans.inertia_)
    
    return list(k_range), wcss

def main():
    """Main function to run segmentation analysis"""
    try:
        # Load data
        df = load_customer_data()
        
        # Determine optimal number of clusters (use elbow method if enough data)
        if len(df) >= 3:
            k_values, wcss = calculate_elbow_method(df, max_k=min(10, len(df)))
            # Simple heuristic: use 3 clusters by default, or adjust based on data size
            n_clusters = min(3, len(df))
        else:
            n_clusters = len(df)
        
        # Perform segmentation
        df_segmented, cluster_summary, kmeans, scaler = perform_segmentation(df, n_clusters)
        
        # Prepare results
        results = {
            'success': True,
            'total_customers': len(df_segmented),
            'n_clusters': n_clusters,
            'clusters': {}
        }
        
        # Add cluster details
        for cluster_id in sorted(df_segmented['cluster'].unique()):
            cluster_data = df_segmented[df_segmented['cluster'] == cluster_id]
            results['clusters'][int(cluster_id)] = {
                'label': cluster_data['cluster_label'].iloc[0],
                'customer_count': len(cluster_data),
                'avg_total_purchase': float(cluster_data['total_purchase'].mean()),
                'min_purchase': float(cluster_data['total_purchase'].min()),
                'max_purchase': float(cluster_data['total_purchase'].max()),
                'avg_transaction_count': float(cluster_data['transaction_count'].mean()),
                'avg_transaction_amount': float(cluster_data['avg_transaction_amount'].mean()),
                'customers': cluster_data[['user_id', 'name', 'email', 'total_purchase', 'transaction_count']].to_dict('records')
            }
        
        # Add elbow method data if available
        if len(df) >= 3:
            results['elbow_method'] = {
                'k_values': k_values,
                'wcss': [float(x) for x in wcss]
            }
        
        # Add summary statistics
        results['summary'] = {
            'overall_avg_purchase': float(df_segmented['total_purchase'].mean()),
            'overall_total_revenue': float(df_segmented['total_purchase'].sum()),
            'overall_avg_transactions': float(df_segmented['transaction_count'].mean())
        }
        
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()

