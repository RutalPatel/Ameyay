const router = require('express').Router();
const db = require('../db/database');
const { auth } = require('../middleware/auth');

// GET /api/progress
router.get('/', auth, async (req, res) => {
  try {
    const [progress, quizzes, user] = await Promise.all([
      db.progress.findOne({ userId: req.userId }),
      db.quizzes.find({ userId: req.userId }),
      db.users.findOne({ _id: req.userId }),
    ]);
    const attempts = quizzes.length;
    const avgScore = attempts > 0 ? (quizzes.reduce((s, q) => s + q.pct, 0) / attempts).toFixed(1) : null;
    const bestScore = attempts > 0 ? Math.max(...quizzes.map(q => q.pct)).toFixed(1) : null;
    res.json({
      xp: user?.xp || 0, streak: user?.streak || 1,
      syllabus: progress?.syllabusProgress || {},
      syllabusPercent: progress ? Math.round((progress.completedChapters / Math.max(progress.totalChapters, 1)) * 100) : 0,
      quiz: { attempts, avgScore, bestScore, recent: quizzes.sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch progress' });
  }
});

// PUT /api/progress/chapter
router.put('/chapter', auth, async (req, res) => {
  try {
    const { chapterId, status, percentage } = req.body;
    if (!chapterId || !status) return res.status(400).json({ error: 'chapterId and status required' });

    let p = await db.progress.findOne({ userId: req.userId });
    if (!p) p = await db.progress.insert({ userId: req.userId, syllabusProgress: {}, completedChapters: 0, totalChapters: 0, updatedAt: new Date().toISOString() });

    const sp = p.syllabusProgress || {};
    sp[chapterId] = { status, percentage: percentage || 0, updatedAt: new Date().toISOString() };
    const done = Object.values(sp).filter(c => c.status === 'done').length;

    await db.progress.update({ userId: req.userId }, { $set: { syllabusProgress: sp, completedChapters: done, totalChapters: Object.keys(sp).length, updatedAt: new Date().toISOString() } });
    if (status === 'done') await db.users.update({ _id: req.userId }, { $inc: { xp: 50 } });

    res.json({ syllabusProgress: sp });
  } catch (err) {
    res.status(500).json({ error: 'Could not update progress' });
  }
});

module.exports = router;
