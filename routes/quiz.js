const router = require('express').Router();
const { v4: uid } = require('uuid');
const db = require('../db/database');
const { softAuth } = require('../middleware/auth');
const agent = require('../agent/agent');

router.use(softAuth);

// POST /api/quiz/generate
router.post('/generate', async (req, res) => {
  try {
    const { topic, count = 10, difficulty = 'moderate exam level', goal, branch } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic required' });

    const user = req.user;
    const examLabel = {
      college: 'university exam',
      gate: 'GATE IN 2027',
      jee: 'JEE Advanced',
      neet: 'NEET',
      boards: 'Board Exam',
      upsc: 'UPSC',
    }[user?.goal || goal] || 'exam';

    const raw = await agent.generate({
      type: 'quiz',
      topic,
      ctx: { goal: user?.goal || goal || 'college', branch: user?.branch || branch || '' },
      extra: { count: parseInt(count), difficulty, exam: examLabel },
    });

    let questions;
    try {
      questions = JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (_) {
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return res.status(500).json({ error: 'AI returned invalid format. Please try again.' });
      questions = JSON.parse(match[0]);
    }

    if (!Array.isArray(questions) || questions.length === 0)
      return res.status(500).json({ error: 'No questions generated. Try a different topic.' });

    res.json({ quizId: uid(), questions, topic, count: questions.length });
  } catch (err) {
    console.error('Quiz generate:', err.message);
    res.status(503).json({ error: err.message });
  }
});

// POST /api/quiz/save
router.post('/save', async (req, res) => {
  if (!req.userId) return res.json({ saved: false, message: 'Login to save quiz history' });
  try {
    const { topic, score, totalMarks, correct, wrong, skipped } = req.body;
    const pct = totalMarks ? +((score / totalMarks) * 100).toFixed(1) : 0;
    const quiz = await db.quizzes.insert({
      _id: uid(), userId: req.userId, topic,
      score: +score || 0, pct, correct: correct || 0,
      wrong: wrong || 0, skipped: skipped || 0,
      createdAt: new Date().toISOString(),
    });
    const xp = Math.round(pct);
    await db.users.update({ _id: req.userId }, { $inc: { xp } });
    res.json({ quiz, xpEarned: xp });
  } catch (err) {
    res.status(500).json({ error: 'Could not save quiz' });
  }
});

// GET /api/quiz/history
router.get('/history', async (req, res) => {
  if (!req.userId) return res.json({ quizzes: [], stats: { attempts: 0, avgScore: 0, bestScore: 0 } });
  try {
    const quizzes = await db.quizzes.find({ userId: req.userId });
    quizzes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const attempts = quizzes.length;
    const avgScore = attempts > 0 ? (quizzes.reduce((s, q) => s + q.pct, 0) / attempts).toFixed(1) : 0;
    const bestScore = attempts > 0 ? Math.max(...quizzes.map(q => q.pct)).toFixed(1) : 0;
    res.json({ quizzes: quizzes.slice(0, 20), stats: { attempts, avgScore, bestScore } });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch quiz history' });
  }
});

module.exports = router;
