import OpenAI from 'openai';

const deepseek = new OpenAI({
  apiKey:
    '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',
  baseURL: 'https://openrouter.ai/api/v1',
});

export { deepseek };
