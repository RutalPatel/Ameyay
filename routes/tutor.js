const router = require('express').Router();
const { v4: uid } = require('uuid');
const db = require('../db/database');
const { softAuth } = require('../middleware/auth');
const agent = require('../agent/agent');
const ollama = require('../agent/ollama');

// All tutor routes use softAuth — works with or without an account
router.use(softAuth);

// POST /api/tutor/chat — main AI chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [], tutorMode, goal, name, college, branch, timeMode, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    // Build context from request body (guest) or user account (logged in)
    const user = req.user;
    const ctx = {
      name:      user?.name      || name      || 'Student',
      goal:      user?.goal      || goal      || 'college',
      college:   user?.collegeName || college || '',
      branch:    user?.branch    || branch    || '',
      timeMode:  user?.timeMode  || timeMode  || 'month',
      tutorMode: tutorMode       || 'simple language',
    };

    const reply = await agent.tutorChat({ message: message.trim(), history, ctx });

    // Persist chat if logged in
    const sid = sessionId || uid();
    if (req.userId) {
      await db.chats.insert({
        userId: req.userId, sessionId: sid,
        userMessage: message.trim(), aiReply: reply,
        tutorMode: ctx.tutorMode, timestamp: new Date().toISOString(),
      });
      await db.users.update({ _id: req.userId }, { $inc: { xp: 10 } });
    }

    res.json({ reply, sessionId: sid, xpEarned: req.userId ? 10 : 0 });
  } catch (err) {
    console.error('Chat error:', err.message);
    const isOllamaDown = err.message.includes('Ollama') || err.message.includes('ECONNREFUSED') || err.message.includes('fetch');
    res.status(isOllamaDown ? 503 : 500).json({
      error: isOllamaDown
        ? 'Local AI (Ollama) is not running. Start it with: ollama serve'
        : err.message,
    });
  }
});

// POST /api/tutor/generate — cheat sheets, notes, study plans
router.post('/generate', async (req, res) => {
  try {
    const { type = 'general', topic, prompt, goal, branch, timeMode, name, college, exam } = req.body;
    const user = req.user;
    const ctx = {
      name:     user?.name      || name     || 'Student',
      goal:     user?.goal      || goal     || 'college',
      college:  user?.collegeName || college || '',
      branch:   user?.branch    || branch   || '',
      timeMode: user?.timeMode  || timeMode || 'month',
    };

    const content = await agent.generate({
      type,
      topic: topic || prompt || '',
      ctx,
      extra: { exam, count: req.body.count, difficulty: req.body.difficulty },
    });

    res.json({ content });
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(503).json({ error: err.message });
  }
});

// GET /api/tutor/history
router.get('/history', async (req, res) => {
  if (!req.userId) return res.json({ chats: [] });
  try {
    const chats = await db.chats.find({ userId: req.userId });
    chats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ chats: chats.slice(0, 50) });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch history' });
  }
});

// DELETE /api/tutor/history
router.delete('/history', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Login required' });
  await db.chats.remove({ userId: req.userId }, { multi: true });
  res.json({ message: 'History cleared' });
});

// GET /api/tutor/status — check if Ollama is running
router.get('/status', async (req, res) => {
  const status = await ollama.checkOllama();
  const best = status.running ? await ollama.getBestModel() : null;
  res.json({ ...status, activeModel: best });
});

module.exports = router;
