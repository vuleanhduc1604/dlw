/* ============================================================
   quizPage.js — standalone quiz.html logic.
   Reads session from sessionStorage, runs the quiz,
   handles MathQuill input, timer, submit and results.
   ============================================================ */

const QuizPage = {
  // Session data (loaded from sessionStorage)
  quizMeta:    null,
  settings:    null,
  questions:   [],

  // Runtime state
  current:     0,
  userAnswers: {},   // { q_id: answer }  TEXT answers are LaTeX strings from MathQuill
  submitted:   false,
  quizResults: null,

  // MathQuill instances keyed by question id
  mqFields:    {},

  // Timer
  timerInterval: null,
  secondsLeft:   0,

  /* ── Boot ───────────────────────────────────────────── */
  init() {
    const raw = sessionStorage.getItem(CONFIG.QUIZ_STORAGE_KEY);
    if (!raw) {
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666">
          <div style="text-align:center;gap:12px;display:flex;flex-direction:column">
            <div style="font-size:2rem">⚠️</div>
            <div>No quiz session found.<br>Please open a quiz from the dashboard.</div>
            <a href="quiz_setting.html" style="color:#1d4ed8">← Back to dashboard</a>
          </div>
        </div>`;
      return;
    }

    const session = JSON.parse(raw);
    QuizPage.quizMeta  = session.quizMeta;
    QuizPage.settings  = session.settings;
    QuizPage.questions = session.questions;

    // Set page title
    document.title = `${QuizPage.quizMeta.title} — QuizForge`;
    document.getElementById('qp-title').textContent = QuizPage.quizMeta.title;
    document.getElementById('qp-meta').textContent  =
      `${QuizPage.questions.length} questions · ${QuizPage.settings.difficulty}`;

    // Timer
    if (QuizPage.settings.timeLimitOn) {
      QuizPage.secondsLeft = QuizPage.settings.timeLimitMins * 60;
      QuizPage._startTimer();
    } else {
      document.getElementById('timer-chip').style.display = 'none';
    }

    QuizPage._buildDotList();
    QuizPage.renderQuestion();
  },

  /* ── Timer ──────────────────────────────────────────── */
  _startTimer() {
    QuizPage._renderTimer();
    QuizPage.timerInterval = setInterval(() => {
      QuizPage.secondsLeft--;
      QuizPage._renderTimer();
      if (QuizPage.secondsLeft <= 0) {
        clearInterval(QuizPage.timerInterval);
        QuizPage.submit(true); // auto-submit
      }
    }, 1000);
  },

  _renderTimer() {
    const s   = QuizPage.secondsLeft;
    const mm  = String(Math.floor(s / 60)).padStart(2, '0');
    const ss  = String(s % 60).padStart(2, '0');
    const chip = document.getElementById('timer-chip');
    chip.querySelector('span').textContent = `${mm}:${ss}`;
    chip.className = 'timer-chip';
    if (s <= 60)  chip.classList.add('danger');
    else if (s <= 180) chip.classList.add('warning');
  },

  /* ── Render question ────────────────────────────────── */
  renderQuestion() {
    const q     = QuizPage.questions[QuizPage.current];
    const total = QuizPage.questions.length;
    const done  = Object.keys(QuizPage.userAnswers).length;

    // Progress
    const pct = Math.round((done / total) * 100);
    document.getElementById('qp-prog-fill').style.width  = pct + '%';
    document.getElementById('qp-prog-pct').textContent   = pct + '%';
    document.getElementById('qp-prog-label').textContent = `Question ${QuizPage.current + 1} of ${total}`;

    // Buttons
    document.getElementById('qp-btn-prev').disabled = QuizPage.current === 0;
    const isLast = QuizPage.current === total - 1;
    document.getElementById('qp-btn-next').style.display   = (!QuizPage.submitted && isLast) ? 'none' : '';
    document.getElementById('qp-btn-submit').style.display = (!QuizPage.submitted && isLast) ? '' : 'none';
    document.getElementById('qp-footer-hint').textContent  =
      QuizPage.submitted ? '' : (CONFIG.HINTS[q.type] || '');

    // Build card
    const panel = document.getElementById('q-panel');
    panel.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'q-card q-animate';

    // Meta
    const meta = document.createElement('div');
    meta.className = 'q-meta';
    meta.innerHTML = `
      <span class="q-badge ${q.type.toLowerCase()}">${CONFIG.TYPE_LABELS[q.type]}</span>
      ${q.isRevisit ? '<span class="q-badge revisit">↩ Revisit</span>' : ''}
      <span class="q-num">Q${QuizPage.current + 1} / ${total}</span>`;
    card.appendChild(meta);

    // Question text
    const qText = document.createElement('div');
    qText.className = 'q-text';
    qText.innerHTML = QuizPage._esc(q.text);
    card.appendChild(qText);

    // Code snippet
    if (q.code_snippet) {
      const cw = document.createElement('div');
      cw.className = 'code-wrap';
      cw.innerHTML = `<pre><code class="language-python">${QuizPage._esc(q.code_snippet)}</code></pre>`;
      card.appendChild(cw);
    }

    // Reference
    if (q.reference) {
      const ref = document.createElement('span');
      ref.className = 'q-reference';
      ref.textContent = `↗ ${q.reference}`;
      card.appendChild(ref);
    }

    // Answer area
    card.appendChild(QuizPage._buildAnswer(q));

    // Model answer (post-submit, TEXT only)
    if (QuizPage.submitted && q.type === 'TEXT') {
      const ma = document.createElement('div');
      ma.className = 'model-answer-box show';
      ma.innerHTML = `<strong>Model Answer</strong>`;
      // Render model answer as LaTeX
      const maLatex = document.createElement('span');
      maLatex.textContent = q.answer;
      ma.appendChild(maLatex);
      card.appendChild(ma);

      if (QuizPage.quizResults?.results?.[q.id]) {
        const sc   = QuizPage.quizResults.results[q.id].score;
        const chip = document.createElement('div');
        chip.className = `score-chip ${sc >= CONFIG.SHORT_ANSWER_PASS ? 'good' : 'bad'}`;
        chip.textContent = `Score: ${sc}/10`;
        card.appendChild(chip);
      }
    }

    panel.appendChild(card);
    QuizPage._updateDotList();

    // Render math + code
    setTimeout(() => {
      if (window.renderMathInElement) {
        try {
          renderMathInElement(panel, {
            delimiters: [
              { left:'$$', right:'$$', display:true  },
              { left:'$',  right:'$',  display:false },
              { left:'\\(', right:'\\)', display:false },
              { left:'\\[', right:'\\]', display:true  },
            ],
            throwOnError: false,
          });
        } catch(e) {}
      }
      panel.querySelectorAll('pre code:not(.hljs)').forEach(el => hljs.highlightElement(el));

      // Init MathQuill after DOM is ready
      if (q.type === 'TEXT' && !QuizPage.submitted) {
        QuizPage._initMathQuill(q);
      }
    }, 60);
  },

  /* ── Build answer area ──────────────────────────────── */
  _buildAnswer(q) {
    if (q.type === 'MCQ' || q.type === 'TF') return QuizPage._buildOptions(q);
    if (q.type === 'MULTI')                  return QuizPage._buildMulti(q);
    return QuizPage._buildMathQuillField(q);
  },

  _buildOptions(q) {
    const ua   = QuizPage.userAnswers[q.id];
    const list = document.createElement('div');
    list.className = 'options-list';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'opt'; btn.disabled = QuizPage.submitted;
      if (QuizPage.submitted) {
        if (idx === q.answer)     btn.classList.add('correct');
        else if (idx === ua)      btn.classList.add('wrong');
      } else if (idx === ua)      btn.classList.add('selected');
      btn.innerHTML = `<span class="opt-letter">${'ABCDE'[idx]}</span>
                       <span class="opt-text">${QuizPage._esc(opt)}</span>`;
      if (!QuizPage.submitted) {
        btn.addEventListener('click', () => {
          QuizPage.userAnswers[q.id] = idx;
          QuizPage.renderQuestion();
        });
      }
      list.appendChild(btn);
    });
    return list;
  },

  _buildMulti(q) {
    const ua  = QuizPage.userAnswers[q.id];
    const sel = Array.isArray(ua) ? ua : [];
    const cor = Array.isArray(q.answer) ? q.answer : [q.answer];
    const list = document.createElement('div');
    list.className = 'options-list';
    q.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'opt'; btn.disabled = QuizPage.submitted;
      if (QuizPage.submitted) {
        if (cor.includes(idx))       btn.classList.add('correct');
        else if (sel.includes(idx))  btn.classList.add('wrong');
      } else if (sel.includes(idx))  btn.classList.add('selected');
      const chk = sel.includes(idx) || (QuizPage.submitted && cor.includes(idx));
      btn.innerHTML = `<span class="opt-check">${chk ? '✓' : ''}</span>
                       <span class="opt-text">${QuizPage._esc(opt)}</span>`;
      if (!QuizPage.submitted) {
        btn.addEventListener('click', () => {
          const cur = Array.isArray(QuizPage.userAnswers[q.id])
            ? [...QuizPage.userAnswers[q.id]] : [];
          const i = cur.indexOf(idx);
          i >= 0 ? cur.splice(i, 1) : cur.push(idx);
          QuizPage.userAnswers[q.id] = cur;
          QuizPage.renderQuestion();
        });
      }
      list.appendChild(btn);
    });
    return list;
  },

  /* ── MathQuill field ────────────────────────────────── */
  _buildMathQuillField(q) {
    const wrap = document.createElement('div');
    wrap.className = 'mathquill-wrap';

    const label = document.createElement('div');
    label.className = 'mathquill-label';
    label.textContent = 'Your answer';
    wrap.appendChild(label);

    // Placeholder div that MathQuill will take over
    const mqContainer = document.createElement('div');
    mqContainer.id = `mq-${q.id}`;
    mqContainer.className = 'mq-field-target';
    wrap.appendChild(mqContainer);

    // Hint
    const hint = document.createElement('div');
    hint.className = 'mathquill-hint';
    hint.innerHTML = `
      Type normally or use LaTeX:
      <code>^</code> superscript,
      <code>_</code> subscript,
      <code>\\frac</code> fraction,
      <code>\\sqrt</code> square root,
      <code>\\int</code> integral`;
    wrap.appendChild(hint);

    return wrap;
  },

  /* ── MathQuill initialisation ───────────────────────── */
  _initMathQuill(q) {
    if (!window.MathQuill) {
      console.warn('MathQuill not loaded');
      return;
    }

    const MQ  = MathQuill.getInterface(2);
    const el  = document.getElementById(`mq-${q.id}`);
    if (!el) return;

    // If already initialised, reuse
    if (QuizPage.mqFields[q.id]) {
      try { QuizPage.mqFields[q.id].focus(); } catch(e) {}
      return;
    }

    const mf = MQ.MathField(el, {
      spaceBehavesLikeTab: false,
      handlers: {
        edit: () => {
          QuizPage.userAnswers[q.id] = mf.latex();
        },
      },
    });

    // Restore saved answer
    const saved = QuizPage.userAnswers[q.id];
    if (saved) {
      try { mf.latex(saved); } catch(e) {}
    }

    QuizPage.mqFields[q.id] = mf;
    mf.focus();
  },

  /* ── Navigation ─────────────────────────────────────── */
  navigate(dir) {
    // Capture MathQuill value before leaving
    const q = QuizPage.questions[QuizPage.current];
    if (q.type === 'TEXT' && QuizPage.mqFields[q.id]) {
      QuizPage.userAnswers[q.id] = QuizPage.mqFields[q.id].latex();
    }

    const next = QuizPage.current + dir;
    if (next < 0 || next >= QuizPage.questions.length) return;
    QuizPage.current = next;
    QuizPage.renderQuestion();
    document.getElementById('q-panel').scrollTop = 0;
  },

  jumpTo(idx) {
    const q = QuizPage.questions[QuizPage.current];
    if (q.type === 'TEXT' && QuizPage.mqFields[q.id]) {
      QuizPage.userAnswers[q.id] = QuizPage.mqFields[q.id].latex();
    }
    QuizPage.current = idx;
    QuizPage.renderQuestion();
  },

  /* ── Submit ─────────────────────────────────────────── */
  async submit(autoSubmit = false) {
    // Capture current MathQuill value
    const q = QuizPage.questions[QuizPage.current];
    if (q.type === 'TEXT' && QuizPage.mqFields[q.id]) {
      QuizPage.userAnswers[q.id] = QuizPage.mqFields[q.id].latex();
    }

    if (!autoSubmit) {
      const answeredCount = Object.keys(QuizPage.userAnswers).length;
      const unanswered    = QuizPage.questions.length - answeredCount;
      if (unanswered > 0) {
        const ok = confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
        if (!ok) return;
      }
    }

    clearInterval(QuizPage.timerInterval);

    const btn = document.getElementById('qp-btn-submit');
    btn.disabled = true; btn.textContent = 'Grading…';

    const res = await apiSubmitAnswers(
      QuizPage.quizMeta.id,
      QuizPage.userAnswers,
      QuizPage.questions
    );

    QuizPage.submitted   = true;
    QuizPage.quizResults = res;

    QuizPage._showResults(res);
  },

  /* ── Results ────────────────────────────────────────── */
  _showResults(res) {
    document.getElementById('res-score').textContent = res.score_pct + '%';
    document.getElementById('res-correct').textContent = res.correct;
    document.getElementById('res-wrong').textContent   = res.total - res.correct;
    document.getElementById('res-total').textContent   = res.total;
    document.getElementById('results-overlay').classList.add('show');
  },

  reviewAnswers() {
    document.getElementById('results-overlay').classList.remove('show');
    // Jump to first wrong question
    const firstWrong = QuizPage.questions.findIndex(q =>
      !QuizPage.quizResults.results[q.id]?.correct);
    QuizPage.current = firstWrong >= 0 ? firstWrong : 0;
    QuizPage.renderQuestion();
    QuizPage._updateDotList();
  },

  async retry() {
    const fresh = await apiRetryQuiz(
      QuizPage.quizMeta.id,
      QuizPage.quizMeta,
      QuizPage.settings
    );

    QuizPage.questions   = fresh;
    QuizPage.current     = 0;
    QuizPage.userAnswers = {};
    QuizPage.submitted   = false;
    QuizPage.quizResults = null;
    QuizPage.mqFields    = {};

    document.getElementById('results-overlay').classList.remove('show');
    document.getElementById('qp-btn-submit').disabled    = false;
    document.getElementById('qp-btn-submit').textContent = 'Submit ✓';

    // Restart timer
    if (QuizPage.settings.timeLimitOn) {
      clearInterval(QuizPage.timerInterval);
      QuizPage.secondsLeft = QuizPage.settings.timeLimitMins * 60;
      document.getElementById('timer-chip').style.display = '';
      QuizPage._startTimer();
    }

    QuizPage._buildDotList();
    QuizPage.renderQuestion();
  },

  /* ── Dot list ───────────────────────────────────────── */
  _buildDotList() {
    const grid = document.getElementById('q-dot-list');
    grid.innerHTML = '';
    QuizPage.questions.forEach((q, i) => {
      const btn = document.createElement('button');
      btn.id        = `qdot-${q.id}`;
      btn.className = 'q-dot-btn';
      btn.innerHTML = `<span class="qdot-status"></span> Question ${i + 1}`;
      btn.addEventListener('click', () => QuizPage.jumpTo(i));
      grid.appendChild(btn);
    });
  },

  _updateDotList() {
    QuizPage.questions.forEach((q, i) => {
      const dot = document.getElementById(`qdot-${q.id}`);
      if (!dot) return;
      dot.className = 'q-dot-btn';
      if (i === QuizPage.current) dot.classList.add('active');
      if (QuizPage.submitted && QuizPage.quizResults?.results?.[q.id]) {
        dot.classList.add(QuizPage.quizResults.results[q.id].correct ? 'correct-dot' : 'wrong-dot');
      } else if (QuizPage.userAnswers[q.id] !== undefined) {
        dot.classList.add('answered');
      }
    });
  },

  /* ── Theme ──────────────────────────────────────────── */
  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
    document.getElementById('qp-theme-btn').textContent = isDark ? '🌙' : '☀️';
  },

  /* ── Utility ────────────────────────────────────────── */
  _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  },
};
