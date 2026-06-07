const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uid } = require('uuid');
const db = require('../db/database');
const { sign } = require('../middleware/auth');
const { auth } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, goal, collegeId, collegeName, enrollmentId, branch, year, timeMode } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Email, password, and name required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await db.users.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered. Please sign in.' });

    const hash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const user = await db.users.insert({
      _id: uid(), email: email.toLowerCase(), passwordHash: hash,
      name: name.trim(), goal: goal || 'college',
      collegeId: collegeId || null, collegeName: collegeName || null,
      enrollmentId: enrollmentId || null, branch: branch || null,
      year: year || null, timeMode: timeMode || 'month',
      xp: 0, streak: 1, lastActive: now, createdAt: now,
    });

    await db.progress.insert({ userId: user._id, syllabusProgress: {}, completedChapters: 0, totalChapters: 0, updatedAt: now });

    const { passwordHash: _, ...safe } = user;
    res.status(201).json({ token: sign(user._id), user: safe });
  } catch (err) {
    console.error('Register:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.users.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash)))
      return res.status(401).json({ error: 'Invalid email or password' });

    const now = new Date();
    const diffDays = Math.floor((now - new Date(user.lastActive)) / 86400000);
    const streak = diffDays <= 1 ? (user.streak || 1) + (diffDays === 1 ? 1 : 0) : 1;
    await db.users.update({ _id: user._id }, { $set: { lastActive: now.toISOString(), streak } });

    const { passwordHash: _, ...safe } = user;
    safe.streak = streak;
    res.json({ token: sign(user._id), user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const { passwordHash: _, ...safe } = req.user;
  res.json({ user: safe });
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const allowed = ['name', 'branch', 'year', 'goal', 'timeMode', 'collegeId', 'collegeName', 'enrollmentId'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updatedAt = new Date().toISOString();
    await db.users.update({ _id: req.userId }, { $set: updates });
    const updated = await db.users.findOne({ _id: req.userId });
    const { passwordHash: _, ...safe } = updated;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
