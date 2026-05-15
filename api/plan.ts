import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { project } = req.body;
  if (!project || typeof project !== 'string') {
    return res.status(400).json({ error: 'Project name or description is required.' });
  }

  try {
    const plan = await generateProjectPlan(project);
    res.json(plan);
  } catch (error: any) {
    console.error('plan generation error', error);
    res.status(500).json({ 
      error: 'Unable to generate project plan.',
      details: error.message 
    });
  }
}

async function generateProjectPlan(project: string) {
  const prompt = `You are an expert project planner. Analyze this project and return a VALID JSON object.

Project: "${project}"

Return EXACTLY this structure (replace with real data, but keep the exact keys):

{
  "subtasks": ["Task 1", "Task 2"],
  "milestones": ["Milestone 1", "Milestone 2"],
  "priorities": ["High", "Medium"],
  "effortEstimates": ["Medium", "Large"],
  "dependencies": ["Task 2 depends on Task 1"],
  "suggestedOrder": ["Task 1", "Task 2"],
  "raw": "Brief summary of the plan",
  "developerTasks": ["Dev task 1"],
  "qaTasks": ["QA task 1"],
  "documentationTasks": ["Doc task 1"],
  "timeline": {
    "phases": [{"name": "Phase 1", "startDate": "Week 1", "endDate": "Week 2", "tasks": ["Task 1"], "assignedRoles": ["Dev"]}],
    "totalEstimatedWeeks": 4
  },
  "teamStructure": {
    "roles": ["Developer", "QA"],
    "estimatedTeamSize": 3,
    "collaborationTools": ["Jira", "Slack"],
    "meetingCadence": "Daily standup"
  },
  "trackingMetrics": ["Completion rate", "Bug count"],
  "jiraFormat": {
    "epicName": "Project Epic",
    "issues": [{"summary": "Task summary", "type": "Task", "priority": "High", "assignee": "Dev"}]
  }
}

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no extra text at the end. Make sure all strings are properly closed with double quotes.`;

  const completion = await client.chat.completions.create({
    model: 'gemini-2.5-flash',
    messages: [
      { role: 'system', content: 'You are a JSON generator. You always return complete, valid JSON with no trailing commas, no comments, and all strings properly closed. Never cut off mid-response.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,  // Lower temperature for more predictable output
    max_tokens: 3000,  // Reduced from 4000 to avoid cutoff
  });

  let text = completion.choices?.[0]?.message?.content || '';
  
  // Clean markdown
  text = text.replace(/```json\n?/g, '');
  text = text.replace(/```\n?/g, '');
  text = text.trim();
  
  // Try multiple parsing strategies
  return parseJSONSafely(text);
}

function parseJSONSafely(raw: string) {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.log('Direct parse failed, trying fixes...');
  }
  
  // Strategy 2: Try to find JSON object boundaries
  try {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonCandidate = raw.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonCandidate);
    }
  } catch (e) {
    console.log('Boundary extraction failed');
  }
  
  // Strategy 3: Return empty structure with error message
  console.error('Could not parse JSON. Raw response:', raw.substring(0, 500));
  return {
    subtasks: [],
    milestones: [],
    priorities: [],
    effortEstimates: [],
    dependencies: [],
    suggestedOrder: [],
    raw: `Error parsing AI response: ${raw.substring(0, 200)}...`,
    developerTasks: [],
    qaTasks: [],
    documentationTasks: [],
    timeline: { phases: [], totalEstimatedWeeks: 0 },
    teamStructure: { roles: [], estimatedTeamSize: 0, collaborationTools: [], meetingCadence: '' },
    trackingMetrics: [],
    jiraFormat: { epicName: '', issues: [] }
  };
}