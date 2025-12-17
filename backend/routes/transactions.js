const express = require('express');
const { getDatabase } = require('../database/init');
const authenticateToken = require('./auth').authenticateToken;

const router = express.Router();
const db = getDatabase();

// Create new transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items, payment_method } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Transaction must contain at least one item' });
    }

    // Calculate total amount
    let totalAmount = 0;
    const transactionItems = [];

    // Validate and prepare items
    for (const item of items) {
      if (!item.product_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Each item must have product_id and valid quantity' });
      }

      // Get product details
      const product = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id, name, price, stock_quantity FROM products WHERE id = ? AND is_active = 1',
          [item.product_id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!product) {
        return res.status(400).json({ 
          error: `Product not found: ${item.product_id}` 
        });
      }

      if (product.stock_quantity < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock_quantity}, Requested: ${item.quantity}` 
        });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      transactionItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal,
        product_name: product.name
      });
    }

    // Generate transaction ID
    const { v4: uuidv4 } = require('uuid');
    const transactionId = uuidv4();

    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Create transaction record
      db.run(
        `INSERT INTO transactions (id, user_id, total_amount, status, payment_method, qr_code_data) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, userId, totalAmount, 'pending', payment_method || null, null],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create transaction' });
          }

          // Insert transaction items
          const insertItem = db.prepare(
            'INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, total_price) VALUES (?, ?, ?, ?, ?)'
          );

          let itemsInserted = 0;
          transactionItems.forEach((item) => {
            insertItem.run([transactionId, item.product_id, item.quantity, item.unit_price, item.total_price], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to create transaction items' });
              }
              itemsInserted++;
              
              if (itemsInserted === transactionItems.length) {
                // Update stock quantities
                const updateStock = db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?');
                
                let stocksUpdated = 0;
                transactionItems.forEach((item) => {
                  updateStock.run([item.quantity, item.product_id], (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res.status(500).json({ error: 'Failed to update stock' });
                    }
                    stocksUpdated++;
                    
                    if (stocksUpdated === transactionItems.length) {
                      insertItem.finalize();
                      updateStock.finalize();
                      db.run('COMMIT');
                      
                      // Generate QR code data
                      const qrData = {
                        transaction_id: transactionId,
                        user_id: userId,
                        total_amount: totalAmount,
                        timestamp: new Date().toISOString(),
                        items: transactionItems.map(item => ({
                          product_id: item.product_id,
                          name: item.product_name,
                          quantity: item.quantity,
                          unit_price: item.unit_price,
                          total_price: item.total_price
                        }))
                      };

                      // Update transaction with QR code data
                      db.run(
                        'UPDATE transactions SET qr_code_data = ? WHERE id = ?',
                        [JSON.stringify(qrData), transactionId]
                      );

                      res.status(201).json({
                        success: true,
                        message: 'Transaction created successfully',
                        data: {
                          transaction_id: transactionId,
                          total_amount: totalAmount,
                          items: transactionItems,
                          qr_code_data: qrData
                        }
                      });
                    }
                  });
                });
              }
            });
          });
        });
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transaction by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const transaction = await new Promise((resolve, reject) => {
      db.get(
        `SELECT t.*, u.name as user_name, u.email as user_email 
         FROM transactions t 
         JOIN users u ON t.user_id = u.id 
         WHERE t.id = ? AND t.user_id = ?`,
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Get transaction items
    const items = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ti.*, p.name as product_name, p.barcode 
         FROM transaction_items ti 
         JOIN products p ON ti.product_id = p.id 
         WHERE ti.transaction_id = ?`,
        [id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: {
        ...transaction,
        items: items
      }
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's transactions
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 20, offset = 0, status } = req.query;

    let query = `
      SELECT t.*, u.name as user_name, u.email as user_email 
      FROM transactions t 
      JOIN users u ON t.user_id = u.id 
      WHERE t.user_id = ?
    `;
    let params = [userId];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const transactions = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update transaction status (for payment confirmation)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    // Validation
    const validStatuses = ['pending', 'paid', 'cancelled', 'refunded'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Valid status required', 
        valid_statuses: validStatuses 
      });
    }

    // Check if transaction exists and belongs to user
    const transaction = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, status FROM transactions WHERE id = ? AND user_id = ?',
        [id, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Update transaction status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: {
        transaction_id: id,
        status: status
      }
    });

  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify QR code data
router.post('/verify-qr', async (req, res) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ error: 'QR code data is required' });
    }

    let parsedData;
    try {
      parsedData = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid QR code data format' });
    }

    // Verify transaction exists
    const transaction = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, status, total_amount, created_at FROM transactions WHERE id = ?',
        [parsedData.transaction_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({
      success: true,
      message: 'QR code verified successfully',
      data: {
        transaction_id: transaction.id,
        status: transaction.status,
        total_amount: transaction.total_amount,
        created_at: transaction.created_at,
        verified_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Verify QR code error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

