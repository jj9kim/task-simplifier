import 'dotenv/config';
console.log('API Key exists:', !!process.env.OPENAI_API_KEY);
if (process.env.OPENAI_API_KEY) {
    console.log('First 10 chars:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
}
