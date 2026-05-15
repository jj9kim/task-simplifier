import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { generateProjectPlan } from './openai.js';

const app = express();
const port = Number(process.env.PORT || 4000);

// Enable CORS for your Vercel frontend
app.use(cors({
  origin: ['https://task-simplifier.vercel.app', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

app.post('/api/plan', async (req, res) => {
  const { project } = req.body;
  if (!project || typeof project !== 'string') {
    return res.status(400).json({ error: 'Project name or description is required.' });
  }

  try {
    const plan = await generateProjectPlan(project);
    res.json(plan);
  } catch (error) {
    console.error('plan generation error', error);
    res.status(500).json({ error: 'Unable to generate project plan. Check server logs.' });
  }
});

// Health check endpoint (optional)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});