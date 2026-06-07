const ollama = require('./ollama');

const TIME_URGENCY = {
  night:        { label: '😤 Survival Mode', urgency: 'extreme',  short: '1 Night'   },
  week:         { label: '⚡ Rush Mode',      urgency: 'high',     short: '1 Week'    },
  month:        { label: '🔥 Grind Mode',     urgency: 'medium',   short: '1 Month'   },
  three_months: { label: '💪 Prep Mode',      urgency: 'moderate', short: '3 Months'  },
  six_months:   { label: '🎯 Strategy Mode',  urgency: 'low',      short: '6 Months'  },
  year:         { label: '🏆 Champion Mode',  urgency: 'relaxed',  short: '1 Year+'   },
};

// Build personalised system prompt for a student
function buildTutorPrompt(ctx) {
  const mode = TIME_URGENCY[ctx.timeMode] || TIME_URGENCY.month;
  const exam = {
    college: `${ctx.college || 'university'} ${ctx.branch || 'engineering'} curriculum`,
    gate:    `GATE 2027 — ${ctx.branch || 'Engineering'}`,
    jee:     'JEE / JEE Advanced (Physics, Chemistry, Mathematics)',
    neet:    'NEET (Biology, Physics, Chemistry)',
    boards:  'Class 11/12 Board Exams',
    upsc:    'UPSC Civil Services Examination',
  }[ctx.goal] || `${ctx.goal || 'exam'} preparation`;

  const urgencyTone = {
    extreme:  'Be ULTRA-CONCISE. Tonight only. Max 3-4 sentences per point. No fluff. Only exam-critical content.',
    high:     'Be fast and focused. Prioritise high-yield content. Short, punchy explanations.',
    medium:   'Be balanced and clear. Cover topics properly but stay focused and exam-relevant.',
    moderate: 'Be thorough and engaging. Build genuine understanding alongside exam skills.',
    low:      'Be deep and strategic. Cover concepts from first principles when useful.',
    relaxed:  'Be comprehensive and patient. Build mastery from fundamentals to advanced level.',
  }[mode.urgency];

  return `You are Ameyay, a dedicated personal AI tutor for ${ctx.name || 'a student'} preparing for ${exam}.

STUDENT PROFILE:
- Name: ${ctx.name || 'Student'}
- College: ${ctx.college || 'Independent learner'}
- Branch: ${ctx.branch || 'General'}
- Time Mode: ${mode.label} — ${mode.short} until exam (urgency: ${mode.urgency})
- Explanation mode: ${ctx.tutorMode || 'simple language'}

EXPLANATION STYLE for ${ctx.tutorMode || 'simple language'}:
${getExplanationStyle(ctx.tutorMode)}

URGENCY INSTRUCTION: ${urgencyTone}

RULES:
- Always personalize to this student's exam (${exam})
- Use **bold** for key terms, use backticks for formulas/code
- Number steps for procedures
- Mention previous year exam questions when relevant
- Be encouraging — flag weak areas constructively
- Never give generic textbook answers — always make it exam-relevant
- Keep responses focused and not overly long`;
}

function getExplanationStyle(mode) {
  const styles = {
    'simple language': 'Use everyday words. Avoid jargon. Explain as if talking to a friend. Short sentences.',
    'formula first':   'Lead with the key formula. Then explain each variable. Then show a worked example.',
    'step by step':    'Break everything into numbered steps. One concept per step. No skipping.',
    'analogy mode':    'Use real-world analogies and comparisons to explain abstract concepts. Be creative.',
    'socratic method': 'Guide the student with questions instead of direct answers. Make them think.',
    'exam focused':    'Focus on what examiners actually test. Use exam language. Reference marking schemes.',
  };
  return styles[mode] || styles['simple language'];
}

// Build prompt for cheat sheet generation
function buildCheatSheetPrompt(ctx, topic) {
  const mode = TIME_URGENCY[ctx.timeMode] || TIME_URGENCY.month;
  const exam = {
    college: 'university exam',
    gate:    'GATE 2027',
    jee:     'JEE Advanced',
    neet:    'NEET',
    boards:  'Board Exam',
    upsc:    'UPSC',
  }[ctx.goal] || 'exam';

  const depth = mode.urgency === 'extreme' ? 'TOP 5 most critical formulas only. Tonight-focused.' :
                mode.urgency === 'high'    ? '6-8 most important formulas. High-yield only.' :
                                             '8-12 formulas. Complete reference.';

  return `Create a ${mode.urgency === 'extreme' ? 'crash' : 'concise'} cheat sheet for ${exam} on: "${topic}".

FORMAT (use markdown):
## ${topic} — ${mode.urgency === 'extreme' ? "Tonight's Crash Sheet" : 'Quick Reference'}

### Key Formulas
${depth}

### Must-Know Concepts  
3-4 bullet points. Most exam-critical only.

### ${mode.urgency === 'extreme' ? '⚡ Tonight Focus' : 'Exam Tips'}
2-3 specific tips for this topic in ${exam}.

### Common Mistakes
2 mistakes students make.

Be concise. Student has ${mode.short} until exam.`;
}

// Build prompt for quiz generation
function buildQuizPrompt({ topic, count, difficulty, exam }) {
  return `Generate exactly ${count} multiple-choice questions for ${exam || 'exam'} on: "${topic}". Difficulty: ${difficulty}.

Return ONLY a valid JSON array. No markdown, no code fences, no explanation text:
[
  {
    "q": "Complete question text here",
    "opts": ["A) first option", "B) second option", "C) third option", "D) fourth option"],
    "ans": 0,
    "exp": "Clear explanation of the correct answer with the key formula or concept."
  }
]

Rules:
- ans is 0-based index (0=A, 1=B, 2=C, 3=D)
- Make questions exam-style and realistic
- Include formulas in explanations
- Make all four options plausible
- Cover different sub-topics within "${topic}"
- No duplicate questions`;
}

// Build study plan prompt
function buildStudyPlanPrompt(ctx) {
  const mode = TIME_URGENCY[ctx.timeMode] || TIME_URGENCY.month;
  return `Create a complete, personalised study plan for ${ctx.name || 'the student'} preparing for ${ctx.exam || 'their exam'}.

Time available: ${mode.short} (${mode.label})
Branch: ${ctx.branch || 'General'}
Current progress: approximately 40% of syllabus covered

Create a realistic day-by-day (for short timelines) or week-by-week (for longer timelines) plan.
Include: topic names, estimated time per session, revision checkpoints, and mock test schedule.
Format clearly with headers. Be specific and actionable.`;
}

// Main agent chat function
async function tutorChat({ message, history, ctx }) {
  const system = buildTutorPrompt(ctx);
  const messages = [
    ...(history || []).slice(-16).map(h => ({
      role: h.role,
      content: typeof h.content === 'string' ? h.content : JSON.stringify(h.content),
    })),
    { role: 'user', content: message },
  ];

  const reply = await ollama.chat({ system, messages });
  return reply;
}

// Generate content (cheat sheets, plans, etc.)
async function generate({ type, topic, ctx, extra = {} }) {
  let prompt;
  let system = 'You are Ameyay, an expert AI tutor. Be clear, concise, and exam-focused.';

  switch (type) {
    case 'cheatsheet':
      prompt = buildCheatSheetPrompt(ctx, topic);
      system = 'You are an expert educator. Create clear, well-formatted study material using markdown.';
      break;
    case 'quiz':
      prompt = buildQuizPrompt({ topic, count: extra.count || 10, difficulty: extra.difficulty || 'moderate', exam: extra.exam });
      system = 'You are a professional exam question setter. Return ONLY valid JSON arrays. No other text.';
      break;
    case 'studyplan':
      prompt = buildStudyPlanPrompt({ ...ctx, exam: extra.exam });
      system = 'You are an expert academic coach. Create detailed, realistic study plans.';
      break;
    case 'notes':
      prompt = `Create comprehensive but concise study notes for "${topic}" for ${extra.exam || 'exam'}. Use markdown with clear headings, key points, and formulas.`;
      break;
    case 'pyq':
      prompt = `Give me 5 previous year exam questions from ${extra.exam || 'competitive exams'} on "${topic}". For each: show the question, the correct answer, and a step-by-step solution.`;
      break;
    default:
      prompt = topic;
  }

  const content = await ollama.generate({ system, prompt });
  return content;
}

module.exports = { tutorChat, generate, buildTutorPrompt, TIME_URGENCY };
