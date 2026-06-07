const ollama = require('./ollama');
const fetch  = require('node-fetch');

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'; // cheapest/fastest

const TIME_URGENCY = {
  night:        { label:'😤 Survival Mode', urgency:'extreme',  short:'1 Night'  },
  week:         { label:'⚡ Rush Mode',      urgency:'high',     short:'1 Week'   },
  month:        { label:'🔥 Grind Mode',     urgency:'medium',   short:'1 Month'  },
  three_months: { label:'💪 Prep Mode',      urgency:'moderate', short:'3 Months' },
  six_months:   { label:'🎯 Strategy Mode',  urgency:'low',      short:'6 Months' },
  year:         { label:'🏆 Champion Mode',  urgency:'relaxed',  short:'1 Year+'  },
};

function buildSystem(ctx) {
  const mode = TIME_URGENCY[ctx.timeMode] || TIME_URGENCY.month;
  const exam = { college:`${ctx.college||'university'} ${ctx.branch||''}`, gate:`GATE 2027 — ${ctx.branch||'IN'}`, jee:'JEE / JEE Advanced', neet:'NEET', boards:'Class 11/12 Boards', upsc:'UPSC Civil Services' }[ctx.goal] || 'exam';
  const tone = { extreme:'ULTRA-CONCISE. Tonight only. No fluff.', high:'Fast, high-yield content only.', medium:'Balanced, focused, exam-relevant.', moderate:'Thorough and engaging.', low:'Deep, strategic, from first principles.', relaxed:'Comprehensive, patient, full mastery.' }[mode.urgency];
  const style = { 'simple language':'Use everyday words, no jargon.', 'formula first':'Lead with the formula, then explain each variable.', 'step by step':'Break into numbered steps, one concept each.', 'analogy mode':'Use creative real-world analogies.', 'socratic method':'Guide with questions, make the student think.', 'exam focused':'Focus on what examiners test. Use exam language.' }[ctx.tutorMode||'simple language'];
  return `You are Ameyay, a personal AI tutor for ${ctx.name||'Student'} preparing for ${exam}.\nTime: ${mode.label} (${mode.short} to exam) — ${tone}\nExplanation style: ${style}\nRules: Use **bold** for key terms, backticks for formulas. Be encouraging. Always relate to ${exam}.`;
}

// Try Ollama first, fall back to Claude API
async function callAI({ system, messages, prompt }) {
  const msgs = prompt ? [{ role:'user', content:prompt }] : messages;

  // Try Ollama (local, free)
  try {
    const result = await (prompt
      ? ollama.generate({ system, prompt })
      : ollama.chat({ system, messages: msgs }));
    console.log('AI: Ollama ✓');
    return result;
  } catch (err) {
    if (err.message !== 'OLLAMA_NOT_RUNNING') throw err;
  }

  // Fall back to Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('AI not available. Either run Ollama locally (ollama.com) or add ANTHROPIC_API_KEY to your Render environment variables.');
  }

  console.log('AI: Claude API ✓');
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
    body: JSON.stringify({ model:CLAUDE_MODEL, max_tokens:1200, system, messages:msgs }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || 'Claude API error ' + res.status);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function tutorChat({ message, history, ctx }) {
  const system = buildSystem(ctx);
  const messages = [...(history||[]).slice(-16), { role:'user', content:message }];
  return callAI({ system, messages });
}

async function generate({ type, topic, ctx, extra={} }) {
  const exam = { gate:'GATE IN 2027', jee:'JEE Advanced', neet:'NEET', upsc:'UPSC', boards:'Board Exam', college:'exam' }[ctx.goal] || 'exam';
  const mode = TIME_URGENCY[ctx.timeMode] || TIME_URGENCY.month;

  const prompts = {
    cheatsheet: `Create a ${mode.urgency==='extreme'?'crash':'concise'} cheat sheet for ${exam} on "${topic}".\n## ${topic} — Quick Reference\n### Key Formulas\n${mode.urgency==='extreme'?'Top 5 only':'6-8 most important'}\n### Key Concepts\n3-4 bullet points\n### Exam Tips\n2-3 specific tips for ${exam}\nStudent has ${mode.short} until exam.`,
    quiz:       `Generate exactly ${extra.count||10} MCQs for ${exam} on "${topic}". Difficulty: ${extra.difficulty||'moderate'}.\nReturn ONLY valid JSON array, no markdown:\n[{"q":"question","opts":["A) opt","B) opt","C) opt","D) opt"],"ans":0,"exp":"explanation"}]\nans is 0-based index.`,
    studyplan:  `Create a ${mode.short} study plan for ${ctx.name||'student'} preparing for ${exam} (${ctx.branch||''}).\nBreak it into daily/weekly sessions. Be specific and realistic.`,
    notes:      `Create comprehensive study notes for "${topic}" for ${exam}. Use markdown with clear headings, key points, and formulas.`,
    pyq:        `Give 5 previous year ${exam} questions on "${topic}" with complete step-by-step solutions.`,
    general:    topic,
  };

  const systems = {
    cheatsheet: 'You are an expert educator. Create clear, well-formatted study material using markdown.',
    quiz:       'You are a professional exam question setter. Return ONLY valid JSON arrays. No other text.',
    default:    buildSystem(ctx),
  };

  return callAI({ system: systems[type]||systems.default, prompt: prompts[type]||topic });
}

module.exports = { tutorChat, generate, TIME_URGENCY };
