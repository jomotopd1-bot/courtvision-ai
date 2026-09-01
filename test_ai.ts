import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log('Key exists:', !!key);

async function test() {
  if (!key) return;
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    console.log('SDK initialized');

    const result = await model.generateContent("Hola, responde con un objeto JSON: { \"status\": \"ok\" }");
    const response = await result.response;
    const text = response.text();
    console.log('Response:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
