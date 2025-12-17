const express = require('express');
const { getDatabase } = require('../database/init');
const authenticateToken = require('./auth').authenticateToken;

const router = express.Router();
const db = getDatabase();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, price, barcode, description, category, stock_quantity, image_url FROM products WHERE is_active = 1 ORDER BY name',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by barcode
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const { barcode } = req.params;

    const product = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, price, barcode, description, category, stock_quantity, image_url FROM products WHERE barcode = ? AND is_active = 1',
        [barcode],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found',
        barcode: barcode
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const product = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, price, barcode, description, category, stock_quantity, image_url FROM products WHERE id = ? AND is_active = 1',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!product) {
      return res.status(404).json({ 
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });

  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product (Admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, price, barcode, description, category, stock_quantity, image_url } = req.body;

    // Validation
    if (!name || !price || !barcode) {
      return res.status(400).json({ error: 'Name, price, and barcode are required' });
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Check if barcode already exists
    const existingProduct = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM products WHERE barcode = ?', [barcode], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingProduct) {
      return res.status(400).json({ error: 'Product with this barcode already exists' });
    }

    // Generate unique ID
    const { v4: uuidv4 } = require('uuid');
    const productId = uuidv4();

    // Insert product
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO products (id, name, price, barcode, description, category, stock_quantity, image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [productId, name, price, barcode, description || null, category || null, stock_quantity || 0, image_url || null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        id: productId,
        name,
        price,
        barcode,
        description,
        category,
        stock_quantity: stock_quantity || 0,
        image_url
      }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product (Admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, barcode, description, category, stock_quantity, image_url } = req.body;

    // Check if product exists
    const existingProduct = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM products WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update product
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE products SET 
         name = COALESCE(?, name),
         price = COALESCE(?, price),
         barcode = COALESCE(?, barcode),
         description = COALESCE(?, description),
         category = COALESCE(?, category),
         stock_quantity = COALESCE(?, stock_quantity),
         image_url = COALESCE(?, image_url),
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, price, barcode, description, category, stock_quantity, image_url, id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (Admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete - set is_active to 0
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;

    const products = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, price, barcode, description, category, stock_quantity, image_url FROM products WHERE category = ? AND is_active = 1 ORDER BY name',
        [category],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      success: true,
      data: products,
      count: products.length,
      category: category
    });

  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
