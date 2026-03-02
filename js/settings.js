/* ============================================================
   settings.js — quiz settings panel (shown on index.html
   when a quiz row is clicked). Collects config then opens
   quiz.html in a new tab with the session via sessionStorage.
   ============================================================ */

const Settings = {
  quizMeta: null,

  // Current settings state
  cfg: {
    numQuestions: 10,
    difficulty:   'Mixed',
    types:        ['MCQ', 'TF', 'MULTI', 'TEXT'],
    timeLimitOn:  false,
    timeLimitMins: 15,
  },

  /* ── Open panel ─────────────────────────────────────── */
  open(quizMeta) {
    Settings.quizMeta = quizMeta;

    // Reset to defaults
    Settings.cfg = {
      numQuestions:  Math.min(10, quizMeta.questions_data.length),
      difficulty:    'Mixed',
      types:         ['MCQ', 'TF', 'MULTI', 'TEXT'],
      timeLimitOn:   false,
      timeLimitMins: 15,
    };

    document.getElementById('sp-title').textContent = quizMeta.title;
    document.getElementById('sp-sub').textContent   =
      `${quizMeta.subject} · ${quizMeta.numQuestions} questions available`;

    Settings._syncUI();
    document.getElementById('settings-overlay').classList.add('open');
  },

  /* ── Close panel ────────────────────────────────────── */
  close() {
    document.getElementById('settings-overlay').classList.remove('open');
  },

  /* ── Sync all UI controls to cfg ────────────────────── */
  _syncUI() {
    // Num questions stepper
    document.getElementById('sp-num-val').textContent = Settings.cfg.numQuestions;

    // Difficulty seg
    document.querySelectorAll('.seg-btn[data-diff]').forEach(b => {
      b.classList.toggle('active', b.dataset.diff === Settings.cfg.difficulty);
    });

    // Type chips
    document.querySelectorAll('.type-chip[data-type]').forEach(c => {
      c.classList.toggle('active', Settings.cfg.types.includes(c.dataset.type));
    });

    // Time toggle
    const tog = document.getElementById('sp-time-toggle');
    if (tog) tog.checked = Settings.cfg.timeLimitOn;
    const timeRow = document.getElementById('sp-time-input-row');
    if (timeRow) timeRow.style.display = Settings.cfg.timeLimitOn ? 'flex' : 'none';
    document.getElementById('sp-time-val').value = Settings.cfg.timeLimitMins;

    Settings._updateSummary();
  },

  /* ── Update summary line ─────────────────────────────── */
  _updateSummary() {
    const typeLabels = { MCQ:'MCQ', TF:'T/F', MULTI:'Multi', TEXT:'Short answer' };
    const typeStr = Settings.cfg.types.map(t => typeLabels[t]).join(', ') || 'None';
    const timeStr = Settings.cfg.timeLimitOn
      ? ` · ⏱ ${Settings.cfg.timeLimitMins} min`
      : '';
    document.getElementById('sp-summary').innerHTML =
      `<strong>${Settings.cfg.numQuestions} questions</strong>, ` +
      `<strong>${Settings.cfg.difficulty}</strong> difficulty, ` +
      `${typeStr}${timeStr}`;
  },

  /* ── Stepper ─────────────────────────────────────────── */
  stepNum(delta) {
    const max = Settings.quizMeta?.questions_data?.length || 50;
    Settings.cfg.numQuestions = Math.min(max, Math.max(1, Settings.cfg.numQuestions + delta));
    document.getElementById('sp-num-val').textContent = Settings.cfg.numQuestions;
    Settings._updateSummary();
  },

  /* ── Difficulty ──────────────────────────────────────── */
  setDifficulty(val) {
    Settings.cfg.difficulty = val;
    document.querySelectorAll('.seg-btn[data-diff]').forEach(b =>
      b.classList.toggle('active', b.dataset.diff === val));
    Settings._updateSummary();
  },

  /* ── Question type chips ─────────────────────────────── */
  toggleType(type) {
    const i = Settings.cfg.types.indexOf(type);
    if (i >= 0) {
      // Don't allow deselecting last type
      if (Settings.cfg.types.length === 1) return;
      Settings.cfg.types.splice(i, 1);
    } else {
      Settings.cfg.types.push(type);
    }
    document.querySelectorAll('.type-chip[data-type]').forEach(c =>
      c.classList.toggle('active', Settings.cfg.types.includes(c.dataset.type)));
    Settings._updateSummary();
  },

  /* ── Time limit toggle ───────────────────────────────── */
  toggleTime(checked) {
    Settings.cfg.timeLimitOn = checked;
    document.getElementById('sp-time-input-row').style.display = checked ? 'flex' : 'none';
    Settings._updateSummary();
  },

  setTimeMins(val) {
    Settings.cfg.timeLimitMins = Math.max(1, parseInt(val) || 15);
    Settings._updateSummary();
  },

  /* ── Launch quiz in new tab ──────────────────────────── */
  async launch() {
    const session = {
      quizMeta: Settings.quizMeta,
      settings: { ...Settings.cfg },
      // Load and filter questions now, store in session
      questions: await apiOpenQuiz(Settings.quizMeta, Settings.cfg),
    };

    // Pass data to new tab via sessionStorage
    // (same origin only — fine for same-domain deployment)
    sessionStorage.setItem(CONFIG.QUIZ_STORAGE_KEY, JSON.stringify(session));

    window.open('quiz.html', '_blank');
    Settings.close();
  },
};
