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
  // Make the prompt more concise to save tokens
  const prompt = `Project: "${project}"

Return a JSON object with these exact keys (use real data for this project):
- subtasks (array of 10-15 strings)
- milestones (array of 5-8 strings)
- priorities (array matching subtasks: "High"/"Medium"/"Low")
- effortEstimates (array matching subtasks: "Small"/"Medium"/"Large"/"XL")
- dependencies (array of strings)
- suggestedOrder (array of subtask names in order)
- raw (string summary)
- developerTasks (array of strings)
- qaTasks (array of strings)
- documentationTasks (array of strings)
- timeline: { phases: [{name, startDate, endDate, tasks, assignedRoles}], totalEstimatedWeeks: number }
- teamStructure: { roles, estimatedTeamSize, collaborationTools, meetingCadence }
- trackingMetrics (array of strings)
- jiraFormat: { epicName, issues: [{summary, type, priority, assignee}] }

Return ONLY valid JSON.`;

  const completion = await client.chat.completions.create({
    model: 'gemini-1.5-flash',  // More stable model
    messages: [
      { role: 'system', content: 'You return complete, valid JSON only. Always finish your response.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 4096,  // Maximum allowed
  });

  let text = completion.choices?.[0]?.message?.content || '';
  
  // Clean markdown
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  // Check if response was cut off
  if (!text.endsWith('}') && !text.endsWith(']')) {
    console.log('Response appears cut off, attempting to complete...');
    // Try to complete with another API call
    text = await completeCutoffJSON(text, project);
  }
  
  return parseJSONSafely(text);
}

async function completeCutoffJSON(incompleteJSON: string, project: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: 'gemini-1.5-flash',
    messages: [
      { role: 'system', content: 'Continue the JSON from where it left off. Do not add any explanation, just complete the JSON properly.' },
      { role: 'user', content: `Complete this JSON response. Start exactly where it left off:\n\n${incompleteJSON}` },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });
  
  const continuation = completion.choices?.[0]?.message?.content || '';
  return incompleteJSON + continuation;
}

function parseJSONSafely(raw: string) {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.log('Direct parse failed, trying fixes...');
  }
  
  // Strategy 2: Find complete JSON object
  try {
    let braceCount = 0;
    let endIndex = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '{') braceCount++;
      if (raw[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      const completeJSON = raw.substring(0, endIndex + 1);
      return JSON.parse(completeJSON);
    }
  } catch (e) {
    console.log('Boundary extraction failed');
  }
  
  // Strategy 3: Return empty structure with error
  console.error('Could not parse JSON. Raw:', raw.substring(0, 300));
  return {
    subtasks: [],
    milestones: [],
    priorities: [],
    effortEstimates: [],
    dependencies: [],
    suggestedOrder: [],
    raw: `Parse error. Raw response: ${raw.substring(0, 200)}...`,
    developerTasks: [],
    qaTasks: [],
    documentationTasks: [],
    timeline: { phases: [], totalEstimatedWeeks: 0 },
    teamStructure: { roles: [], estimatedTeamSize: 0, collaborationTools: [], meetingCadence: '' },
    trackingMetrics: [],
    jiraFormat: { epicName: '', issues: [] }
  };
}