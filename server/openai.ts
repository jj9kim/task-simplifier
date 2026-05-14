import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const parseResponse = (text: string) => {
  try {
    const payload = JSON.parse(text);
    return payload;
  } catch {
    return null;
  }
};

export async function generateProjectPlan(project: string) {
  const prompt = `You are a project planning assistant.

Analyze the following request and return a JSON object with these keys:
- subtasks (array of strings)
- milestones (array of strings)
- priorities (array of strings)
- effortEstimates (array of strings)
- dependencies (array of strings)
- suggestedOrder (array of strings)
- raw (string)

Request: "${project}"

Keep the JSON valid and ensure no extra fields are added.`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: 'You create structured project plans from a high-level task description.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 650,
  });

  const text = completion.choices?.[0]?.message?.content || '';
  const parsed = parseResponse(text);
  if (parsed && typeof parsed === 'object') {
    return {
      subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : [],
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
      priorities: Array.isArray(parsed.priorities) ? parsed.priorities : [],
      effortEstimates: Array.isArray(parsed.effortEstimates) ? parsed.effortEstimates : [],
      dependencies: Array.isArray(parsed.dependencies) ? parsed.dependencies : [],
      suggestedOrder: Array.isArray(parsed.suggestedOrder) ? parsed.suggestedOrder : [],
      raw: parsed.raw || text,
    };
  }

  return {
    subtasks: [],
    milestones: [],
    priorities: [],
    effortEstimates: [],
    dependencies: [],
    suggestedOrder: [],
    raw: text,
  };
}
