const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'ameyay-secret-change-in-production';

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = await db.users.findOne({ _id: decoded.userId });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    req.userId = user._id;
    next();
  } catch (err) {
    res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
}

// Optional — attaches user if valid token present, proceeds either way
async function softAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
      const user = await db.users.findOne({ _id: decoded.userId });
      if (user) { req.user = user; req.userId = user._id; }
    }
  } catch (_) {}
  next();
}

function sign(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { auth, softAuth, sign };
