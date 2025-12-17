# Customer Segmentation Analytics

This module performs K-Means clustering analysis on customer purchase data to segment customers into groups (High Value, Medium Value, Low Value).

## Setup

1. Install Python dependencies:
```bash
cd backend/analytics
pip3 install -r requirements.txt
```

Or install globally:
```bash
pip3 install pandas numpy scikit-learn
```

## How It Works

1. **Data Collection**: Reads customer transaction data from SQLite database
2. **Feature Engineering**: Calculates total purchase amount and transaction count per customer
3. **Clustering**: Uses K-Means algorithm to segment customers into groups
4. **Analysis**: Provides statistics for each customer segment

## API Endpoints

- `GET /api/analytics/segmentation` - Get customer segmentation results
- `GET /api/analytics/statistics` - Get overall customer statistics

## Requirements

- Python 3.7+
- pandas >= 2.0.0
- numpy >= 1.24.0
- scikit-learn >= 1.3.0

## Usage

The Python script is automatically called by the Node.js backend when the `/api/analytics/segmentation` endpoint is accessed.

To run manually:
```bash
python3 customer_segmentation.py
```

