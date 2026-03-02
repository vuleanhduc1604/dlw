/* ============================================================
   dashboard.js — quiz list rendering and filter logic
   ============================================================ */

const Dashboard = {
  allQuizzes:   [],
  activeFilter: 'all',

  async init() {
    Dashboard.allQuizzes = await apiGetQuizzes();
    Dashboard.render();
  },

  setFilter(filter) {
    Dashboard.activeFilter = filter;
    document.querySelectorAll('.sidebar-item').forEach(el =>
      el.classList.toggle('active', el.dataset.filter === filter));
    Dashboard.render();
  },

  render() {
    const list = document.getElementById('quiz-list');
    list.innerHTML = '';

    const filtered = Dashboard.activeFilter === 'all'
      ? Dashboard.allQuizzes
      : Dashboard.allQuizzes.filter(q => q.status === Dashboard.activeFilter);

    document.getElementById('list-subtitle').textContent =
      `${filtered.length} quiz${filtered.length !== 1 ? 'zes' : ''}`;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <h3>No quizzes here</h3>
        <p>Upload a document to generate your first quiz.</p>
      </div>`;
      return;
    }

    filtered.forEach((q, i) => list.appendChild(Dashboard._buildRow(q, i)));
  },

  _buildRow(q, index) {
    const row = document.createElement('button');
    row.className = 'quiz-row';
    row.style.animationDelay = (index * 0.05) + 's';

    const scoreClass = q.score === null ? 'unseen'
      : q.score >= 80 ? 'high' : q.score >= 60 ? 'mid' : 'low';

    const scoreHtml = q.score !== null
      ? `<div class="score-num ${scoreClass}">${q.score}%</div>
         <div class="score-sub">${q.correct}/${q.total} correct</div>`
      : `<div class="score-num unseen">—</div>
         <div class="score-sub">Not taken</div>`;

    const statusText = { done:'✓ Completed', pending:'⏸ In Progress', new:'✦ New' }[q.status];

    row.innerHTML = `
      <div class="quiz-row-icon ${q.color}">${q.icon}</div>
      <div class="quiz-row-info">
        <div class="quiz-row-title">${q.title}</div>
        <div class="quiz-row-meta">
          <span>📚 ${q.subject}</span>
          <span>❓ ${q.numQuestions} questions</span>
          <span>🎯 ${q.difficulty}</span>
          <span>🗓 ${q.date}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
        <span class="status-pill ${q.status}">${statusText}</span>
        <div class="quiz-row-score">${scoreHtml}</div>
      </div>
      <span class="quiz-row-arrow">›</span>`;

    row.addEventListener('click', () => Settings.open(q));
    return row;
  },
};
