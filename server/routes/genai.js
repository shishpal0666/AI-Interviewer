const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const genaiHelper = require('../utils/genaiHelper');
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
const genaiClient = new GoogleGenAI({ apiKey });


const router = express.Router();

router.post('/generate', async (req, res) => {
  if (!genaiClient) return res.status(500).json({ error: 'GenAI client not configured' });

  const { model = 'gemini-2.0-flash', contents = '' , config = {} } = req.body || {};

  try {
    const response = await genaiClient.models.generateContent({ model, contents, config });
  const text = response?.text ?? (response?.candidates && response.candidates[0]?.content) ?? null;
    return res.json({ ok: true, text, raw: response });
  } catch (err) {
    console.error('GenAI generate error:', err);
    return res.status(500).json({ error: 'Generation failed', details: err.message });
  }
});

router.post('/stream', async (req, res) => {
  if (!genaiClient) return res.status(500).json({ error: 'GenAI client not configured' });

  const { model = 'gemini-2.0-flash', contents = '' , config = {} } = req.body || {};

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await genaiClient.models.generateContentStream({ model, contents, config });
    (async () => {
      try {
        for await (const chunk of stream) {
          const chunkText = typeof chunk?.text === 'function' ? chunk.text() : chunk?.text ?? JSON.stringify(chunk);
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      } catch (err) {
        console.error('Stream iteration error:', err);
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      } finally {
        res.write('event: done\ndata: {}\n\n');
        res.end();
      }
    })();

  } catch (err) {
    console.error('GenAI stream error:', err);
    return res.status(500).json({ error: 'Streaming failed', details: err.message });
  }
});

router.post('/question', async (req, res) => {
  if (!genaiHelper) return res.status(500).json({ error: 'genaiHelper not available' });
  const { difficulty = 'medium' } = req.body || {};
  try {
    const q = await genaiHelper.generateQuestion(difficulty);
    return res.json({ ok: true, question: q });
  } catch (err) {
    console.error('Question generation error:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.post('/grade', async (req, res) => {
  if (!genaiHelper) return res.status(500).json({ error: 'genaiHelper not available' });
  const { question, answer } = req.body || {};
  if (!question || typeof answer === 'undefined') return res.status(400).json({ error: 'question and answer are required' });
  try {
    const grade = await genaiHelper.gradeAnswer(question, answer);
    return res.json({ ok: true, grade });
  } catch (err) {
    console.error('Grade error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

