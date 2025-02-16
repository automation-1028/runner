import { openai } from '../configs/openai';
import { extractContent } from '../utils/deepseek.util';
import { deepseek } from '../configs/deepseek';
import { ollama } from '../configs/ollama';
import Sentry from '../configs/sentry';

const VALID_TOPICS = [
  'travel',
  'food',
  'exploration',
  'culture',

  'motivation',
  'mindfulness',
  'psychology',
  'leadership',
  'life experiences',
  'personal growth',
] as const;

const classifyKeyword = async (
  keyword: string,
  provider: 'openai' | 'ollama' | 'deepseek' = 'ollama',
): Promise<string> => {
  try {
    const prompt = `You are analyzing YouTube video titles. For the given video title, classify it into a single, specific topic category that best represents its main theme and content. Respond with only the topic name in lowercase, nothing else. The topic should be a single word or short phrase that clearly categorizes the content.`;

    let result: string | undefined;

    const userPrompt = `What topic category does the video title "${keyword}" belong to?`;

    if (provider === 'ollama') {
      const response = await ollama.chat.completions.create({
        model: 'deepseek-r1:14b',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userPrompt },
        ],
      });

      result = extractContent(
        response.choices[0].message.content || '',
      ).toLowerCase();
    } else if (provider === 'deepseek') {
      const response = await deepseek.chat.completions.create({
        model:
          process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-r1-distill-qwen-32b',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 20,
      });

      result = response.choices[0].message.content?.trim().toLowerCase();
    } else {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 20,
      });
      result = response.choices[0].message.content?.trim().toLowerCase();
    }

    if (!result) {
      throw new Error('No classification received');
    }

    return result;
  } catch (error) {
    Sentry.captureException(error);

    console.error('Classification error:', error);
    throw new Error('Failed to classify keyword');
  }
};

export { classifyKeyword, VALID_TOPICS };
