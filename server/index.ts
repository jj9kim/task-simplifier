import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateProjectPlan } from './openai.ts';
import cors from 'cors';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, '../dist')));

// For any non-API request, serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});


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

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
