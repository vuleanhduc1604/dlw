/* ============================================================
   config.js — app-wide constants
   ============================================================ */
const CONFIG = {
  API_BASE: 'http://localhost:8000', // TODO: update to real backend

  SHORT_ANSWER_PASS: 6, // score out of 10 considered "correct"

  HINTS: {
    MCQ:   'Select one answer',
    TF:    'True or False?',
    MULTI: 'Select all that apply',
    TEXT:  'Enter your answer using the math editor',
  },

  TYPE_LABELS: {
    MCQ:   'Multiple Choice',
    TF:    'True / False',
    MULTI: 'Multiple Answers',
    TEXT:  'Short Answer',
  },

  // Key used to pass settings from index → quiz.html via sessionStorage
  QUIZ_STORAGE_KEY: 'quizforge_session',
};
