const { getDatabase } = require('../database/init');
const fs = require('fs');
const path = require('path');

/**
 * Exports transaction data from database to CSV format for dynamic pricing analysis
 * @param {string} outputPath - Path where CSV file should be saved
 * @returns {Promise<{success: boolean, filePath: string, rowCount: number}>}
 */
async function exportTransactionsToCSV(outputPath) {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Query to get transaction data in the format expected by dynamic_pricing.py
    const query = `
      SELECT 
        t.id AS Transaction_ID,
        t.user_id AS Customer_ID,
        ti.product_id AS Product_ID,
        p.name AS Product_Name,
        p.category AS Category,
        ti.quantity AS Quantity,
        ti.unit_price AS Unit_Price,
        t.payment_method AS Payment_Method,
        DATE(t.created_at) AS Date
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      JOIN products p ON ti.product_id = p.id
      WHERE p.is_active = 1
      ORDER BY t.created_at DESC
    `;

    db.all(query, [], async (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      if (rows.length === 0) {
        reject(new Error('No transaction data found in database'));
        return;
      }

      try {
        // Create CSV content
        const headers = [
          'Transaction_ID',
          'Customer_ID',
          'Product_ID',
          'Product_Name',
          'Category',
          'Quantity',
          'Unit_Price',
          'Payment_Method',
          'Date'
        ];

        let csvContent = headers.join(',') + '\n';

        rows.forEach(row => {
          const values = [
            row.Transaction_ID || '',
            row.Customer_ID || '',
            row.Product_ID || '',
            `"${(row.Product_Name || '').replace(/"/g, '""')}"`,
            row.Category || '',
            row.Quantity || 0,
            row.Unit_Price || 0,
            row.Payment_Method || '',
            row.Date || ''
          ];
          csvContent += values.join(',') + '\n';
        });

        // Ensure output directory exists
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Write CSV file
        fs.writeFileSync(outputPath, csvContent, 'utf8');

        resolve({
          success: true,
          filePath: outputPath,
          rowCount: rows.length
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

// If run directly from command line
if (require.main === module) {
  const outputPath = process.argv[2] || path.join(__dirname, '..', 'analytics', 'transactions_export.csv');
  
  exportTransactionsToCSV(outputPath)
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error(JSON.stringify({
        success: false,
        error: error.message
      }, null, 2));
      process.exit(1);
    });
}

module.exports = { exportTransactionsToCSV };

