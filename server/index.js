require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ ok: true });
});

// Routes
const uploadRouter = require('./routes/upload');
const genaiRouter = require('./routes/genai');
const interviewsRouter = require('./routes/interviews');
app.use('/api', uploadRouter);
app.use('/api/genai', genaiRouter);
app.use('/api/interviews', interviewsRouter);

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Invalid JSON body:', err.message);
    return res.status(400).json({ error: 'Invalid JSON in request body', details: err.message });
  }
  next(err);
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
