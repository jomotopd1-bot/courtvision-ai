import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log('Key exists:', !!key);

async function test() {
  try {
    const genAI = new GoogleGenAI({ apiKey: key });
    console.log('SDK initialized');
    // Try to list models or something
    console.log('SDK Keys:', Object.keys(genAI));
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
