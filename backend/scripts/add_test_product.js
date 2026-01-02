const { getDatabase, initDatabase } = require('../database/init');
const path = require('path');

// Manually initialize DB connection for script usage
const db = getDatabase();

async function addTestProduct() {
    return new Promise((resolve, reject) => {
        // Check if product exists
        db.get("SELECT id FROM products WHERE id = 'P1019'", [], (err, row) => {
            if (err) {
                console.error(err);
                reject(err);
                return;
            }

            if (row) {
                console.log("Product P1019 already exists.");
                resolve();
            } else {
                // Insert product matching the CSV
                db.run(`
                INSERT INTO products (id, name, price, barcode, description, category, stock_quantity, image_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, ['P1019', 'Detergent 1kg', 310.75, '8901234567890', 'High power detergent for washing machines', 'Household', 100, null],
                    function (err) {
                        if (err) {
                            console.error("Failed to insert:", err);
                            reject(err);
                        } else {
                            console.log("✅ Added product P1019 (Detergent 1kg) to database.");
                            resolve();
                        }
                    });
            }
        });
    });
}

// Run
addTestProduct();
