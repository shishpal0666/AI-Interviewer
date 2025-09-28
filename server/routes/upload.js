const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

function extractEmail(text) {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function extractPhone(text) {
  const m = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
  return m ? m[0].trim() : null;
}

function extractName(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    const m = line.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?)$/);
    if (m) return m[0];
  }
  return null;
}

async function bufferToText(file) {
  const mime = file.mimetype || '';
  if (mime === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const data = await pdf(file.buffer);
    return data.text || '';
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.originalname.toLowerCase().endsWith('.docx') ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || '';
  }

  return file.buffer.toString('utf8');
}

router.post('/upload', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const text = await bufferToText(req.file);

    const name = extractName(text);
    const email = extractEmail(text);
    const phone = extractPhone(text);

    const fields = { name: name || null, email: email || null, phone: phone || null };
    const missing = Object.keys(fields).filter(k => !fields[k]);

    return res.json({ fields, missing });
  } catch (err) {
    console.error('Upload parse error:', err);
    return res.status(500).json({ error: 'Failed to parse file' });
  }
});

module.exports = router;
