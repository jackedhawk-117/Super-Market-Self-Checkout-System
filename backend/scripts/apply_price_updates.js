const { getDatabase } = require('../database/init');
const fs = require('fs');

/**
 * Applies price updates from dynamic pricing results CSV to the database
 * @param {string} csvPath - Path to the dynamic_pricing_results.csv file
 * @param {Object} options - Options for price updates
 * @param {number} options.maxPriceChangePercent - Maximum allowed price change percentage (default: 50)
 * @param {boolean} options.dryRun - If true, only returns what would be updated without applying changes
 * @returns {Promise<{success: boolean, updated: number, skipped: number, errors: Array, changes: Array}>}
 */
async function applyPriceUpdates(csvPath, options = {}) {
  const {
    maxPriceChangePercent = 50,
    dryRun = false
  } = options;

  const db = getDatabase();
  const results = {
    updated: 0,
    skipped: 0,
    errors: [],
    changes: []
  };

  return new Promise(async (resolve, reject) => {
    if (!fs.existsSync(csvPath)) {
      reject(new Error(`CSV file not found: ${csvPath}`));
      return;
    }

    try {
      // Read and parse CSV file
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        reject(new Error('CSV file is empty or has no data rows'));
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const productIdIdx = headers.indexOf('Product_ID');
      const unitPriceIdx = headers.indexOf('Unit_Price');
      const predictedPriceIdx = headers.indexOf('Predicted_Price');
      const productNameIdx = headers.indexOf('Product_Name');

      if (productIdIdx === -1 || unitPriceIdx === -1 || predictedPriceIdx === -1) {
        reject(new Error('CSV file missing required columns: Product_ID, Unit_Price, Predicted_Price'));
        return;
      }

      const updates = [];

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          // Simple CSV parsing (handles quoted values)
          const row = [];
          let current = '';
          let inQuotes = false;

          for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              row.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          row.push(current.trim()); // Add last field

          const productId = row[productIdIdx]?.replace(/^"|"$/g, '') || '';
          const currentPrice = parseFloat(row[unitPriceIdx]?.replace(/^"|"$/g, '') || '');
          const predictedPrice = parseFloat(row[predictedPriceIdx]?.replace(/^"|"$/g, '') || '');
          const productName = row[productNameIdx]?.replace(/^"|"$/g, '') || 'Unknown';

          if (!productId || isNaN(currentPrice) || isNaN(predictedPrice)) {
            results.skipped++;
            continue;
          }

          // Calculate price change percentage
          const priceChangePercent = ((predictedPrice - currentPrice) / currentPrice) * 100;

          // Skip if price change exceeds maximum allowed
          if (Math.abs(priceChangePercent) > maxPriceChangePercent) {
            results.skipped++;
            results.changes.push({
              product_id: productId,
              product_name: productName,
              current_price: currentPrice,
              predicted_price: predictedPrice,
              change_percent: priceChangePercent.toFixed(2),
              status: 'skipped',
              reason: `Price change exceeds ${maxPriceChangePercent}% limit`
            });
            continue;
          }

          // Skip if predicted price is invalid (negative or zero)
          if (predictedPrice <= 0) {
            results.skipped++;
            results.changes.push({
              product_id: productId,
              product_name: productName,
              current_price: currentPrice,
              predicted_price: predictedPrice,
              change_percent: priceChangePercent.toFixed(2),
              status: 'skipped',
              reason: 'Invalid predicted price (must be > 0)'
            });
            continue;
          }

          updates.push({
            product_id: productId,
            product_name: productName,
            current_price: currentPrice,
            predicted_price: predictedPrice,
            change_percent: priceChangePercent
          });
        } catch (error) {
          results.errors.push({
            row: i + 1,
            error: error.message
          });
        }
      }

      if (updates.length === 0) {
        resolve({
          success: true,
          ...results,
          message: 'No valid price updates found'
        });
        return;
      }

      if (dryRun) {
        // Dry run - just return what would be updated
        resolve({
          success: true,
          ...results,
          updated: updates.length,
          changes: updates.map(u => ({
            ...u,
            change_percent: u.change_percent.toFixed(2),
            status: 'would_update'
          })),
          message: `Dry run: ${updates.length} products would be updated`
        });
        return;
      }

      // Apply updates to database
      for (const update of updates) {
        try {
          await new Promise((resolveUpdate, rejectUpdate) => {
            db.run(
              'UPDATE products SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1',
              [update.predicted_price, update.product_id],
              function (err) {
                if (err) {
                  rejectUpdate(err);
                } else {
                  if (this.changes > 0) {
                    results.updated++;
                    results.changes.push({
                      product_id: update.product_id,
                      product_name: update.product_name,
                      current_price: update.current_price,
                      predicted_price: update.predicted_price,
                      change_percent: update.change_percent.toFixed(2),
                      status: 'updated'
                    });
                  } else {
                    results.skipped++;
                    results.changes.push({
                      product_id: update.product_id,
                      product_name: update.product_name,
                      current_price: update.current_price,
                      predicted_price: update.predicted_price,
                      change_percent: update.change_percent.toFixed(2),
                      status: 'skipped',
                      reason: 'Product not found or inactive'
                    });
                  }
                  resolveUpdate();
                }
              }
            );
          });
        } catch (error) {
          results.errors.push({
            product_id: update.product_id,
            error: error.message
          });
        }
      }

      resolve({
        success: true,
        ...results,
        message: `Price updates completed: ${results.updated} updated, ${results.skipped} skipped`
      });
    } catch (error) {
      reject(error);
    }
  });

}

// If run directly from command line
if (require.main === module) {
  const csvPath = process.argv[2];
  const maxChange = parseFloat(process.argv[3]) || 50;
  const dryRun = process.argv[4] === '--dry-run';

  if (!csvPath) {
    console.error('Usage: node apply_price_updates.js <csv_path> [max_change_percent] [--dry-run]');
    process.exit(1);
  }

  applyPriceUpdates(csvPath, { maxPriceChangePercent: maxChange, dryRun })
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

module.exports = { applyPriceUpdates };

