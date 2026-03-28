require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, pool } = require('./db');

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

connectDB();

app.get('/', (_req, res) => {
  res.json({ message: 'Skill Swap Hub API is running (MySQL)' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone = null, city = null } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const [existingRows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [insertResult] = await pool.execute(
      'INSERT INTO users (name, email, phone, city, password_hash) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone, city, hashedPassword]
    );

    const userId = insertResult.insertId;

    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, name, email, phone, city },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const [rows] = await pool.execute(
      'SELECT id, name, email, phone, city, password_hash FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'dev_secret_change_me',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
