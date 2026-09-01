import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log('Using Key:', key?.substring(0, 5) + '...');

async function list() {
  try {
    const genAI = new GoogleGenerativeAI(key!);
    // The SDK doesn't have a direct listModels, we have to use fetch or internal
    console.log('Attempting to fetch models via REST...');
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await resp.json();
    console.log('Models:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}
list();
