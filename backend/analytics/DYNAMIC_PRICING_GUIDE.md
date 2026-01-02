# Dynamic Pricing System - How It Works

## Overview

The Dynamic Pricing system uses **Machine Learning (Linear Regression)** to predict product unit prices based on various features from your transaction data. Here's how the entire system works from end to end.

## System Architecture

```
┌─────────────────┐
│  Frontend/API   │
│   Request       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Node.js API    │
│  /api/analytics │
│  /dynamic-pricing│
└────────┬────────┘
         │
         │ Executes Python script
         ▼
┌─────────────────┐
│  Python Script  │
│ dynamic_pricing.py│
└────────┬────────┘
         │
         ├─► Loads CSV data
         ├─► Preprocesses features
         ├─► Trains ML model
         ├─► Generates predictions
         ├─► Creates visualizations
         └─► Returns JSON results
```

## Step-by-Step Flow

### 1. **API Request** (Frontend/Client)

When you call the API endpoint:

```dart
// From Flutter app
final result = await ApiService.getDynamicPricing(
  csvPath: '/path/to/so.csv'  // Optional
);
```

Or directly via HTTP:
```bash
GET /api/analytics/dynamic-pricing?path=/path/to/so.csv
Authorization: Bearer <admin_token>
```

### 2. **Node.js Backend Processing** (`backend/routes/analytics.js`)

The Node.js server:
1. **Authenticates** the request (checks for admin token)
2. **Validates** the CSV file path (or uses default: `backend/analytics/so.csv`)
3. **Checks** if the file exists
4. **Executes** the Python script as a subprocess:
   ```javascript
   exec(`python3 "${scriptPath}" "${csvPath}"`, ...)
   ```
5. **Captures** the JSON output from Python
6. **Returns** the results to the client

### 3. **Python Script Processing** (`backend/analytics/dynamic_pricing.py`)

The Python script follows these steps:

#### Step 3.1: Load Data
```python
df = pd.read_csv(file_path)  # Load CSV file
df.columns = df.columns.str.strip()  # Clean column names
```

**What it expects:**
- CSV file with a `Unit_Price` column (the target we want to predict)
- Other columns that can be used as features (e.g., Quantity, Category, Date, etc.)

#### Step 3.2: Data Cleaning
```python
# Remove rows with missing Unit_Price
df = df.dropna(subset=['Unit_Price'])

# Extract date features if Date column exists
if 'Date' in df.columns:
    df['Date_year'] = df['Date'].dt.year
    df['Date_month'] = df['Date'].dt.month
    df['Date_day'] = df['Date'].dt.day
```

**Why:** 
- Missing target values can't be used for training
- Date features (year, month, day) are more useful than raw dates

#### Step 3.3: Feature Preparation
```python
# Separate target from features
X = df.drop(columns=['Unit_Price'])  # Features
y = df['Unit_Price']                  # Target

# Remove ID columns (they don't help predict price)
id_cols = ['Transaction_ID', 'Customer_ID', 'Product_ID', 'Product_Name', 'Date']
X = X.drop(columns=[col for col in id_cols if col in X.columns])
```

**Why remove ID columns?**
- IDs are unique identifiers, not predictive features
- Including them would cause memory issues (too many unique values)
- They don't help the model learn price patterns

#### Step 3.4: Feature Type Detection
```python
# Automatically detect column types
cat_cols = X.select_dtypes(include=['object']).columns  # Text/categorical
num_cols = X.select_dtypes(exclude=['object']).columns  # Numbers
```

**Example:**
- **Numerical:** `Quantity`, `Discount`, `Date_year`, `Date_month`
- **Categorical:** `Category`, `Payment_Method`, `Store_Location`

#### Step 3.5: Preprocessing Pipeline
```python
# Create preprocessing steps
transformers = []
if num_cols:
    transformers.append((StandardScaler(), num_cols))  # Scale numbers
if cat_cols:
    transformers.append((OneHotEncoder(...), cat_cols))  # Encode categories

preprocessor = make_column_transformer(*transformers)
```

**What this does:**

1. **StandardScaler** (for numerical features):
   - Converts numbers to a standard scale (mean=0, std=1)
   - Example: `[100, 200, 300]` → `[-1.22, 0, 1.22]`
   - **Why:** Prevents large numbers from dominating the model

2. **OneHotEncoder** (for categorical features):
   - Converts categories into binary columns
   - Example: `Category = ["Electronics", "Food", "Electronics"]`
   - Becomes:
     ```
     Category_Electronics  Category_Food
     1                     0
     0                     1
     1                     0
     ```
   - **Why:** Machine learning models need numbers, not text

#### Step 3.6: Train-Test Split
```python
X_train, X_test, y_train, y_test = train_test_split(
    X, y, 
    test_size=0.2,      # 20% for testing
    random_state=42     # For reproducibility
)
```

**What this does:**
- **80%** of data → Training (model learns from this)
- **20%** of data → Testing (model is evaluated on this)
- **Why:** We need to test the model on data it hasn't seen before

#### Step 3.7: Model Training
```python
# Create pipeline: preprocessing + model
model = make_pipeline(preprocessor, LinearRegression())

# Train the model
model.fit(X_train, y_train)
```

**What Linear Regression does:**
- Finds the best line/equation that predicts `Unit_Price` from features
- Formula: `Price = w1*Feature1 + w2*Feature2 + ... + b`
- Learns the weights (w1, w2, ...) and bias (b) from training data

**Example:**
- If `Quantity` increases → Price might decrease (bulk discount)
- If `Category = "Electronics"` → Price might be higher
- Model learns these patterns automatically

#### Step 3.8: Model Evaluation
```python
# Make predictions on test set
y_pred = model.predict(X_test)

# Calculate metrics
rmse = np.sqrt(mean_squared_error(y_test, y_pred))  # Lower is better
r2 = r2_score(y_test, y_pred)                        # Higher is better (0-1)
mae = np.mean(np.abs(y_test - y_pred))              # Average error
```

**Metrics explained:**
- **RMSE (Root Mean Squared Error):** Average prediction error in dollars
  - Example: RMSE = $2.45 means predictions are off by ~$2.45 on average
- **R² Score:** How well the model fits (0 = bad, 1 = perfect)
  - Example: R² = 0.87 means model explains 87% of price variation
- **MAE (Mean Absolute Error):** Average absolute difference
- **MAPE (Mean Absolute Percentage Error):** Error as percentage

#### Step 3.9: Generate Predictions for All Data
```python
# Predict prices for entire dataset
df['Predicted_Price'] = model.predict(X)
```

**What this does:**
- Uses the trained model to predict prices for every row
- Adds a new column `Predicted_Price` to the dataframe

#### Step 3.10: Create Visualizations
```python
# Actual vs Predicted scatter plot
plt.scatterplot(x=y_test, y=y_pred)
plt.plot([min, max], [min, max], 'r--')  # Perfect prediction line
plt.savefig("actual_vs_predicted.png")

# Residual plot (errors)
residuals = y_test - y_pred
plt.scatterplot(x=y_pred, y=residuals)
plt.axhline(y=0, color='red')  # Zero error line
plt.savefig("residual_plot.png")
```

**What the plots show:**
1. **Actual vs Predicted:** Points close to the red line = good predictions
2. **Residual Plot:** Random scatter around zero = good model (no patterns in errors)

#### Step 3.11: Save Results
```python
# Save predictions to CSV
df.to_csv("dynamic_pricing_results.csv", index=False)

# Output JSON results
results = {
    'success': True,
    'data': {
        'model_performance': {...},
        'dataset_info': {...},
        'features': {...},
        'output_files': {...}
    }
}
print(json.dumps(results))
```

### 4. **Response to Client**

The Node.js server receives the JSON output and returns:

```json
{
  "success": true,
  "data": {
    "model_performance": {
      "rmse": 2.45,
      "r2_score": 0.87,
      "mae": 1.89,
      "mape": 5.23
    },
    "dataset_info": {
      "total_rows": 1000,
      "training_samples": 800,
      "test_samples": 200
    },
    "features": {
      "numerical_features": ["Quantity", "Discount", "Date_year"],
      "categorical_features": ["Category", "Payment_Method"],
      "total_features": 5
    },
    "output_files": {
      "predictions_csv": "/path/to/dynamic_pricing_results.csv",
      "actual_vs_predicted_plot": "/path/to/actual_vs_predicted.png",
      "residual_plot": "/path/to/residual_plot.png"
    }
  }
}
```

## Example CSV Format

Your CSV file should look something like this:

```csv
Transaction_ID,Customer_ID,Product_ID,Product_Name,Category,Quantity,Unit_Price,Discount,Date,Payment_Method
T001,C001,P001,Apple,Food,5,2.50,0.10,2024-01-15,Credit
T002,C002,P002,Laptop,Electronics,1,999.99,0.05,2024-01-16,Debit
T003,C001,P003,Bread,Food,2,3.00,0.00,2024-01-17,Cash
...
```

**Required:**
- `Unit_Price` column (what we're predicting)

**Automatically excluded:**
- `Transaction_ID`, `Customer_ID`, `Product_ID`, `Product_Name`, `Date` (ID columns)

**Used as features:**
- Everything else (Quantity, Category, Discount, Payment_Method, etc.)

## Real-World Use Cases

1. **Price Optimization:** Predict optimal prices for new products
2. **Demand Forecasting:** Understand how price affects sales
3. **Dynamic Pricing:** Adjust prices based on market conditions
4. **Anomaly Detection:** Find products with unusual pricing
5. **Revenue Analysis:** Estimate revenue at different price points

## Key Concepts

### Why Linear Regression?
- **Simple and interpretable:** Easy to understand what the model is doing
- **Fast training:** Quick to train even on large datasets
- **Good baseline:** Works well for many pricing problems
- **No hyperparameters:** Less tuning needed

### Why Preprocessing?
- **StandardScaler:** Ensures all features are on the same scale
- **OneHotEncoder:** Converts text categories to numbers
- **Pipeline:** Applies preprocessing automatically during prediction

### Why Train-Test Split?
- **Prevents overfitting:** Tests model on unseen data
- **Realistic evaluation:** Shows how well model will perform in production
- **Model selection:** Compare different models fairly

## Troubleshooting

**Error: "CSV file not found"**
- Check the file path is correct
- Ensure the file exists and is readable

**Error: "Target column 'Unit_Price' not found"**
- Your CSV must have a column named exactly `Unit_Price`
- Check for typos or different column names

**Error: "No features available"**
- Your CSV needs columns other than ID columns
- Add features like Quantity, Category, Discount, etc.

**Low R² Score (< 0.5)**
- Model isn't learning well
- Try adding more relevant features
- Check for data quality issues

**High RMSE**
- Predictions have large errors
- May need more training data
- Consider more complex models (Random Forest, XGBoost)

## Price Update Integration

The dynamic pricing system is now integrated with the product database to automatically update prices based on ML predictions.

### Exporting Transaction Data

Export transaction data from the database to CSV format:

```bash
GET /api/analytics/export-transactions
Authorization: Bearer <admin_token>
```

Or use the script directly:
```bash
node backend/scripts/export_transactions_to_csv.js [output_path]
```

### Running Dynamic Pricing with Auto-Update

Run dynamic pricing analysis and automatically apply price updates in one request:

```bash
GET /api/analytics/dynamic-pricing?use_database=true&apply=true&max_change_percent=30&dry_run=false
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `use_database=true` - Export transactions from database automatically
- `apply=true` - Automatically apply price updates after analysis
- `max_change_percent=30` - Maximum allowed price change percentage (default: 50)
- `dry_run=true` - Preview changes without applying them

**Example Response:**
```json
{
  "success": true,
  "data": {
    "model_performance": {...},
    "price_updates": {
      "success": true,
      "updated": 15,
      "skipped": 3,
      "changes": [
        {
          "product_id": "1",
          "product_name": "Fresh Milk",
          "current_price": 1.50,
          "predicted_price": 1.65,
          "change_percent": "10.00",
          "status": "updated"
        }
      ]
    }
  }
}
```

### Applying Price Updates Separately

If you've already run the analysis, you can apply updates separately:

```bash
POST /api/analytics/dynamic-pricing/apply
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "csv_path": "/path/to/dynamic_pricing_results.csv",
  "max_change_percent": 30,
  "dry_run": false
}
```

**Request Body:**
- `csv_path` (required) - Path to the predictions CSV file
- `max_change_percent` (optional) - Maximum allowed price change (default: 50)
- `dry_run` (optional) - Preview changes without applying (default: false)

### Safety Features

The price update system includes several safety mechanisms:

1. **Maximum Change Limit:** Prices can't change more than a specified percentage (default: 50%)
2. **Validation:** Invalid prices (≤ 0) are automatically skipped
3. **Dry Run Mode:** Preview changes before applying them
4. **Product Filtering:** Only active products are updated
5. **Error Handling:** Failed updates are logged but don't stop the process

### Workflow Examples

**Example 1: Full Automated Workflow**
```bash
# 1. Export transactions and run analysis with auto-update
curl -X GET "http://localhost:3000/api/analytics/dynamic-pricing?use_database=true&apply=true&max_change_percent=25" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example 2: Two-Step Process (Recommended for Production)**
```bash
# Step 1: Run analysis with dry-run to preview
curl -X GET "http://localhost:3000/api/analytics/dynamic-pricing?use_database=true&apply=true&dry_run=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Step 2: Review the preview, then apply for real
curl -X POST "http://localhost:3000/api/analytics/dynamic-pricing/apply" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "csv_path": "/path/to/dynamic_pricing_results.csv",
    "max_change_percent": 25,
    "dry_run": false
  }'
```

**Example 3: Manual CSV Analysis**
```bash
# Use your own CSV file
curl -X GET "http://localhost:3000/api/analytics/dynamic-pricing?path=/path/to/your_data.csv&apply=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

1. **Improve the model:**
   - Try different algorithms (Random Forest, Gradient Boosting)
   - Feature engineering (create new features from existing ones)
   - Hyperparameter tuning

2. **Add more features:**
   - Customer demographics
   - Seasonal trends
   - Competitor prices
   - Inventory levels

3. **Automation:**
   - Set up scheduled price updates (cron job)
   - Monitor price change trends
   - A/B test pricing strategies

