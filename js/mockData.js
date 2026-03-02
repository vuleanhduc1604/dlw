/* ============================================================
   mockData.js — sample data. DELETE once backend is live.
   ============================================================ */

const MOCK_QUIZZES = [
  {
    id: 'q001', title: 'Cardiology Quiz', subject: 'Medicine',
    numQuestions: 20, difficulty: 'Medium', status: 'done',
    score: 83.3, correct: 5, total: 6,
    date: '2 Mar 2025', icon: '🫀', color: 'blue',
    questions_data: _makeCardiologyQs(),
  },
  {
    id: 'q002', title: 'Calculus — Integration', subject: 'Mathematics',
    numQuestions: 15, difficulty: 'Hard', status: 'done',
    score: 66.7, correct: 10, total: 15,
    date: '1 Mar 2025', icon: '∫', color: 'orange',
    questions_data: _makeCalcQs(),
  },
  {
    id: 'q003', title: 'Python Fundamentals', subject: 'Computer Science',
    numQuestions: 12, difficulty: 'Easy', status: 'pending',
    score: null, correct: null, total: null,
    date: '28 Feb 2025', icon: '🐍', color: 'green',
    questions_data: _makePythonQs(),
  },
  {
    id: 'q004', title: 'Organic Chemistry', subject: 'Chemistry',
    numQuestions: 18, difficulty: 'Hard', status: 'new',
    score: null, correct: null, total: null,
    date: '27 Feb 2025', icon: '⚗️', color: 'yellow',
    questions_data: _makeChemQs(),
  },
];

function _makeCardiologyQs() {
  return [
    { id:'cq1', type:'MCQ', format:'TEXT', slide_refs:[7],
      text:'A 62-year-old man presents with nocturia, hesitancy and terminal dribbling. PSA 1.3 ng/ml. What is the most appropriate management?',
      reference:'BPH — Slide 7',
      options:['Alpha-1 antagonist','5 alpha-reductase inhibitor','Non-urgent TURP referral','Ciprofloxacin 2 weeks','Urgent urology referral'],
      answer:0 },
    { id:'cq2', type:'TF', format:'TEXT', slide_refs:[3],
      text:'Atrial fibrillation is the most common sustained cardiac arrhythmia and significantly increases stroke risk.',
      reference:'Arrhythmias — Slide 3',
      options:['True','False'], answer:0 },
    { id:'cq3', type:'MULTI', format:'TEXT', slide_refs:[2,4],
      text:'Which are recognised risk factors for acute coronary syndrome? (Select all that apply)',
      reference:'ACS — Slides 2–4',
      options:['Hypertension','Regular moderate exercise','Hyperlipidaemia','Type 2 diabetes mellitus'],
      answer:[0,2,3] },
    { id:'cq4', type:'TEXT', format:'LATEX', slide_refs:[11],
      text:'Using $SVR = \\frac{MAP - CVP}{CO} \\times 80$, calculate SVR for MAP=100 mmHg, CVP=4 mmHg, CO=5 L/min.',
      reference:'Haemodynamics — Slide 11',
      options:[], answer:'SVR = \\frac{100-4}{5} \\times 80 = 1536' },
  ];
}

function _makeCalcQs() {
  return [
    { id:'mq1', type:'MCQ', format:'LATEX', slide_refs:[1],
      text:'Evaluate $\\int_0^1 x^2 \\, dx$.',
      reference:'Definite Integrals — Slide 1',
      options:['$\\frac{1}{4}$','$\\frac{1}{3}$','$\\frac{1}{2}$','$1$'], answer:1 },
    { id:'mq2', type:'TEXT', format:'LATEX', slide_refs:[3],
      text:'Find the general solution to $\\frac{dy}{dx} = 2x + 3$.',
      reference:'ODEs — Slide 3',
      options:[], answer:'y = x^2 + 3x + C' },
    { id:'mq3', type:'TF', format:'LATEX', slide_refs:[5],
      text:'The derivative of $e^{x^2}$ with respect to $x$ is $2xe^{x^2}$.',
      reference:'Chain Rule — Slide 5',
      options:['True','False'], answer:0 },
  ];
}

function _makePythonQs() {
  return [
    { id:'pq1', type:'TEXT', format:'CODE', slide_refs:[4],
      text:'What does the following function return when called with `n=0`?',
      code_snippet:`def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(0))`,
      reference:'Recursion — Slide 4',
      options:[], answer:'1 — The base case returns 1 when n equals 0.' },
    { id:'pq2', type:'MULTI', format:'TEXT', slide_refs:[2],
      text:'Which of the following are valid Python data types? (Select all that apply)',
      reference:'Data Types — Slide 2',
      options:['int','float','char','list','tuple'], answer:[0,1,3,4] },
  ];
}

function _makeChemQs() {
  return [
    { id:'chq1', type:'MCQ', format:'TEXT', slide_refs:[1],
      text:'Which reagent converts a primary alcohol to an aldehyde without over-oxidation?',
      reference:'Oxidation — Slide 1',
      options:['KMnO₄','PCC (Pyridinium chlorochromate)','Jones reagent','Na₂Cr₂O₇'], answer:1 },
    { id:'chq2', type:'TEXT', format:'LATEX', slide_refs:[6],
      text:'Calculate the degree of unsaturation for $C_6H_6$ using $DBE = \\frac{2C + 2 - H}{2}$.',
      reference:'Aromaticity — Slide 6',
      options:[], answer:'DBE = \\frac{2(6)+2-6}{2} = 4' },
  ];
}
