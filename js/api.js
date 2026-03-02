/* ============================================================
   api.js — ALL backend interactions.

   ENDPOINTS:
     GET  /quizzes          → apiGetQuizzes()
     POST /quiz             → apiOpenQuiz()
     POST /quiz/answer      → apiSubmitAnswers()
     POST /quiz/retry       → apiRetryQuiz()

   TO CONNECT: uncomment realFetch() calls, delete mock returns.
   ============================================================ */

async function apiGetQuizzes() {
  console.log('[TODO] GET /quizzes');
  // return await realFetch('/quizzes', null, 'GET');
  return MOCK_QUIZZES;
}

/**
 * POST /quiz
 * Body:     { quiz_id, settings: { numQuestions, difficulty, types, timeLimitMins } }
 * Response: { quiz_id, questions: Question[] }
 */
async function apiOpenQuiz(quizMeta, settings) {
  console.log('[TODO] POST /quiz', { quiz_id: quizMeta.id, settings });
  // return await realFetch('/quiz', { quiz_id: quizMeta.id, settings });

  // Apply mock filtering by type
  let qs = [...quizMeta.questions_data];
  if (settings.types && settings.types.length) {
    qs = qs.filter(q => settings.types.includes(q.type));
  }
  // Limit to numQuestions
  qs = qs.slice(0, settings.numQuestions || qs.length);
  return qs;
}

/**
 * POST /quiz/answer
 * Body:     { quiz_id, answers: { [q_id]: answer } }
 * Response: { score_pct, correct, total, results: { [q_id]: { correct, score } } }
 */
async function apiSubmitAnswers(quiz_id, answers, questions) {
  console.log('[TODO] POST /quiz/answer', { quiz_id, answers });
  // return await realFetch('/quiz/answer', { quiz_id, answers });
  return _mockGrade(answers, questions);
}

/**
 * POST /quiz/retry
 * Body:     { quiz_id }
 * Response: { questions: Question[] }
 */
async function apiRetryQuiz(quiz_id, quizMeta, settings) {
  console.log('[TODO] POST /quiz/retry', { quiz_id });
  // return await realFetch('/quiz/retry', { quiz_id });
  return apiOpenQuiz(quizMeta, settings);
}

/* ── Mock grading ── */
function _mockGrade(answers, questions) {
  let correct = 0;
  const results = {};
  questions.forEach(q => {
    const ua = answers[q.id];
    let isCorrect = false;
    if (q.type === 'MULTI') {
      const us = Array.isArray(ua) ? [...ua].sort().join(',') : '';
      const cs = Array.isArray(q.answer) ? [...q.answer].sort().join(',') : '';
      isCorrect = us === cs;
    } else if (q.type === 'TEXT') {
      isCorrect = typeof ua === 'string' && ua.replace(/\s/g,'').length > 2;
    } else {
      isCorrect = ua === q.answer;
    }
    if (isCorrect) correct++;
    results[q.id] = { correct: isCorrect, score: isCorrect ? 10 : 0 };
  });
  const score_pct = questions.length
    ? Math.round((correct / questions.length) * 1000) / 10
    : 0;
  return { score_pct, correct, total: questions.length, results };
}

/* ── Real fetch helper (uncomment to use) ──────────────────
async function realFetch(path, body = null, method = 'POST') {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
─────────────────────────────────────────────────────────── */
