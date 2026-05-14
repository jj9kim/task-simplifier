import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { json } from 'body-parser';
import { generateProjectPlan } from './openai.ts';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(json());

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

// Optional static fallback for production build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
