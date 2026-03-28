const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  port: Number(process.env.DB_PORT || 8889), // MAMP MySQL default
  database: process.env.DB_NAME || 'skillswap',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

const connectDB = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('MySQL connected (MAMP)');
  } catch (error) {
    console.error('MySQL connection error:', error.message);
    process.exit(1);
  }
};

module.exports = {
  connectDB,
  pool,
};
