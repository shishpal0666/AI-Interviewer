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
app.use('/api', uploadRouter);
app.use('/api/genai', genaiRouter);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
