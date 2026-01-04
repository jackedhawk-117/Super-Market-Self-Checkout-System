const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const authenticateToken = require('./auth').authenticateToken;
const requireAdmin = require('./auth').requireAdmin;
const { exportTransactionsToCSV } = require('../scripts/export_transactions_to_csv');
const { applyPriceUpdates } = require('../scripts/apply_price_updates');

const router = express.Router();

// Customer segmentation endpoint (Admin only)
router.get('/segmentation', authenticateToken, requireAdmin, (req, res) => {
  // Get Python script path
  const scriptPath = path.join(__dirname, '..', 'analytics', 'customer_segmentation.py');

  // Set database path in environment
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'checkout.db');
  const env = {
    ...process.env,
    DATABASE_PATH: dbPath
  };

  // Execute Python script
  exec(`python3 "${scriptPath}"`, { env }, (error, stdout, stderr) => {
    if (error) {
      console.error('Segmentation error:', error);
      console.error('stderr:', stderr);
      return res.status(500).json({
        success: false,
        error: 'Failed to run segmentation analysis',
        details: stderr || error.message
      });
    }

    try {
      // Parse JSON output from Python script
      const result = JSON.parse(stdout);

      if (result.success) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Segmentation analysis failed',
          error_type: result.error_type
        });
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Python output:', stdout);
      res.status(500).json({
        success: false,
        error: 'Failed to parse analysis results',
        details: stdout
      });
    }
  });
});

// Marketing campaign analysis endpoint (Admin only)
router.get('/marketing-campaign', authenticateToken, requireAdmin, (req, res) => {
  // Get CSV file path from query parameter or use default
  let csvPath = req.query.path || req.query.csv_path;

  // Use default CSV file if no path provided
  if (!csvPath) {
    csvPath = path.join(__dirname, '..', 'analytics', 'marketing_campaign.csv');
  }

  // Validate file path exists and is readable
  if (!fs.existsSync(csvPath)) {
    return res.status(404).json({
      success: false,
      error: 'CSV file not found',
      path: csvPath
    });
  }

  // Get Python script path
  const scriptPath = path.join(__dirname, '..', 'analytics', 'marketing_campaign_analysis.py');

  // Execute Python script with CSV path as argument
  exec(`python3 "${scriptPath}" "${csvPath}"`, { env: process.env }, (error, stdout, stderr) => {
    if (error) {
      console.error('Marketing campaign analysis error:', error);
      console.error('stderr:', stderr);
      return res.status(500).json({
        success: false,
        error: 'Failed to run marketing campaign analysis',
        details: stderr || error.message
      });
    }

    try {
      // Parse JSON output from Python script
      const result = JSON.parse(stdout);

      if (result.success) {
        res.json({
          success: true,
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Marketing campaign analysis failed',
          error_type: result.error_type
        });
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Python output:', stdout);
      res.status(500).json({
        success: false,
        error: 'Failed to parse analysis results',
        details: stdout
      });
    }
  });
});

// Marketing campaign analysis endpoint with file upload support (Admin only)
router.post('/marketing-campaign/upload', authenticateToken, requireAdmin, (req, res) => {
  // For now, require path parameter
  // TODO: Add multer for file upload support
  return res.status(501).json({
    success: false,
    error: 'File upload not yet implemented. Use GET /api/analytics/marketing-campaign?path=/path/to/file.csv'
  });
});

// Export transactions to CSV endpoint (Admin only)
router.get('/export-transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const outputPath = req.query.path || path.join(__dirname, '..', 'analytics', 'transactions_export.csv');

    const result = await exportTransactionsToCSV(outputPath);

    res.json({
      success: true,
      message: 'Transactions exported successfully',
      data: result
    });
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export transactions',
      details: error.message
    });
  }
});

// Dynamic pricing prediction endpoint (Admin only)
router.get('/dynamic-pricing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Check if we should use database transactions or a provided CSV
    const useDatabase = req.query.use_database === 'true' || req.query.use_database === '1';
    let csvPath = req.query.path || req.query.csv_path;

    // If using database, export transactions first
    if (useDatabase && !csvPath) {
      const exportPath = path.join(__dirname, '..', 'analytics', 'transactions_export.csv');
      try {
        await exportTransactionsToCSV(exportPath);
        csvPath = exportPath;
      } catch (exportError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to export transactions from database',
          details: exportError.message
        });
      }
    }

    // Use default CSV file if no path provided
    if (!csvPath) {
      csvPath = path.join(__dirname, '..', 'analytics', 'so.csv');
    }

    // Validate file path exists and is readable
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({
        success: false,
        error: 'CSV file not found',
        path: csvPath
      });
    }

    // Get Python script path
    const scriptPath = path.join(__dirname, '..', 'analytics', 'dynamic_pricing.py');

    // Execute Python script with CSV path as argument
    exec(`python3 "${scriptPath}" "${csvPath}"`, { env: process.env }, async (error, stdout, stderr) => {
      if (error) {
        console.error('Dynamic pricing analysis error:', error);
        console.error('stderr:', stderr);
        return res.status(500).json({
          success: false,
          error: 'Failed to run dynamic pricing analysis',
          details: stderr || error.message
        });
      }

      try {
        // Parse JSON output from Python script
        const result = JSON.parse(stdout);

        if (!result.success) {
          return res.status(500).json({
            success: false,
            error: result.error || 'Dynamic pricing analysis failed',
            error_type: result.error_type
          });
        }

        // Check if auto-apply is requested
        const autoApply = req.query.apply === 'true' || req.query.apply === '1';
        const maxChangePercent = parseFloat(req.query.max_change_percent) || 50;
        const dryRun = req.query.dry_run === 'true' || req.query.dry_run === '1';

        let priceUpdateResult = null;
        if (autoApply && result.data && result.data.output_files && result.data.output_files.predictions_csv) {
          try {
            priceUpdateResult = await applyPriceUpdates(result.data.output_files.predictions_csv, {
              maxPriceChangePercent: maxChangePercent,
              dryRun: dryRun
            });
          } catch (updateError) {
            console.error('Price update error:', updateError);
            // Continue to return analysis results even if update fails
            priceUpdateResult = {
              success: false,
              error: updateError.message
            };
          }
        }

        res.json({
          success: true,
          data: {
            ...result.data,
            price_updates: priceUpdateResult
          }
        });
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Python output:', stdout);
        res.status(500).json({
          success: false,
          error: 'Failed to parse analysis results',
          details: stdout
        });
      }
    });
  } catch (error) {
    console.error('Dynamic pricing endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Apply price updates from dynamic pricing results (Admin only)
router.post('/dynamic-pricing/apply', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { csv_path, max_change_percent, dry_run } = req.body;

    if (!csv_path) {
      return res.status(400).json({
        success: false,
        error: 'CSV file path is required',
        usage: 'Provide csv_path in request body pointing to dynamic_pricing_results.csv'
      });
    }

    const maxChangePercent = parseFloat(max_change_percent) || 50;
    const isDryRun = dry_run === true || dry_run === 'true' || dry_run === 1;

    const result = await applyPriceUpdates(csv_path, {
      maxPriceChangePercent: maxChangePercent,
      dryRun: isDryRun
    });

    res.json({
      success: true,
      message: isDryRun ? 'Dry run completed' : 'Price updates applied successfully',
      data: result
    });
  } catch (error) {
    console.error('Apply price updates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply price updates',
      details: error.message
    });
  }
});

// Customer statistics endpoint (Admin only)
router.get('/statistics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { getDatabase } = require('../database/init');
    const db = getDatabase();

    // Get overall statistics
    const stats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(DISTINCT u.id) as total_customers,
          COUNT(DISTINCT CASE WHEN t.id IS NOT NULL THEN u.id END) as active_customers,
          COUNT(t.id) as total_transactions,
          COALESCE(SUM(t.total_amount), 0) as total_revenue,
          COALESCE(AVG(t.total_amount), 0) as avg_transaction_amount,
          COALESCE(SUM(CASE WHEN t.status = 'paid' THEN t.total_amount ELSE 0 END), 0) as paid_revenue
        FROM users u
        LEFT JOIN transactions t ON u.id = t.user_id
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Low stock forecast endpoint (Admin only)
router.get('/low-stock', authenticateToken, requireAdmin, (req, res) => {
  // Get Python script path
  const scriptPath = path.join(__dirname, '..', 'analytics', 'inventory_forecast.py');

  // Set database path in environment
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'checkout.db');
  const env = {
    ...process.env,
    DATABASE_PATH: dbPath
  };

  // Execute Python script
  exec(`python3 "${scriptPath}"`, { env }, (error, stdout, stderr) => {
    if (error) {
      console.error('Low stock forecast error:', error);
      console.error('stderr:', stderr);
      return res.status(500).json({
        success: false,
        error: 'Failed to run inventory forecast',
        details: stderr || error.message
      });
    }

    try {
      // Parse JSON output from Python script
      const result = JSON.parse(stdout);

      // Check if Python returned an error object
      if (result.error) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Python output:', stdout);
      res.status(500).json({
        success: false,
        error: 'Failed to parse forecast results',
        details: stdout
      });
    }
  });
});

// Product Recommendations endpoint
router.get('/recommendations', authenticateToken, (req, res) => {
  // Get Python script path
  const scriptPath = path.join(__dirname, '..', 'analytics', 'recommendations.py');

  // Set database path in environment
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'database', 'checkout.db');
  const env = {
    ...process.env,
    DATABASE_PATH: dbPath
  };

  const userId = req.user.userId;
  // Execute Python script
  exec(`python3 "${scriptPath}" --user_id "${userId}"`, { env }, (error, stdout, stderr) => {
    if (error) {
      console.error('Recommendations error:', error);
      console.error('stderr:', stderr);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate recommendations',
        details: stderr || error.message
      });
    }

    try {
      // Parse JSON output from Python script
      const result = JSON.parse(stdout);

      // Check if Python returned an error object
      if (result.error) {
        return res.status(500).json({
          success: false,
          error: result.error
        });
      }

      res.json({
        success: true,
        data: result
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Python output:', stdout);
      res.status(500).json({
        success: false,
        error: 'Failed to parse recommendation results',
        details: stdout
      });
    }
  });
});

module.exports = router;

