# API Documentation

## Analytics Endpoints

All analytics endpoints require authentication and admin privileges.

### Marketing Campaign Analysis

Analyzes marketing campaign CSV data to perform customer segmentation and campaign response analysis.

**Endpoint:** `GET /api/analytics/marketing-campaign`

**Authentication:** Required (Admin only)

**Query Parameters:**
- `path` (required): Path to the CSV file to analyze
  - Example: `/home/user/Downloads/marketing_campaign.csv`

**Example Request:**
```bash
# Using curl
curl -X GET \
  "http://localhost:3000/api/analytics/marketing-campaign?path=/home/jackedhawk117/Downloads/marketing_campaign.csv" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "total_customers": 2240,
    "n_clusters": 4,
    "clusters": {
      "0": {
        "label": "Medium-Low Value",
        "customer_count": 598,
        "avg_spending": 137.79,
        "avg_purchases": 9.05,
        "response_rate": 0.042
      },
      "1": {
        "label": "High Value",
        "customer_count": 549,
        "avg_spending": 1140.05,
        "avg_purchases": 21.31,
        "response_rate": 0.148
      }
    },
    "rfm_segments": {
      "Champions": {
        "customer_count": 330,
        "avg_spending": 1306.32,
        "avg_purchases": 23.77,
        "response_rate": 0.333
      },
      "Loyal Customers": {
        "customer_count": 704,
        "avg_spending": 989.88,
        "avg_purchases": 20.26,
        "response_rate": 0.183
      }
    },
    "campaign_analysis": {
      "overall_response_rate": 0.149,
      "total_responses": 334,
      "total_customers": 2240,
      "campaign_acceptance": {
        "AcceptedCmp1": {
          "accepted": 144,
          "acceptance_rate": 0.064
        }
      }
    },
    "insights": [
      "Total customers analyzed: 2240",
      "Average customer spending: $605.80",
      "Campaign response rate: 14.91%"
    ]
  }
}
```

**Error Responses:**

```json
// Missing path parameter
{
  "success": false,
  "error": "CSV file path is required. Provide it as query parameter: ?path=/path/to/file.csv"
}

// File not found
{
  "success": false,
  "error": "CSV file not found",
  "path": "/invalid/path.csv"
}

// Analysis failed
{
  "success": false,
  "error": "Failed to run marketing campaign analysis",
  "details": "Error details..."
}
```

### Customer Segmentation

Performs K-Means clustering on customer purchase data from the database.

**Endpoint:** `GET /api/analytics/segmentation`

**Authentication:** Required (Admin only)

**Example Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/analytics/segmentation" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Customer Statistics

Returns overall customer and transaction statistics.

**Endpoint:** `GET /api/analytics/statistics`

**Authentication:** Required (Admin only)

**Example Request:**
```bash
curl -X GET \
  "http://localhost:3000/api/analytics/statistics" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Authentication

All analytics endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

To get a token, use the login endpoint:
```bash
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

## CSV File Format

The marketing campaign CSV should contain columns such as:
- `ID`: Customer ID
- `Year_Birth`: Birth year
- `Income`: Annual income
- `Dt_Customer`: Customer enrollment date
- `Recency`: Days since last purchase
- `Mnt*`: Spending columns (MntWines, MntFruits, etc.)
- `Num*Purchase*`: Purchase frequency columns
- `AcceptedCmp*`: Campaign acceptance columns (0/1)
- `Response`: Campaign response (0/1)

See `backend/analytics/MARKETING_CAMPAIGN_ANALYSIS.md` for more details.



