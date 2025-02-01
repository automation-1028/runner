import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey:
    process.env.DEEPSEEK_API_KEY ||
    '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',
  baseURL: 'https://openrouter.ai/api/v1',
});

export { deepseek };
