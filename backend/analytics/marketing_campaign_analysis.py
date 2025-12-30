#!/usr/bin/env python3
"""
Marketing Campaign Data Analysis
Performs customer segmentation and campaign response analysis on marketing campaign CSV data
"""

import json
import sys
import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

def load_marketing_data(csv_path):
    """Load marketing campaign data from CSV file"""
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV file not found at: {csv_path}")
    
    df = pd.read_csv(csv_path)
    
    # Basic data cleaning
    # Handle missing income values
    if 'Income' in df.columns:
        df['Income'] = pd.to_numeric(df['Income'], errors='coerce')
        df['Income'] = df['Income'].fillna(df['Income'].median())
    
    # Convert date column
    if 'Dt_Customer' in df.columns:
        df['Dt_Customer'] = pd.to_datetime(df['Dt_Customer'], format='%d-%m-%Y', errors='coerce')
    
    return df

def prepare_features(df):
    """Prepare features for clustering"""
    # Calculate total spending
    spending_cols = [col for col in df.columns if col.startswith('Mnt')]
    if spending_cols:
        df['Total_Spending'] = df[spending_cols].sum(axis=1)
    
    # Calculate total purchases across channels
    purchase_cols = [col for col in df.columns if col.startswith('Num') and 'Purchase' in col]
    if purchase_cols:
        df['Total_Purchases'] = df[purchase_cols].sum(axis=1)
    
    # Calculate campaign acceptance rate
    campaign_cols = [col for col in df.columns if col.startswith('AcceptedCmp')]
    if campaign_cols:
        df['Campaigns_Accepted'] = df[campaign_cols].sum(axis=1)
    
    # Calculate customer age (from Year_Birth)
    if 'Year_Birth' in df.columns:
        current_year = pd.Timestamp.now().year
        df['Age'] = current_year - df['Year_Birth']
    
    # Calculate customer tenure (from Dt_Customer)
    if 'Dt_Customer' in df.columns:
        today = pd.Timestamp.now()
        df['Tenure_Days'] = (today - df['Dt_Customer']).dt.days
        df['Tenure_Days'] = df['Tenure_Days'].fillna(0)
    
    return df

def perform_rfm_segmentation(df):
    """Perform RFM (Recency, Frequency, Monetary) segmentation"""
    rfm_df = pd.DataFrame()
    
    # Recency (how recently they purchased - lower is better)
    if 'Recency' in df.columns:
        rfm_df['Recency'] = df['Recency']
    else:
        rfm_df['Recency'] = 0  # Default if not available
    
    # Frequency (total purchases)
    if 'Total_Purchases' in df.columns:
        rfm_df['Frequency'] = df['Total_Purchases']
    else:
        rfm_df['Frequency'] = 0
    
    # Monetary (total spending)
    if 'Total_Spending' in df.columns:
        rfm_df['Monetary'] = df['Total_Spending']
    else:
        rfm_df['Monetary'] = 0
    
    # Calculate RFM scores (1-5 scale)
    # For Recency: lower is better, so reverse the scores
    try:
        rfm_df['R_Score'] = pd.qcut(rfm_df['Recency'].rank(method='first'), q=5, labels=[5,4,3,2,1], duplicates='drop')
    except ValueError:
        # Fallback if not enough unique values
        rfm_df['R_Score'] = pd.cut(rfm_df['Recency'], bins=5, labels=[5,4,3,2,1], duplicates='drop', include_lowest=True)
    
    try:
        rfm_df['F_Score'] = pd.qcut(rfm_df['Frequency'].rank(method='first'), q=5, labels=[1,2,3,4,5], duplicates='drop')
    except ValueError:
        rfm_df['F_Score'] = pd.cut(rfm_df['Frequency'], bins=5, labels=[1,2,3,4,5], duplicates='drop', include_lowest=True)
    
    try:
        rfm_df['M_Score'] = pd.qcut(rfm_df['Monetary'].rank(method='first'), q=5, labels=[1,2,3,4,5], duplicates='drop')
    except ValueError:
        rfm_df['M_Score'] = pd.cut(rfm_df['Monetary'], bins=5, labels=[1,2,3,4,5], duplicates='drop', include_lowest=True)
    
    # Convert to numeric
    rfm_df['R_Score'] = pd.to_numeric(rfm_df['R_Score'])
    rfm_df['F_Score'] = pd.to_numeric(rfm_df['F_Score'])
    rfm_df['M_Score'] = pd.to_numeric(rfm_df['M_Score'])
    
    # Calculate RFM score (combined)
    rfm_df['RFM_Score'] = rfm_df['R_Score'] + rfm_df['F_Score'] + rfm_df['M_Score']
    
    # Segment customers based on RFM score
    def assign_rfm_segment(score):
        if score >= 13:
            return 'Champions'
        elif score >= 10:
            return 'Loyal Customers'
        elif score >= 8:
            return 'Potential Loyalists'
        elif score >= 6:
            return 'At Risk'
        else:
            return 'Lost'
    
    rfm_df['RFM_Segment'] = rfm_df['RFM_Score'].apply(assign_rfm_segment)
    
    return rfm_df

def perform_kmeans_segmentation(df, n_clusters=4):
    """Perform K-Means clustering on customer data"""
    
    # Select features for clustering
    feature_cols = []
    
    # Add spending features
    if 'Total_Spending' in df.columns:
        feature_cols.append('Total_Spending')
    
    # Add purchase frequency
    if 'Total_Purchases' in df.columns:
        feature_cols.append('Total_Purchases')
    
    # Add recency
    if 'Recency' in df.columns:
        feature_cols.append('Recency')
    
    # Add income if available
    if 'Income' in df.columns:
        feature_cols.append('Income')
    
    # Add age if available
    if 'Age' in df.columns:
        feature_cols.append('Age')
    
    if len(feature_cols) < 2:
        raise ValueError("Not enough features for clustering")
    
    # Prepare feature matrix
    X = df[feature_cols].copy()
    
    # Handle any remaining NaN values
    X = X.fillna(X.median())
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Perform K-Means clustering
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df['Cluster'] = kmeans.fit_predict(X_scaled)
    
    # Calculate cluster statistics (simplified to avoid pandas issues)
    cluster_summary = pd.DataFrame()
    try:
        if 'Total_Spending' in df.columns:
            cluster_summary['Total_Spending_mean'] = df.groupby('Cluster')['Total_Spending'].mean()
        if 'Total_Purchases' in df.columns:
            cluster_summary['Total_Purchases_mean'] = df.groupby('Cluster')['Total_Purchases'].mean()
        if 'Recency' in df.columns:
            cluster_summary['Recency_mean'] = df.groupby('Cluster')['Recency'].mean()
        cluster_summary['Count'] = df.groupby('Cluster').size()
        cluster_summary = cluster_summary.round(2)
    except Exception:
        # If aggregation fails, create empty summary
        cluster_summary = pd.DataFrame()
    
    # Assign cluster labels based on spending
    if 'Total_Spending' in df.columns:
        cluster_labels = {}
        spending_means = df.groupby('Cluster')['Total_Spending'].mean().sort_values()
        
        labels = ['Low Value', 'Medium-Low Value', 'Medium-High Value', 'High Value']
        for i, (cluster_id, _) in enumerate(spending_means.items()):
            cluster_labels[int(cluster_id)] = labels[min(i, len(labels)-1)]
        
        df['Cluster_Label'] = df['Cluster'].map(cluster_labels)
    
    return df, cluster_summary, kmeans, scaler, feature_cols

def analyze_campaign_response(df):
    """Analyze campaign response rates"""
    results = {}
    
    # Overall response rate
    if 'Response' in df.columns:
        results['overall_response_rate'] = float(df['Response'].mean())
        results['total_responses'] = int(df['Response'].sum())
        results['total_customers'] = len(df)
    
    # Response by segment (if clusters exist)
    if 'Cluster' in df.columns:
        cluster_response = df.groupby('Cluster')['Response'].agg(['mean', 'sum', 'count']) if 'Response' in df.columns else None
        if cluster_response is not None:
            results['response_by_cluster'] = cluster_response.to_dict('index')
    
    # Campaign acceptance analysis
    campaign_cols = [col for col in df.columns if col.startswith('AcceptedCmp')]
    if campaign_cols:
        campaign_summary = {}
        for col in campaign_cols:
            campaign_summary[col] = {
                'accepted': int(df[col].sum()),
                'total': len(df),
                'acceptance_rate': float(df[col].mean())
            }
        results['campaign_acceptance'] = campaign_summary
    
    return results

def generate_insights(df, rfm_df=None):
    """Generate business insights from the data"""
    insights = []
    
    # Total customers
    insights.append(f"Total customers analyzed: {len(df)}")
    
    # Spending insights
    if 'Total_Spending' in df.columns:
        avg_spending = df['Total_Spending'].mean()
        total_revenue = df['Total_Spending'].sum()
        insights.append(f"Average customer spending: ${avg_spending:,.2f}")
        insights.append(f"Total revenue: ${total_revenue:,.2f}")
    
    # Purchase behavior
    if 'Total_Purchases' in df.columns:
        avg_purchases = df['Total_Purchases'].mean()
        insights.append(f"Average purchases per customer: {avg_purchases:.2f}")
    
    # Campaign response
    if 'Response' in df.columns:
        response_rate = df['Response'].mean() * 100
        insights.append(f"Campaign response rate: {response_rate:.2f}%")
    
    # RFM insights
    if rfm_df is not None and 'RFM_Segment' in rfm_df.columns:
        segment_counts = rfm_df['RFM_Segment'].value_counts()
        insights.append("\nRFM Segmentation:")
        for segment, count in segment_counts.items():
            pct = (count / len(rfm_df)) * 100
            insights.append(f"  {segment}: {count} customers ({pct:.1f}%)")
    
    # Cluster insights
    if 'Cluster_Label' in df.columns:
        cluster_counts = df['Cluster_Label'].value_counts()
        insights.append("\nK-Means Clustering:")
        for label, count in cluster_counts.items():
            pct = (count / len(df)) * 100
            insights.append(f"  {label}: {count} customers ({pct:.1f}%)")
    
    return insights

def main():
    """Main function to run marketing campaign analysis"""
    try:
        # Get CSV file path from command line argument or use default
        if len(sys.argv) > 1:
            csv_path = sys.argv[1]
        else:
            csv_path = '/home/jackedhawk117/Downloads/marketing_campaign.csv'
        
        # Load data
        print(f"Loading data from {csv_path}...", file=sys.stderr)
        df = load_marketing_data(csv_path)
        
        # Prepare features
        df = prepare_features(df)
        
        # Perform RFM segmentation
        print("Performing RFM segmentation...", file=sys.stderr)
        rfm_df = perform_rfm_segmentation(df)
        df = pd.concat([df.reset_index(drop=True), rfm_df.reset_index(drop=True)], axis=1)
        
        # Determine optimal number of clusters
        n_clusters = min(4, max(2, len(df) // 100))  # Adaptive based on data size
        
        # Perform K-Means clustering
        print(f"Performing K-Means clustering with {n_clusters} clusters...", file=sys.stderr)
        df_segmented, cluster_summary, kmeans, scaler, feature_cols = perform_kmeans_segmentation(df, n_clusters)
        
        # Analyze campaign response
        print("Analyzing campaign responses...", file=sys.stderr)
        campaign_analysis = analyze_campaign_response(df_segmented)
        
        # Generate insights
        insights = generate_insights(df_segmented, rfm_df)
        
        # Prepare results
        results = {
            'success': True,
            'total_customers': len(df_segmented),
            'n_clusters': n_clusters,
            'clusters': {},
            'rfm_segments': {},
            'campaign_analysis': campaign_analysis,
            'insights': insights
        }
        
        # Add cluster details
        for cluster_id in sorted(df_segmented['Cluster'].unique()):
            cluster_data = df_segmented[df_segmented['Cluster'] == cluster_id]
            cluster_info = {
                'label': cluster_data['Cluster_Label'].iloc[0] if 'Cluster_Label' in cluster_data.columns else f'Cluster {cluster_id}',
                'customer_count': len(cluster_data),
            }
            
            if 'Total_Spending' in cluster_data.columns:
                cluster_info['avg_spending'] = float(cluster_data['Total_Spending'].mean())
                cluster_info['min_spending'] = float(cluster_data['Total_Spending'].min())
                cluster_info['max_spending'] = float(cluster_data['Total_Spending'].max())
            
            if 'Total_Purchases' in cluster_data.columns:
                cluster_info['avg_purchases'] = float(cluster_data['Total_Purchases'].mean())
            
            if 'Response' in cluster_data.columns:
                cluster_info['response_rate'] = float(cluster_data['Response'].mean())
            
            results['clusters'][int(cluster_id)] = cluster_info
        
        # Add RFM segment details
        if 'RFM_Segment' in df_segmented.columns:
            for segment in df_segmented['RFM_Segment'].unique():
                segment_data = df_segmented[df_segmented['RFM_Segment'] == segment]
                results['rfm_segments'][segment] = {
                    'customer_count': len(segment_data),
                    'avg_spending': float(segment_data['Total_Spending'].mean()) if 'Total_Spending' in segment_data.columns else 0,
                    'avg_purchases': float(segment_data['Total_Purchases'].mean()) if 'Total_Purchases' in segment_data.columns else 0,
                    'response_rate': float(segment_data['Response'].mean()) if 'Response' in segment_data.columns else 0
                }
        
        # Output results as JSON
        print(json.dumps(results, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()

