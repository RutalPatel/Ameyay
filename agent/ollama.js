const fetch = require('node-fetch');

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { timeout: 2000 });
    if (!res.ok) return { running: false, models: [] };
    const data = await res.json();
    return { running: true, models: (data.models || []).map(m => m.name) };
  } catch (_) {
    return { running: false, models: [] };
  }
}

async function getBestModel() {
  const { running, models } = await checkOllama();
  if (!running || !models.length) return null;
  const preferred = ['llama3.2','llama3.1','llama3','mistral','phi3','gemma2'];
  for (const p of preferred) {
    const found = models.find(m => m.startsWith(p));
    if (found) return found;
  }
  return models[0];
}

async function chat({ system, messages }) {
  const model = await getBestModel();
  if (!model) throw new Error('OLLAMA_NOT_RUNNING');

  const msgs = [];
  if (system) msgs.push({ role: 'system', content: system });
  msgs.push(...messages.map(m => ({ role: m.role, content: m.content })));

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: msgs, stream: false, options: { temperature: 0.7, num_predict: 1024 } }),
  });
  if (!res.ok) throw new Error('OLLAMA_NOT_RUNNING');
  const data = await res.json();
  return data.message?.content || '';
}

async function generate({ system, prompt }) {
  return chat({ system, messages: [{ role: 'user', content: prompt }] });
}

module.exports = { chat, generate, checkOllama, getBestModel };
