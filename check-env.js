require('dotenv').config();
if (process.env.OPENAI_API_KEY) {
    console.log('✅ API Key found! First 10 chars:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
} else {
    console.log('❌ No API Key found. Create a .env file with OPENAI_API_KEY=your-key-here');
}
