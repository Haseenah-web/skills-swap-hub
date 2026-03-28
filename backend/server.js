require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, pool } = require('./db');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const VALID_SKILL_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);

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

const normalizeOptionalString = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization header' });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const parseSkillId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const normalizeSkillLevel = (value, fallbackLevel) => {
  if (typeof value !== 'string') {
    return fallbackLevel;
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_SKILL_LEVELS.has(normalized)) {
    return null;
  }
  return normalized;
};

const fetchUserProfileWithSkills = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, city, bio, created_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) {
    return null;
  }

  const [offeredSkills] = await pool.execute(
    `SELECT s.id AS skillId, s.name, s.category, uso.level, uso.note
     FROM user_skills_offered uso
     INNER JOIN skills s ON s.id = uso.skill_id
     WHERE uso.user_id = ?
     ORDER BY s.name ASC`,
    [userId]
  );

  const [wantedSkills] = await pool.execute(
    `SELECT s.id AS skillId, s.name, s.category, usw.level, usw.note
     FROM user_skills_wanted usw
     INNER JOIN skills s ON s.id = usw.skill_id
     WHERE usw.user_id = ?
     ORDER BY s.name ASC`,
    [userId]
  );

  return {
    ...rows[0],
    offeredSkills,
    wantedSkills,
  };
};

app.get('/', (_req, res) => {
  res.json({ message: 'Skill Swap Hub API is running (MySQL)' });
});

app.get('/api/skills', async (req, res) => {
  try {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const likePattern = `%${rawQuery}%`;

    const [skills] = await pool.execute(
      `SELECT id, name, category
       FROM skills
       WHERE (? = '' OR name LIKE ? OR category LIKE ?)
       ORDER BY name ASC`,
      [rawQuery, likePattern, likePattern]
    );

    return res.status(200).json({ skills });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
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
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: userId, name, email, phone, city, bio: null },
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
      'SELECT id, name, email, phone, city, bio, password_hash FROM users WHERE email = ? LIMIT 1',
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
      JWT_SECRET,
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
        bio: user.bio,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const user = await fetchUserProfileWithSkills(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const { name, phone, city, bio } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }

    const normalizedName = name.trim();
    const normalizedPhone = normalizeOptionalString(phone);
    const normalizedCity = normalizeOptionalString(city);
    const normalizedBio = normalizeOptionalString(bio);

    await pool.execute(
      `UPDATE users
       SET name = ?, phone = ?, city = ?, bio = ?
       WHERE id = ?`,
      [normalizedName, normalizedPhone, normalizedCity, normalizedBio, req.user.userId]
    );

    const user = await fetchUserProfileWithSkills(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/users/me/skills/offered', authenticateToken, async (req, res) => {
  try {
    const skillId = parseSkillId(req.body.skillId);
    if (!skillId) {
      return res.status(400).json({ message: 'Valid skillId is required' });
    }

    const level = normalizeSkillLevel(req.body.level, 'intermediate');
    if (!level) {
      return res.status(400).json({ message: 'Invalid level value' });
    }

    const note = normalizeOptionalString(req.body.note);

    const [skillRows] = await pool.execute('SELECT id FROM skills WHERE id = ? LIMIT 1', [skillId]);
    if (skillRows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    try {
      await pool.execute(
        `INSERT INTO user_skills_offered (user_id, skill_id, level, note)
         VALUES (?, ?, ?, ?)`,
        [req.user.userId, skillId, level, note]
      );
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Skill already added to offered list' });
      }
      throw error;
    }

    return res.status(201).json({ message: 'Skill added to offered list' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/users/me/skills/wanted', authenticateToken, async (req, res) => {
  try {
    const skillId = parseSkillId(req.body.skillId);
    if (!skillId) {
      return res.status(400).json({ message: 'Valid skillId is required' });
    }

    const level = normalizeSkillLevel(req.body.level, 'beginner');
    if (!level) {
      return res.status(400).json({ message: 'Invalid level value' });
    }

    const note = normalizeOptionalString(req.body.note);

    const [skillRows] = await pool.execute('SELECT id FROM skills WHERE id = ? LIMIT 1', [skillId]);
    if (skillRows.length === 0) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    try {
      await pool.execute(
        `INSERT INTO user_skills_wanted (user_id, skill_id, level, note)
         VALUES (?, ?, ?, ?)`,
        [req.user.userId, skillId, level, note]
      );
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Skill already added to wanted list' });
      }
      throw error;
    }

    return res.status(201).json({ message: 'Skill added to wanted list' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/users/me/skills/offered/:skillId', authenticateToken, async (req, res) => {
  try {
    const skillId = parseSkillId(req.params.skillId);
    if (!skillId) {
      return res.status(400).json({ message: 'Valid skillId is required' });
    }

    const [result] = await pool.execute(
      `DELETE FROM user_skills_offered
       WHERE user_id = ? AND skill_id = ?`,
      [req.user.userId, skillId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Offered skill mapping not found' });
    }

    return res.status(200).json({ message: 'Skill removed from offered list' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/users/me/skills/wanted/:skillId', authenticateToken, async (req, res) => {
  try {
    const skillId = parseSkillId(req.params.skillId);
    if (!skillId) {
      return res.status(400).json({ message: 'Valid skillId is required' });
    }

    const [result] = await pool.execute(
      `DELETE FROM user_skills_wanted
       WHERE user_id = ? AND skill_id = ?`,
      [req.user.userId, skillId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Wanted skill mapping not found' });
    }

    return res.status(200).json({ message: 'Skill removed from wanted list' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
