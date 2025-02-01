import OpenAI from 'openai';

const ollama = new OpenAI({
  apiKey: 'ollama',
  baseURL: 'http://localhost:11434/v1',
  timeout: 60_000 * 10,
});

export { ollama };
