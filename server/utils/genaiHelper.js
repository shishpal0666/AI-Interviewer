const { GoogleGenAI } = require('@google/genai');
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
const genaiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;


function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const braceMatch = text.match(/\{[\s\S]*\}/m);
  const arrayMatch = text.match(/\[[\s\S]*\]/m);
  let candidate = null;
  if (braceMatch) candidate = braceMatch[0];
  else if (arrayMatch) candidate = arrayMatch[0];
  else candidate = text;

  try {
    return JSON.parse(candidate);
  } catch (err) {
    return null;
  }
}

async function callWithRetry(fn, { retries = 3, baseDelay = 500 } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = err?.status || (err?.response && err.response.status) || null;
      const isTransient = [429, 503, 504].includes(status) || /ETIMEDOUT|ECONNRESET|ENOTFOUND/.test(err?.code || '');
      if (!isTransient || attempt > retries) throw err;
      const delay = Math.round(baseDelay * Math.pow(2, attempt - 1));
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function callModelGenerate(params) {
  if (!genaiClient) throw new Error('GenAI client not configured');
  return callWithRetry(() => genaiClient.models.generateContent(params), { retries: 4, baseDelay: 500 });
}

async function generateQuestion(difficulty = 'medium') {
  if (!genaiClient) throw new Error('GenAI client not configured. Install @google/genai and set GEMINI_API_KEY.');

  const prompt = `You are an expert interview question generator. Produce a single programming interview question appropriate for difficulty level: ${difficulty}.\n\nRespond with a JSON object EXACTLY in the following shape (no extra commentary): {"difficulty":"<difficulty>", "question":"<the question text>", "expected":"<a short expected answer or guideline>"}`;

  const res = await callModelGenerate({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { maxOutputTokens: 400, temperature: 0.2 }
  });

  
  const text = res?.text ?? (res?.candidates && res.candidates[0]?.content) ?? null;
  const parsed = extractJson(text);
  if (parsed && parsed.question) {
    return {
      difficulty: parsed.difficulty || difficulty,
      question: parsed.question,
      expected: parsed.expected || null,
    };
  }

  return { difficulty, question: text || '', expected: null };
}

async function gradeAnswer(question, candidateAnswer) {
  if (!genaiClient) throw new Error('GenAI client not configured. Install @google/genai and set GEMINI_API_KEY.');
  if (!question) throw new Error('question is required');

  const prompt = `You are an expert interview grader. Given the interview question below and a candidate's answer, grade the answer on a 0-10 scale (10 best). Provide a JSON object EXACTLY in this shape: {"score": <number>, "strengths": ["..."], "weaknesses": ["..."], "explanation": "..."}.\n\nQuestion:\n${question}\n\nCandidate Answer:\n${candidateAnswer}\n\nBe concise but specific.`;

  const res = await callModelGenerate({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: { maxOutputTokens: 400, temperature: 0.0 }
  });

  const text = res?.text ?? (res?.candidates && res.candidates[0]?.content) ?? null;
  const parsed = extractJson(text);

  if (parsed && typeof parsed.score !== 'undefined') {
    return {
      score: parsed.score,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      explanation: parsed.explanation || '',
    };
  }

  return { score: null, strengths: [], weaknesses: [], explanation: text || 'No parseable response' };
}

module.exports = { generateQuestion, gradeAnswer };

