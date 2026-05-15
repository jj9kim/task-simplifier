// server/openai.ts
import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

export async function generateProjectPlan(project: string) {
  const prompt = `You are an expert project planner. Analyze the following project and return a COMPLETE JSON object.

Project: "${project}"

Return EXACTLY this JSON structure (fill with real data for this project):

{
  "subtasks": ["subtask 1", "subtask 2"],
  "milestones": ["milestone 1", "milestone 2"],
  "priorities": ["High", "Medium"],
  "effortEstimates": ["Small", "Medium"],
  "dependencies": ["Task 2 depends on Task 1"],
  "suggestedOrder": ["Task 1", "Task 2"],
  "raw": "A natural language summary of the plan",
  "developerTasks": ["dev task 1", "dev task 2"],
  "qaTasks": ["qa task 1", "qa task 2"],
  "documentationTasks": ["doc task 1", "doc task 2"],
  "timeline": {
    "phases": [
      {
        "name": "Phase 1 Name",
        "startDate": "Week 1",
        "endDate": "Week 3",
        "tasks": ["task 1", "task 2"],
        "assignedRoles": ["Developer", "QA"]
      }
    ],
    "totalEstimatedWeeks": 8
  },
  "teamStructure": {
    "roles": ["Project Manager", "Developer", "QA"],
    "estimatedTeamSize": 4,
    "collaborationTools": ["Jira", "Slack", "GitHub"],
    "meetingCadence": "Daily standups, Weekly sprint planning"
  },
  "trackingMetrics": ["Sprint completion rate", "Bug count", "Feature velocity"],
  "jiraFormat": {
    "epicName": "Project Epic Name",
    "issues": [
      {
        "summary": "Issue summary",
        "type": "Task",
        "priority": "High",
        "assignee": "Dev"
      }
    ]
  }
}

Return ONLY valid JSON. No markdown, no backticks, no explanations.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: 'You are a project planning expert. You always return valid JSON only, with no markdown formatting or backticks. Every field must be included.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    let text = completion.choices?.[0]?.message?.content || '';
    
    // Clean the response: remove markdown code blocks
    text = text.replace(/```json\n?/g, '');
    text = text.replace(/```\n?/g, '');
    text = text.trim();
    
    console.log('Raw AI response:', text); // Debug: see what AI returned
    
    // Parse the JSON
    const parsed = JSON.parse(text);
    
    // Return with all fields (fallback to empty arrays if missing)
    return {
      subtasks: parsed.subtasks || [],
      milestones: parsed.milestones || [],
      priorities: parsed.priorities || [],
      effortEstimates: parsed.effortEstimates || [],
      dependencies: parsed.dependencies || [],
      suggestedOrder: parsed.suggestedOrder || [],
      raw: parsed.raw || text,
      developerTasks: parsed.developerTasks || [],
      qaTasks: parsed.qaTasks || [],
      documentationTasks: parsed.documentationTasks || [],
      timeline: parsed.timeline || { phases: [], totalEstimatedWeeks: 0 },
      teamStructure: parsed.teamStructure || { roles: [], estimatedTeamSize: 0, collaborationTools: [], meetingCadence: '' },
      trackingMetrics: parsed.trackingMetrics || [],
      jiraFormat: parsed.jiraFormat || { epicName: '', issues: [] }
    };
    
  } catch (error: any) {
    console.error('Error in generateProjectPlan:', error.message);
    console.error('Full error:', error);
    
    // Return empty data structure on error
    return {
      subtasks: [],
      milestones: [],
      priorities: [],
      effortEstimates: [],
      dependencies: [],
      suggestedOrder: [],
      raw: `Error generating plan: ${error.message}`,
      developerTasks: [],
      qaTasks: [],
      documentationTasks: [],
      timeline: { phases: [], totalEstimatedWeeks: 0 },
      teamStructure: { roles: [], estimatedTeamSize: 0, collaborationTools: [], meetingCadence: '' },
      trackingMetrics: [],
      jiraFormat: { epicName: '', issues: [] }
    };
  }
}