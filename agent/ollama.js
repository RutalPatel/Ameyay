const fetch = require('node-fetch');

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:3000';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Check if Ollama is running and return available models
async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });
    if (!res.ok) return { running: false, models: [] };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    return { running: true, models };
  } catch (_) {
    return { running: false, models: [] };
  }
}

// Pick best available model
async function getBestModel() {
  const { running, models } = await checkOllama();
  if (!running || models.length === 0) return null;

  // Prefer these in order
  const preferred = [
    'llama3.2', 'llama3.2:3b', 'llama3.2:1b',
    'llama3.1', 'llama3', 'mistral', 'mistral:7b',
    'phi3', 'phi3:mini', 'gemma2', 'gemma2:2b',
    'qwen2.5', 'deepseek-r1',
  ];

  for (const pref of preferred) {
    const found = models.find(m => m.startsWith(pref));
    if (found) return found;
  }
  return models[0]; // fallback to first available
}

// Chat with Ollama
async function chat({ model, system, messages, stream = false }) {
  const selectedModel = model || await getBestModel();
  if (!selectedModel) {
    throw new Error(
      'Ollama is not running or no models are installed.\n\n' +
      'To fix:\n' +
      '1. Install Ollama: https://ollama.com/download\n' +
      '2. Run: ollama pull llama3.2\n' +
      '3. Ollama starts automatically after install'
    );
  }

  const ollamaMessages = [];
  if (system) {
    ollamaMessages.push({ role: 'system', content: system });
  }
  ollamaMessages.push(...messages.map(m => ({ role: m.role, content: m.content })));

  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: selectedModel,
      messages: ollamaMessages,
      stream,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        num_predict: 1024,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama error: ${err}`);
  }

  if (stream) return response; // caller handles streaming

  const data = await response.json();
  return data.message?.content || '';
}

// Generate (single-turn, no history)
async function generate({ model, system, prompt, stream = false }) {
  return chat({
    model,
    system,
    messages: [{ role: 'user', content: prompt }],
    stream,
  });
}

// Pull a model
async function pullModel(modelName) {
  const response = await fetch(`${OLLAMA_BASE}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: false }),
  });
  if (!response.ok) throw new Error(`Could not pull ${modelName}`);
  return response.json();
}

module.exports = { chat, generate, checkOllama, getBestModel, pullModel, OLLAMA_BASE, DEFAULT_MODEL };
