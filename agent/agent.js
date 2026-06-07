const fetch = require('node-fetch');

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
  const exam = {
    college: `${ctx.college||'university'} ${ctx.branch||''}`.trim(),
    gate:    `GATE 2027 — ${ctx.branch||'IN'}`,
    jee:     'JEE / JEE Advanced',
    neet:    'NEET',
    boards:  'Class 11/12 Boards',
    upsc:    'UPSC Civil Services',
  }[ctx.goal] || 'exam';

  const tone = {
    extreme:  'ULTRA-CONCISE. Tonight only. No fluff.',
    high:     'Fast, high-yield content only.',
    medium:   'Balanced, focused, exam-relevant.',
    moderate: 'Thorough and engaging.',
    low:      'Deep and strategic.',
    relaxed:  'Comprehensive, full mastery.',
  }[mode.urgency] || 'Balanced.';

  const style = {
    'simple language': 'Use everyday words, no jargon, short sentences.',
    'formula first':   'Lead with the formula, then explain each variable, then example.',
    'step by step':    'Break into numbered steps. One concept per step.',
    'analogy mode':    'Use creative real-world analogies.',
    'socratic method': 'Guide with questions, make the student think.',
    'exam focused':    'Focus on what examiners test. Use exam language.',
  }[ctx.tutorMode||'simple language'] || 'Clear and concise.';

  return `You are Ameyay, a personal AI tutor for ${ctx.name||'Student'} preparing for ${exam}.
Time until exam: ${mode.short} (${mode.label}) — ${tone}
Explanation style: ${style}
Rules: Use **bold** for key terms, backticks for formulas. Be encouraging. Always relate to ${exam}. Keep responses focused.`;
}

// ── Try Claude API first (works on Render), then Ollama (works locally) ──
async function callAI({ system, messages, prompt }) {
  const msgs = prompt ? [{ role:'user', content:prompt }] : messages;

  // 1. Claude API — works on Render when ANTHROPIC_API_KEY is set
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.startsWith('sk-ant')) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system,
          messages: msgs,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log('[AI] Claude API ✓');
        return data.content[0].text;
      }
      const err = await res.json().catch(() => ({}));
      console.error('[AI] Claude error:', err.error?.message);
      // Don't throw — fall through to Ollama
    } catch (e) {
      console.error('[AI] Claude fetch failed:', e.message);
      // Fall through to Ollama
    }
  }

  // 2. Ollama — works locally on Mac
  try {
    const ollama = require('./ollama');
    const status = await ollama.checkOllama();
    if (status.running) {
      const model = await ollama.getBestModel();
      if (model) {
        const result = prompt
          ? await ollama.generate({ system, prompt })
          : await ollama.chat({ system, messages: msgs });
        console.log('[AI] Ollama ✓ model:', model);
        return result;
      }
    }
  } catch (e) {
    console.error('[AI] Ollama failed:', e.message);
  }

  // 3. Nothing available — clear error message
  throw new Error(
    apiKey
      ? 'Claude API key is set but failed. Check your key at console.anthropic.com'
      : 'No AI configured. Add ANTHROPIC_API_KEY to Render environment variables → Settings → Environment.'
  );
}

async function tutorChat({ message, history, ctx }) {
  const system = buildSystem(ctx);
  const messages = [...(history||[]).slice(-16), { role:'user', content:message }];
  return callAI({ system, messages });
}

async function generate({ type, topic, ctx, extra={} }) {
  const exam = {
    gate:'GATE IN 2027', jee:'JEE Advanced', neet:'NEET',
    upsc:'UPSC', boards:'Board Exam', college:'exam',
  }[ctx.goal] || 'exam';
  const mode = TIME_URGENCY[ctx.timeMode] || TIME_URGENCY.month;

  const prompts = {
    cheatsheet: `Create a ${mode.urgency==='extreme'?'crash':'concise'} cheat sheet for ${exam} on "${topic}".\n\n## ${topic} — Quick Reference\n### Key Formulas\n${mode.urgency==='extreme'?'Top 5 most critical only':'6-8 most important'}\n### Key Concepts\n3-4 bullet points\n### Exam Tips\n2-3 specific tips for ${exam}\n\nStudent has ${mode.short} until exam. Be concise.`,
    quiz:       `Generate exactly ${extra.count||10} MCQs for ${exam} on "${topic}". Difficulty: ${extra.difficulty||'moderate'}.\nReturn ONLY a valid JSON array, no markdown, no explanation:\n[{"q":"question text","opts":["A) option","B) option","C) option","D) option"],"ans":0,"exp":"explanation with formula"}]\nans = 0-based index of correct answer.`,
    studyplan:  `Create a ${mode.short} study plan for ${ctx.name||'student'} preparing for ${exam} (${ctx.branch||''}).\nBreak into daily sessions. Be specific with topics and time. Be realistic.`,
    notes:      `Create study notes for "${topic}" for ${exam}. Use markdown. Include key points and formulas.`,
    pyq:        `Give 5 previous year ${exam} questions on "${topic}" with complete step-by-step solutions.`,
    general:    topic,
  };

  const systems = {
    cheatsheet: 'You are an expert educator. Create clear, well-formatted study material using markdown.',
    quiz:       'You are a professional exam question setter. Return ONLY valid JSON arrays. No other text whatsoever.',
    default:    buildSystem(ctx),
  };

  return callAI({
    system: systems[type] || systems.default,
    prompt: prompts[type] || topic,
  });
}

module.exports = { tutorChat, generate, TIME_URGENCY };
