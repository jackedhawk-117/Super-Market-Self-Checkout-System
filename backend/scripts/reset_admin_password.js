const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/init');

async function resetAdminPassword() {
  const db = getDatabase();
  const email = process.argv[2] || 'admin@checkout.com';
  const newPassword = process.argv[3] || 'admin123';

  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the admin user's password
    db.run(
      'UPDATE users SET password = ?, role = ? WHERE email = ?',
      [hashedPassword, 'admin', email],
      function(err) {
        if (err) {
          console.error('❌ Error updating password:', err);
          process.exit(1);
        } else {
          console.log('✅ Admin password updated successfully!');
          console.log(`📧 Email: ${email}`);
          console.log(`🔑 New Password: ${newPassword}`);
          console.log(`👤 Role: admin`);
          process.exit(0);
        }
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetAdminPassword();

