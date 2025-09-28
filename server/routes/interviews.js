const express = require('express');
const crypto = require('crypto');
const genaiHelper = require('../utils/genaiHelper');

const router = express.Router();

const sessions = new Map();

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

router.post('/start-interview', async (req, res) => {
  if (!genaiHelper) return res.status(500).json({ error: 'genaiHelper not available' });

  const difficulties = shuffle(['easy','easy','medium','medium','hard','hard']);

  try {
    const questions = [];
    for (const diff of difficulties) {
      const q = await genaiHelper.generateQuestion(diff);
      questions.push(q);
    }

    const sessionId = crypto.randomUUID();
    const stored = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      questions: questions.map(q => ({ difficulty: q.difficulty, question: q.question, expected: q.expected, answer: null, grade: null })),
      currentIndex: 0,
      completed: false,
    };

    sessions.set(sessionId, stored);

    const responseQuestions = stored.questions.map((q, idx) => ({ index: idx, difficulty: q.difficulty, question: q.question }));

    return res.json({ ok: true, sessionId, questions: responseQuestions });
  } catch (err) {
    console.error('start-interview error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/submit-answer', async (req, res) => {
  const { sessionId, questionIndex, answer } = req.body || {};
  if (!sessionId || typeof questionIndex !== 'number' || typeof answer === 'undefined') {
    return res.status(400).json({ error: 'sessionId, questionIndex and answer are required' });
  }

  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ error: 'session not found' });
  if (questionIndex < 0 || questionIndex >= session.questions.length) return res.status(400).json({ error: 'invalid questionIndex' });

  const q = session.questions[questionIndex];
  try {
    const grade = await genaiHelper.gradeAnswer(q.question, answer);

    q.answer = answer;
    q.grade = grade;

    const isLast = questionIndex === session.questions.length - 1;
    if (isLast) {
      session.completed = true;
      session.currentIndex = session.questions.length;
    } else {
      session.currentIndex = Math.min(session.currentIndex + 1, session.questions.length - 1);
    }

    let nextQuestion = null;
    if (!session.completed) {
      const nextIdx = questionIndex + 1;
      const nq = session.questions[nextIdx];
      nextQuestion = { index: nextIdx, difficulty: nq.difficulty, question: nq.question };
    }

    let summary = null;
    if (session.completed) {
      const scores = session.questions.map(sq => (sq.grade && typeof sq.grade.score === 'number') ? sq.grade.score : null).filter(s => s !== null);
      const total = scores.reduce((a,b) => a + b, 0);
      const avg = scores.length ? total / scores.length : null;
      summary = { totalScore: total, averageScore: avg, numQuestions: session.questions.length };
    }

    return res.json({ ok: true, grade, nextQuestion, completed: session.completed, summary });
  } catch (err) {
    console.error('submit-answer error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/candidates', (req, res) => {
  const completed = [];
  for (const session of sessions.values()) {
    if (!session.completed) continue;
    const scores = session.questions.map(sq => (sq.grade && typeof sq.grade.score === 'number') ? sq.grade.score : null).filter(s => s !== null);
    const total = scores.reduce((a,b) => a + b, 0);
    const avg = scores.length ? total / scores.length : null;
    completed.push({ id: session.id, createdAt: session.createdAt, numQuestions: session.questions.length, totalScore: total, averageScore: avg });
  }
  return res.json({ ok: true, candidates: completed });
});

module.exports = router;
