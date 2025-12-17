const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const authenticateToken = require('./auth').authenticateToken;
const requireAdmin = require('./auth').requireAdmin;

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

module.exports = router;

