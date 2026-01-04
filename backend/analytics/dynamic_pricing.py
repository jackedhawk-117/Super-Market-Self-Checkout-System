import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server environments
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import make_column_transformer
from sklearn.pipeline import make_pipeline
from sklearn.metrics import mean_squared_error, r2_score
import os
import sys
import json
import argparse

import sqlite3

def load_data_from_db(db_path):
    """
    Load transactions, items, and products from SQLite and merge them
    into a format compatible with the existing analytics logic.
    """
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database file not found: {db_path}")

    conn = sqlite3.connect(db_path)
    
    # Query to join relevant tables
    # We need: Transaction_ID, Customer_ID, Product_ID, Product_Name, Date, Unit_Price, Category
    # Note: Using 'id' as IDs. 
    # transactions.id -> Transaction_ID
    # transaction_items.product_id -> Product_ID
    # products.name -> Product_Name
    # transactions.created_at -> Date
    # transaction_items.unit_price -> Unit_Price
    # products.category -> Category
    # users.id (transaction.user_id) -> Customer_ID
    
    query = """
        SELECT 
            t.id as Transaction_ID,
            t.user_id as Customer_ID,
            ti.product_id as Product_ID,
            p.name as Product_Name,
            t.created_at as Date,
            ti.unit_price as Unit_Price,
            p.category as Category
        FROM transaction_items ti
        JOIN transactions t ON ti.transaction_id = t.id
        JOIN products p ON ti.product_id = p.id
    """
    
    try:
        df = pd.read_sql_query(query, conn)
        return df
    finally:
        conn.close()

def main():
    # =========================
    # Parse Command Line Arguments
    # =========================
    parser = argparse.ArgumentParser(description='Dynamic Pricing Prediction Model')
    parser.add_argument('--csv-path', default='so.csv', 
                       help='Path to the CSV file (default: so.csv)')
    parser.add_argument('--db-path', default='../database/checkout.db',
                       help='Path to the SQLite database (default: ../database/checkout.db)')
    parser.add_argument('--use-db', action='store_true',
                       help='Force use of database instead of CSV')
    args = parser.parse_args()
    
    # Logic to decide source:
    # 1. If --use-db is specied, try DB.
    # 2. If DB exists at default/specified path and no CSV exists, try DB.
    # 3. Default to CSV for backward compatibility unless specified.
    
    # However, user asked "can the machine learning programs in this use the applications database too ?"
    # So we should prioritize DB if available and not explicitly told otherwise, or just check both.
    # Let's make it robust:
    
    df = None
    source_name = "Unknown"

    if args.use_db:
         print(f"Attempting to load data from database: {args.db_path}...", file=sys.stderr)
         try:
             df = load_data_from_db(args.db_path)
             source_name = "Database"
         except Exception as e:
             print(f"Failed to load from DB: {e}", file=sys.stderr)
             sys.exit(1)
    elif os.path.exists(args.csv_path):
        print(f"Loading data from CSV: {args.csv_path}...", file=sys.stderr)
        df = pd.read_csv(args.csv_path)
        source_name = "CSV"
    elif os.path.exists(args.db_path):
        print(f"CSV not found. Attempting to load data from database: {args.db_path}...", file=sys.stderr)
        try:
            df = load_data_from_db(args.db_path)
            source_name = "Database"
        except Exception as e:
             print(f"Failed to load from DB: {e}", file=sys.stderr)
             sys.exit(1)
    else:
        # Fallback error
        error_result = {
            'success': False,
            'error': f'No data source found. CSV: {args.csv_path}, DB: {args.db_path}',
            'error_type': 'FileNotFoundError'
        }
        print(json.dumps(error_result, indent=2), file=sys.stderr)
        sys.exit(1)

    try:
        # =========================
        # Preprocess Data
        # =========================
        
        # Clean column names to remove leading/trailing whitespace
        df.columns = df.columns.str.strip()
        
        # Set the target column
        target_col = 'Unit_Price'
        
        # Check if target column exists
        if target_col not in df.columns:
            error_result = {
                'success': False,
                'error': f'Target column "{target_col}" not found in {source_name} data',
                'error_type': 'ValueError',
                'available_columns': list(df.columns)
            }
            print(json.dumps(error_result, indent=2), file=sys.stderr)
            sys.exit(1)
        
        # Drop rows where target is missing and handle date columns
        initial_rows = len(df)
        df = df.dropna(subset=[target_col])
        dropped_rows = initial_rows - len(df)
        
        if 'Date' in df.columns:
            df['Date'] = pd.to_datetime(df['Date'], errors='coerce')
            df["Date_year"] = df['Date'].dt.year
            df["Date_month"] = df['Date'].dt.month
            df["Date_day"] = df['Date'].dt.day

        
        # =========================
        # Feature Preparation
        # =========================
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # IMPORTANT: Exclude high-cardinality ID columns to prevent MemoryError
        id_cols = ['Transaction_ID', 'Customer_ID', 'Product_ID', 'Product_Name', 'Date']
        X = X.drop(columns=[col for col in id_cols if col in X.columns])
        
        # Check if we have any features left
        if X.empty:
            error_result = {
                'success': False,
                'error': 'No features available after removing ID columns',
                'error_type': 'ValueError'
            }
            print(json.dumps(error_result, indent=2), file=sys.stderr)
            sys.exit(1)
        
        # Automatically identify remaining numerical and categorical columns
        cat_cols = X.select_dtypes(include=['object']).columns.tolist()
        num_cols = X.select_dtypes(exclude=['object']).columns.tolist()
        
        # Create a robust preprocessing pipeline
        transformers = []
        if num_cols:
            transformers.append((StandardScaler(), num_cols))
        if cat_cols:
            transformers.append((OneHotEncoder(handle_unknown='ignore', drop='first'), cat_cols))
        
        if not transformers:
            error_result = {
                'success': False,
                'error': 'No valid features found for preprocessing',
                'error_type': 'ValueError'
            }
            print(json.dumps(error_result, indent=2), file=sys.stderr)
            sys.exit(1)
        
        preprocessor = make_column_transformer(*transformers)
        
        # =========================
        # Train-Test Split & Model
        # =========================
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # Create the full model pipeline
        model = make_pipeline(preprocessor, LinearRegression())
        
        # Train the model
        model.fit(X_train, y_train)
        
        # =========================
        # Predictions & Metrics
        # =========================
        y_pred = model.predict(X_test)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)
        
        # Calculate additional metrics
        mae = np.mean(np.abs(y_test - y_pred))
        mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100 if y_test.min() > 0 else None
        
        # =========================
        # Visualizations & Saving
        # =========================
        # Get the directory of the CSV file for saving outputs
        if source_name == 'Database':
             output_dir = os.path.dirname(os.path.abspath(args.db_path)) or os.getcwd()
        else:
             output_dir = os.path.dirname(os.path.abspath(args.csv_path)) or os.getcwd()
        
        # Save actual vs predicted plot
        plt.figure(figsize=(8, 8))
        sns.scatterplot(x=y_test, y=y_pred, alpha=0.5)
        plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], color='red', linestyle='--')
        plt.xlabel("Actual Price")
        plt.ylabel("Predicted Price")
        plt.title("Actual vs. Predicted Prices")
        plt.tight_layout()
        plot1_path = os.path.join(output_dir, "actual_vs_predicted.png")
        plt.savefig(plot1_path)
        plt.close()
        
        # Save residual plot
        residuals = y_test - y_pred
        plt.figure(figsize=(10, 6))
        sns.scatterplot(x=y_pred, y=residuals, alpha=0.5)
        plt.axhline(y=0, color='red', linestyle='--')
        plt.xlabel("Predicted Price")
        plt.ylabel("Residuals")
        plt.title("Residual Plot")
        plt.tight_layout()
        plot2_path = os.path.join(output_dir, "residual_plot.png")
        plt.savefig(plot2_path)
        plt.close()
        
        # =========================
        # Save Predictions to CSV
        # =========================
        df['Predicted_Price'] = model.predict(X)
        output_file = os.path.join(output_dir, "dynamic_pricing_results.csv")
        df.to_csv(output_file, index=False)
        
        # =========================
        # Save Model Metrics for API Access
        # =========================
        metrics_file = os.path.join(output_dir, "model_metrics.json")
        metrics_data = {
             'rmse': float(rmse),
             'r2_score': float(r2),
             'mae': float(mae),
             'mape': float(mape) if mape is not None else None,
             'last_updated': pd.Timestamp.now().isoformat()
        }

        # Calculate Category-based Multipliers for Fallback
        # We calculate the average ratio of Predicted_Price / Unit_Price for each category
        df['Price_Ratio'] = df['Predicted_Price'] / df['Unit_Price']
        category_multipliers = df.groupby('Category')['Price_Ratio'].mean().to_dict()
        
        # Add to metrics data
        metrics_data['category_multipliers'] = category_multipliers

        with open(metrics_file, 'w') as f:
            json.dump(metrics_data, f, indent=2)
        
        # =========================
        # Prepare Results JSON
        # =========================
        results = {
            'success': True,
            'data': {
                'model_performance': {
                    'rmse': float(rmse),
                    'r2_score': float(r2),
                    'mae': float(mae),
                    'mape': float(mape) if mape is not None else None
                },
                'dataset_info': {
                    'total_rows': int(len(df)),
                    'dropped_rows': int(dropped_rows),
                    'training_samples': int(len(X_train)),
                    'test_samples': int(len(X_test))
                },
                'features': {
                    'numerical_features': num_cols,
                    'categorical_features': cat_cols,
                    'total_features': len(num_cols) + len(cat_cols)
                },
                'output_files': {
                    'predictions_csv': output_file,
                    'actual_vs_predicted_plot': plot1_path,
                    'residual_plot': plot2_path
                },
                'sample_predictions': {
                    'actual_mean': float(y_test.mean()),
                    'predicted_mean': float(y_pred.mean()),
                    'actual_std': float(y_test.std()),
                    'predicted_std': float(y_pred.std())
                }
            }
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

