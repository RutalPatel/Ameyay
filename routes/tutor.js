const router = require('express').Router();
const { v4: uid } = require('uuid');
const db    = require('../db/database');
const { softAuth } = require('../middleware/auth');
const agent = require('../agent/agent');
const ollama = require('../agent/ollama');

router.use(softAuth);

// POST /api/tutor/chat
router.post('/chat', async (req, res) => {
  try {
    const { message, history=[], tutorMode, goal, name, college, branch, timeMode, sessionId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is empty' });

    const u = req.user;
    const ctx = {
      name:      u?.name      || name      || 'Student',
      goal:      u?.goal      || goal      || 'college',
      college:   u?.collegeName|| college  || '',
      branch:    u?.branch    || branch    || '',
      timeMode:  u?.timeMode  || timeMode  || 'month',
      tutorMode: tutorMode    || 'simple language',
    };

    const reply = await agent.tutorChat({ message: message.trim(), history, ctx });

    const sid = sessionId || uid();
    if (req.userId) {
      await db.chats.insert({ userId:req.userId, sessionId:sid, userMessage:message.trim(), aiReply:reply, tutorMode:ctx.tutorMode, timestamp:new Date().toISOString() });
      await db.users.update({ _id:req.userId }, { $inc:{ xp:10 } });
    }

    res.json({ reply, sessionId:sid });
  } catch (err) {
    console.error('[/chat]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tutor/generate
router.post('/generate', async (req, res) => {
  try {
    const { type='general', topic, prompt, goal, branch, timeMode, name, college, exam } = req.body;
    const u = req.user;
    const ctx = {
      name:     u?.name      || name     || 'Student',
      goal:     u?.goal      || goal     || 'college',
      college:  u?.collegeName|| college || '',
      branch:   u?.branch    || branch   || '',
      timeMode: u?.timeMode  || timeMode || 'month',
    };
    const content = await agent.generate({ type, topic:topic||prompt||'', ctx, extra:{ exam, count:req.body.count, difficulty:req.body.difficulty } });
    res.json({ content });
  } catch (err) {
    console.error('[/generate]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tutor/history
router.get('/history', async (req, res) => {
  if (!req.userId) return res.json({ chats:[] });
  try {
    const chats = await db.chats.find({ userId:req.userId });
    chats.sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
    res.json({ chats: chats.slice(0,50) });
  } catch { res.status(500).json({ error:'Could not fetch history' }); }
});

// DELETE /api/tutor/history
router.delete('/history', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error:'Login required' });
  await db.chats.remove({ userId:req.userId }, { multi:true });
  res.json({ message:'History cleared' });
});

// GET /api/tutor/status
router.get('/status', async (req, res) => {
  const ollamaStatus = await ollama.checkOllama().catch(() => ({ running:false, models:[] }));
  const model = ollamaStatus.running ? await ollama.getBestModel().catch(() => null) : null;
  const hasClaudeKey = !!(process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant'));
  res.json({ ollama: ollamaStatus.running, ollamaModel: model, claudeApi: hasClaudeKey, ready: hasClaudeKey || ollamaStatus.running });
});

module.exports = router;
