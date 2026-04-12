require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectDB, pool } = require('./db');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const VALID_SKILL_LEVELS = new Set(['beginner', 'intermediate', 'advanced', 'expert']);
const VALID_SWAP_STATUSES = new Set(['pending', 'accepted', 'rejected', 'completed', 'cancelled']);

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

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseRating = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
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

const normalizeSwapStatus = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (!VALID_SWAP_STATUSES.has(normalized)) {
    return null;
  }
  return normalized;
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
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const getUserRatingStats = async (userIds) => {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (ids.length === 0) {
    return new Map();
  }

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT reviewee_id AS userId,
            ROUND(AVG(rating), 1) AS averageRating,
            COUNT(*) AS reviewCount
     FROM reviews
     WHERE reviewee_id IN (${placeholders})
     GROUP BY reviewee_id`,
    ids
  );

  const statsByUser = new Map();
  for (const row of rows) {
    statsByUser.set(row.userId, {
      averageRating: row.averageRating === null ? null : Number(row.averageRating),
      reviewCount: Number(row.reviewCount || 0),
    });
  }

  return statsByUser;
};

const getFavouriteSet = async (ownerId, targetIds) => {
  const ids = [...new Set((targetIds || []).filter(Boolean))];
  if (!ownerId || ids.length === 0) {
    return new Set();
  }

  const placeholders = ids.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT favourite_user_id AS userId
     FROM favourites
     WHERE user_id = ?
       AND favourite_user_id IN (${placeholders})`,
    [ownerId, ...ids]
  );

  return new Set(rows.map((row) => row.userId));
};

const fetchUserProfileWithSkills = async (userId, viewerId = userId) => {
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

  const ratingStats = await getUserRatingStats([userId]);
  const favouriteSet = await getFavouriteSet(viewerId, [userId]);
  const stats = ratingStats.get(userId) || { averageRating: null, reviewCount: 0 };

  return {
    ...rows[0],
    ...stats,
    isFavourite: favouriteSet.has(userId),
    offeredSkills,
    wantedSkills,
  };
};

const fetchReviewsForUser = async (userId) => {
  const [reviews] = await pool.execute(
    `SELECT r.id, r.swap_request_id AS swapRequestId, r.rating, r.comment, r.created_at AS createdAt,
            reviewer.id AS reviewerId, reviewer.name AS reviewerName, reviewer.city AS reviewerCity
     FROM reviews r
     INNER JOIN users reviewer ON reviewer.id = r.reviewer_id
     WHERE r.reviewee_id = ?
     ORDER BY r.created_at DESC`,
    [userId]
  );

  const ratingStats = await getUserRatingStats([userId]);
  const stats = ratingStats.get(userId) || { averageRating: null, reviewCount: 0 };

  return {
    reviews,
    averageRating: stats.averageRating,
    reviewCount: stats.reviewCount,
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
      [name.trim(), email.trim(), normalizeOptionalString(phone), normalizeOptionalString(city), hashedPassword]
    );

    const userId = insertResult.insertId;
    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
    const user = await fetchUserProfileWithSkills(userId);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user,
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
      'SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userRow = rows[0];
    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: userRow.id, email: userRow.email }, JWT_SECRET, { expiresIn: '7d' });
    const user = await fetchUserProfileWithSkills(userRow.id);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user,
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

app.get('/api/users/matches', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rawSkillId = req.query.skillId;
    const rawCity = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const rawLevel = typeof req.query.level === 'string' ? req.query.level.trim() : '';

    const skillId = rawSkillId === undefined || rawSkillId === '' ? null : parsePositiveInt(rawSkillId);
    if (rawSkillId !== undefined && rawSkillId !== '' && !skillId) {
      return res.status(400).json({ message: 'Invalid skillId filter' });
    }

    const level = rawLevel ? normalizeSkillLevel(rawLevel, null) : null;
    if (rawLevel && !level) {
      return res.status(400).json({ message: 'Invalid level filter' });
    }

    const cityPattern = `%${rawCity}%`;
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.city, u.bio, u.created_at
       FROM users u
       WHERE u.id <> ?
         AND (
           EXISTS (
             SELECT 1
             FROM user_skills_offered uso
             WHERE uso.user_id = u.id
               AND uso.skill_id IN (SELECT skill_id FROM user_skills_wanted WHERE user_id = ?)
           )
           OR EXISTS (
             SELECT 1
             FROM user_skills_wanted usw
             WHERE usw.user_id = u.id
               AND usw.skill_id IN (SELECT skill_id FROM user_skills_offered WHERE user_id = ?)
           )
         )
         AND (? = '' OR u.city LIKE ?)
         AND (
           ? IS NULL
           OR EXISTS (
             SELECT 1
             FROM user_skills_offered uso2
             WHERE uso2.user_id = u.id
               AND uso2.skill_id = ?
           )
           OR EXISTS (
             SELECT 1
             FROM user_skills_wanted usw2
             WHERE usw2.user_id = u.id
               AND usw2.skill_id = ?
           )
         )
         AND (
           ? IS NULL
           OR EXISTS (
             SELECT 1
             FROM user_skills_offered uso3
             WHERE uso3.user_id = u.id
               AND uso3.level = ?
           )
           OR EXISTS (
             SELECT 1
             FROM user_skills_wanted usw3
             WHERE usw3.user_id = u.id
               AND usw3.level = ?
           )
         )
       ORDER BY u.created_at DESC`,
      [userId, userId, userId, rawCity, cityPattern, skillId, skillId, skillId, level, level, level]
    );

    if (rows.length === 0) {
      return res.status(200).json({ matches: [] });
    }

    const userIds = rows.map((row) => row.id);
    const placeholders = userIds.map(() => '?').join(', ');

    const [offeredRows, wantedRows] = await Promise.all([
      pool.execute(
        `SELECT uso.user_id AS userId, s.id AS skillId, s.name, s.category, uso.level, uso.note
         FROM user_skills_offered uso
         INNER JOIN skills s ON s.id = uso.skill_id
         WHERE uso.user_id IN (${placeholders})
         ORDER BY s.name ASC`,
        userIds
      ),
      pool.execute(
        `SELECT usw.user_id AS userId, s.id AS skillId, s.name, s.category, usw.level, usw.note
         FROM user_skills_wanted usw
         INNER JOIN skills s ON s.id = usw.skill_id
         WHERE usw.user_id IN (${placeholders})
         ORDER BY s.name ASC`,
        userIds
      ),
    ]);

    const offeredByUser = new Map();
    const wantedByUser = new Map();

    for (const row of offeredRows[0]) {
      if (!offeredByUser.has(row.userId)) {
        offeredByUser.set(row.userId, []);
      }
      offeredByUser.get(row.userId).push({
        skillId: row.skillId,
        name: row.name,
        category: row.category,
        level: row.level,
        note: row.note,
      });
    }

    for (const row of wantedRows[0]) {
      if (!wantedByUser.has(row.userId)) {
        wantedByUser.set(row.userId, []);
      }
      wantedByUser.get(row.userId).push({
        skillId: row.skillId,
        name: row.name,
        category: row.category,
        level: row.level,
        note: row.note,
      });
    }

    const ratingStats = await getUserRatingStats(userIds);
    const favouriteSet = await getFavouriteSet(userId, userIds);

    const matches = rows.map((row) => {
      const stats = ratingStats.get(row.id) || { averageRating: null, reviewCount: 0 };
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        city: row.city,
        bio: row.bio,
        created_at: row.created_at,
        averageRating: stats.averageRating,
        reviewCount: stats.reviewCount,
        isFavourite: favouriteSet.has(row.id),
        offeredSkills: offeredByUser.get(row.id) || [],
        wantedSkills: wantedByUser.get(row.id) || [],
      };
    });

    return res.status(200).json({ matches });
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

    await pool.execute(
      `UPDATE users
       SET name = ?, phone = ?, city = ?, bio = ?
       WHERE id = ?`,
      [
        name.trim(),
        normalizeOptionalString(phone),
        normalizeOptionalString(city),
        normalizeOptionalString(bio),
        req.user.userId,
      ]
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
    const skillId = parsePositiveInt(req.body.skillId);
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
    const skillId = parsePositiveInt(req.body.skillId);
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
    const skillId = parsePositiveInt(req.params.skillId);
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
    const skillId = parsePositiveInt(req.params.skillId);
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

app.get('/api/favourites', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.email, u.phone, u.city, u.bio, u.created_at
       FROM favourites f
       INNER JOIN users u ON u.id = f.favourite_user_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [req.user.userId]
    );

    const userIds = rows.map((row) => row.id);
    const ratingStats = await getUserRatingStats(userIds);
    const favourites = rows.map((row) => {
      const stats = ratingStats.get(row.id) || { averageRating: null, reviewCount: 0 };
      return {
        ...row,
        ...stats,
        isFavourite: true,
      };
    });

    return res.status(200).json({ favourites });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/favourites', authenticateToken, async (req, res) => {
  try {
    const favouriteUserId = parsePositiveInt(req.body.userId);
    const userId = req.user.userId;

    if (!favouriteUserId) {
      return res.status(400).json({ message: 'Valid userId is required' });
    }
    if (favouriteUserId === userId) {
      return res.status(400).json({ message: 'You cannot favourite yourself' });
    }

    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [favouriteUserId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    try {
      await pool.execute(
        `INSERT INTO favourites (user_id, favourite_user_id)
         VALUES (?, ?)`,
        [userId, favouriteUserId]
      );
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        return res.status(200).json({ message: 'User already in favourites' });
      }
      throw error;
    }

    return res.status(201).json({ message: 'User added to favourites' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/favourites/:userId', authenticateToken, async (req, res) => {
  try {
    const favouriteUserId = parsePositiveInt(req.params.userId);
    if (!favouriteUserId) {
      return res.status(400).json({ message: 'Valid userId is required' });
    }

    const [result] = await pool.execute(
      `DELETE FROM favourites
       WHERE user_id = ? AND favourite_user_id = ?`,
      [req.user.userId, favouriteUserId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Favourite not found' });
    }

    return res.status(200).json({ message: 'User removed from favourites' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/swaps', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const receiverId = parsePositiveInt(req.body.receiverId);
    const offeredSkillId = parsePositiveInt(req.body.offeredSkillId);
    const requestedSkillId = parsePositiveInt(req.body.requestedSkillId);
    const message = normalizeOptionalString(req.body.message);
    const scheduledAt = normalizeOptionalString(req.body.scheduledAt);

    if (!receiverId || !offeredSkillId || !requestedSkillId) {
      return res.status(400).json({ message: 'receiverId, offeredSkillId, and requestedSkillId are required' });
    }
    if (receiverId === requesterId) {
      return res.status(400).json({ message: 'Cannot create swap request with yourself' });
    }

    const [receiverRows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [receiverId]);
    if (receiverRows.length === 0) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const [offeredMappingRows] = await pool.execute(
      'SELECT id FROM user_skills_offered WHERE user_id = ? AND skill_id = ? LIMIT 1',
      [requesterId, offeredSkillId]
    );
    if (offeredMappingRows.length === 0) {
      return res.status(400).json({ message: 'You can only offer skills from your offered list' });
    }

    const [requestedMappingRows] = await pool.execute(
      'SELECT id FROM user_skills_offered WHERE user_id = ? AND skill_id = ? LIMIT 1',
      [receiverId, requestedSkillId]
    );
    if (requestedMappingRows.length === 0) {
      return res.status(400).json({ message: 'Requested skill is not offered by selected user' });
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO swap_requests (
         requester_id, receiver_id, offered_skill_id, requested_skill_id, message, scheduled_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [requesterId, receiverId, offeredSkillId, requestedSkillId, message, scheduledAt]
    );

    return res.status(201).json({
      message: 'Swap request created',
      swapId: insertResult.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/swaps/incoming', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
      `SELECT sr.id, sr.requester_id AS requesterId, sr.receiver_id AS receiverId,
              sr.offered_skill_id AS offeredSkillId, sr.requested_skill_id AS requestedSkillId,
              sr.message, sr.status, sr.scheduled_at AS scheduledAt,
              sr.created_at AS createdAt, sr.updated_at AS updatedAt,
              u.name AS requesterName, u.city AS requesterCity, u.email AS requesterEmail,
              offered_skill.name AS offeredSkillName,
              requested_skill.name AS requestedSkillName,
              EXISTS(
                SELECT 1
                FROM reviews r
                WHERE r.swap_request_id = sr.id
                  AND r.reviewer_id = ?
              ) AS hasReviewedByMe
       FROM swap_requests sr
       INNER JOIN users u ON u.id = sr.requester_id
       INNER JOIN skills offered_skill ON offered_skill.id = sr.offered_skill_id
       INNER JOIN skills requested_skill ON requested_skill.id = sr.requested_skill_id
       WHERE sr.receiver_id = ?
       ORDER BY sr.created_at DESC`,
      [userId, userId]
    );

    return res.status(200).json({ swaps: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/swaps/outgoing', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
      `SELECT sr.id, sr.requester_id AS requesterId, sr.receiver_id AS receiverId,
              sr.offered_skill_id AS offeredSkillId, sr.requested_skill_id AS requestedSkillId,
              sr.message, sr.status, sr.scheduled_at AS scheduledAt,
              sr.created_at AS createdAt, sr.updated_at AS updatedAt,
              u.name AS receiverName, u.city AS receiverCity, u.email AS receiverEmail,
              offered_skill.name AS offeredSkillName,
              requested_skill.name AS requestedSkillName,
              EXISTS(
                SELECT 1
                FROM reviews r
                WHERE r.swap_request_id = sr.id
                  AND r.reviewer_id = ?
              ) AS hasReviewedByMe
       FROM swap_requests sr
       INNER JOIN users u ON u.id = sr.receiver_id
       INNER JOIN skills offered_skill ON offered_skill.id = sr.offered_skill_id
       INNER JOIN skills requested_skill ON requested_skill.id = sr.requested_skill_id
       WHERE sr.requester_id = ?
       ORDER BY sr.created_at DESC`,
      [userId, userId]
    );

    return res.status(200).json({ swaps: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.patch('/api/swaps/:id/status', authenticateToken, async (req, res) => {
  try {
    const swapId = parsePositiveInt(req.params.id);
    const nextStatus = normalizeSwapStatus(req.body.status);
    const userId = req.user.userId;

    if (!swapId) {
      return res.status(400).json({ message: 'Invalid swap id' });
    }
    if (!nextStatus) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const [rows] = await pool.execute(
      `SELECT id, requester_id AS requesterId, receiver_id AS receiverId, status
       FROM swap_requests
       WHERE id = ?
       LIMIT 1`,
      [swapId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = rows[0];
    const isRequester = swap.requesterId === userId;
    const isReceiver = swap.receiverId === userId;

    if (!isRequester && !isReceiver) {
      return res.status(403).json({ message: 'Not authorized for this swap' });
    }

    if (swap.status === nextStatus) {
      return res.status(200).json({ message: 'Status unchanged' });
    }

    if (nextStatus === 'accepted' || nextStatus === 'rejected') {
      if (!isReceiver || swap.status !== 'pending') {
        return res.status(400).json({ message: 'Only receiver can accept/reject pending swaps' });
      }
    } else if (nextStatus === 'cancelled') {
      if (!isRequester || swap.status !== 'pending') {
        return res.status(400).json({ message: 'Only requester can cancel pending swaps' });
      }
    } else if (nextStatus === 'completed') {
      if (swap.status !== 'accepted') {
        return res.status(400).json({ message: 'Only accepted swaps can be marked completed' });
      }
    } else if (nextStatus === 'pending') {
      return res.status(400).json({ message: 'Cannot transition back to pending' });
    }

    await pool.execute(
      `UPDATE swap_requests
       SET status = ?
       WHERE id = ?`,
      [nextStatus, swapId]
    );

    return res.status(200).json({ message: `Swap status updated to ${nextStatus}` });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/reviews/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const [userRows] = await pool.execute('SELECT id, name FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reviewPayload = await fetchReviewsForUser(userId);
    return res.status(200).json({
      user: userRows[0],
      ...reviewPayload,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const reviewerId = req.user.userId;
    const swapRequestId = parsePositiveInt(req.body.swapRequestId);
    const revieweeId = parsePositiveInt(req.body.revieweeId);
    const rating = parseRating(req.body.rating);
    const comment = normalizeOptionalString(req.body.comment);

    if (!swapRequestId || !revieweeId || !rating) {
      return res.status(400).json({ message: 'swapRequestId, revieweeId, and rating are required' });
    }
    if (revieweeId === reviewerId) {
      return res.status(400).json({ message: 'You cannot review yourself' });
    }

    const [swapRows] = await pool.execute(
      `SELECT id, requester_id AS requesterId, receiver_id AS receiverId, status
       FROM swap_requests
       WHERE id = ?
       LIMIT 1`,
      [swapRequestId]
    );
    if (swapRows.length === 0) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    const swap = swapRows[0];
    if (swap.status !== 'completed') {
      return res.status(400).json({ message: 'Reviews can only be submitted after a completed swap' });
    }

    const isParticipant = swap.requesterId === reviewerId || swap.receiverId === reviewerId;
    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized for this swap' });
    }

    const expectedRevieweeId = swap.requesterId === reviewerId ? swap.receiverId : swap.requesterId;
    if (revieweeId !== expectedRevieweeId) {
      return res.status(400).json({ message: 'revieweeId must be the other participant in the swap' });
    }

    const [existingRows] = await pool.execute(
      `SELECT id
       FROM reviews
       WHERE swap_request_id = ? AND reviewer_id = ?
       LIMIT 1`,
      [swapRequestId, reviewerId]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'You have already reviewed this swap' });
    }

    await pool.execute(
      `INSERT INTO reviews (swap_request_id, reviewer_id, reviewee_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [swapRequestId, reviewerId, revieweeId, rating, comment]
    );

    return res.status(201).json({ message: 'Review submitted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/messages/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.execute(
      `SELECT other_user.id AS userId,
              other_user.name,
              other_user.city,
              other_user.email,
              latest_message.id AS messageId,
              latest_message.content AS latestMessage,
              latest_message.created_at AS latestMessageAt,
              latest_message.sender_id AS latestSenderId,
              (
                SELECT COUNT(*)
                FROM messages unread
                WHERE unread.sender_id = other_user.id
                  AND unread.receiver_id = ?
                  AND unread.read_at IS NULL
              ) AS unreadCount
       FROM (
         SELECT CASE
                  WHEN sender_id = ? THEN receiver_id
                  ELSE sender_id
                END AS otherUserId,
                MAX(id) AS latestMessageId
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY otherUserId
       ) convo
       INNER JOIN messages latest_message ON latest_message.id = convo.latestMessageId
       INNER JOIN users other_user ON other_user.id = convo.otherUserId
       ORDER BY latest_message.created_at DESC`,
      [userId, userId, userId, userId]
    );

    const ratingStats = await getUserRatingStats(rows.map((row) => row.userId));
    const favouriteSet = await getFavouriteSet(userId, rows.map((row) => row.userId));
    const conversations = rows.map((row) => {
      const stats = ratingStats.get(row.userId) || { averageRating: null, reviewCount: 0 };
      return {
        ...row,
        unreadCount: Number(row.unreadCount || 0),
        ...stats,
        isFavourite: favouriteSet.has(row.userId),
      };
    });

    return res.status(200).json({ conversations });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/messages/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const otherUserId = parsePositiveInt(req.params.userId);
    if (!otherUserId) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const [userRows] = await pool.execute(
      'SELECT id, name, city, email FROM users WHERE id = ? LIMIT 1',
      [otherUserId]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [rows] = await pool.execute(
      `SELECT id, sender_id AS senderId, receiver_id AS receiverId, content, read_at AS readAt, created_at AS createdAt
       FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [currentUserId, otherUserId, otherUserId, currentUserId]
    );

    await pool.execute(
      `UPDATE messages
       SET read_at = NOW()
       WHERE sender_id = ? AND receiver_id = ? AND read_at IS NULL`,
      [otherUserId, currentUserId]
    );

    const ratingStats = await getUserRatingStats([otherUserId]);
    const stats = ratingStats.get(otherUserId) || { averageRating: null, reviewCount: 0 };
    const favouriteSet = await getFavouriteSet(currentUserId, [otherUserId]);

    return res.status(200).json({
      otherUser: {
        ...userRows[0],
        ...stats,
        isFavourite: favouriteSet.has(otherUserId),
      },
      messages: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const senderId = req.user.userId;
    const receiverId = parsePositiveInt(req.body.receiverId);
    const content = normalizeOptionalString(req.body.content);

    if (!receiverId || !content) {
      return res.status(400).json({ message: 'receiverId and content are required' });
    }
    if (receiverId === senderId) {
      return res.status(400).json({ message: 'You cannot message yourself' });
    }

    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [receiverId]);
    if (userRows.length === 0) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES (?, ?, ?)`,
      [senderId, receiverId, content]
    );

    return res.status(201).json({
      message: 'Message sent',
      messageId: insertResult.insertId,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
