require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/colleges', require('./routes/colleges'));
app.use('/api/tutor',    require('./routes/tutor'));
app.use('/api/quiz',     require('./routes/quiz'));
app.use('/api/progress', require('./routes/progress'));

app.get('/api/health', async (req, res) => {
  try {
    const ollama = require('./agent/ollama');
    const status = await ollama.checkOllama();
    const model  = status.running ? await ollama.getBestModel() : null;
    res.json({ status: 'ok', app: 'Ameyay', ollama: status.running ? 'running' : 'not running', model: model || 'none' });
  } catch(e) {
    res.json({ status: 'ok', app: 'Ameyay', ollama: 'error', model: 'none' });
  }
});

// Express 5: use /* instead of *
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎓 Ameyay running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
