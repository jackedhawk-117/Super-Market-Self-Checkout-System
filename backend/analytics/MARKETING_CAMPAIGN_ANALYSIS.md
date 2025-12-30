# Marketing Campaign Analysis

## Overview

This script analyzes marketing campaign CSV data to perform customer segmentation and campaign response analysis.

## Features

1. **RFM Segmentation** - Segments customers based on:
   - **Recency**: How recently they made a purchase
   - **Frequency**: How often they purchase
   - **Monetary**: How much they spend

2. **K-Means Clustering** - Groups customers into clusters based on spending patterns, purchase frequency, and other behavioral metrics

3. **Campaign Response Analysis** - Analyzes campaign acceptance rates and response rates by customer segment

4. **Business Insights** - Generates key metrics and insights from the data

## Usage

```bash
# Basic usage (uses default path)
python3 marketing_campaign_analysis.py

# Specify custom CSV file path
python3 marketing_campaign_analysis.py /path/to/your/campaign_data.csv
```

## Output

The script outputs JSON containing:

- **Customer Segments**: K-Means clusters with labels (High Value, Medium-High Value, etc.)
- **RFM Segments**: Customer segments (Champions, Loyal Customers, Potential Loyalists, At Risk, Lost)
- **Campaign Analysis**: Response rates, acceptance rates by campaign, and segment performance
- **Insights**: Key business metrics and summaries

## Example Results

From your marketing campaign data:

- **Total Customers**: 2,240
- **Average Spending**: $605.80 per customer
- **Total Revenue**: $1,356,988
- **Campaign Response Rate**: 14.91%

### RFM Segmentation Results:
- **Loyal Customers**: 704 (31.4%)
- **Potential Loyalists**: 438 (19.6%)
- **At Risk**: 412 (18.4%)
- **Lost**: 356 (15.9%)
- **Champions**: 330 (14.7%)

### K-Means Clustering:
- **High Value**: 549 customers (avg spending: $1,140)
- **Medium-High Value**: 506 customers (avg spending: $1,129, response rate: 27.9%)
- **Medium-Low Value**: 598 customers (avg spending: $138)
- **Low Value**: 587 customers (avg spending: $132)

## Dependencies

Install required packages:
```bash
pip install pandas numpy scikit-learn matplotlib seaborn
```

Or use the requirements file:
```bash
pip install -r requirements.txt
```

## CSV Format Requirements

The CSV file should contain the following columns (or similar):

- `ID`: Customer ID
- `Year_Birth`: Birth year (used to calculate age)
- `Income`: Annual income
- `Dt_Customer`: Customer enrollment date
- `Recency`: Days since last purchase
- `Mnt*`: Spending columns (MntWines, MntFruits, etc.)
- `Num*Purchase*`: Purchase frequency columns
- `AcceptedCmp*`: Campaign acceptance columns (0/1)
- `Response`: Campaign response (0/1)

## Integration

This script can be integrated into the backend API by:

1. Adding an endpoint in `routes/analytics.js`
2. Calling this script via subprocess
3. Returning the JSON results to the frontend

Example integration:
```javascript
const { exec } = require('child_process');
const path = require('path');

app.get('/api/analytics/marketing-campaign', (req, res) => {
  const csvPath = req.query.path || '/path/to/campaign.csv';
  const scriptPath = path.join(__dirname, '../analytics/marketing_campaign_analysis.py');
  
  exec(`python3 ${scriptPath} ${csvPath}`, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
    try {
      const results = JSON.parse(stdout);
      res.json(results);
    } catch (e) {
      res.status(500).json({ success: false, error: 'Failed to parse results' });
    }
  });
});
```

