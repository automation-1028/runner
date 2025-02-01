import { openai } from '../configs/openai';
import { extractContent } from '../utils/deepseek.util';
import { deepseek } from '../configs/deepseek';
import { ollama } from '../configs/ollama';

const VALID_TOPICS = [
  'travel',
  'food',
  'exploration',
  'culture',

  'motivation',
  'mindfulness',
  'psychology',
  'leadership',
  'selfhelp',
  'life experiences',
  'personal growth',
] as const;

const classifyKeyword = async (
  keyword: string,
  provider: 'openai' | 'ollama' | 'deepseek' = 'ollama',
): Promise<string> => {
  try {
    const prompt = `Classify the keyword into one of these topics: ${VALID_TOPICS.join(
      ', ',
    )}. If it doesn't match any topic, provide a specific single-word topic name. Respond with only the topic name, nothing else.`;

    let result: string | undefined;

    if (provider === 'ollama') {
      const response = await ollama.chat.completions.create({
        model: 'deepseek-r1:1.5b',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: keyword },
        ],
      });

      result = extractContent(
        response.choices[0].message.content || '',
      ).toLowerCase();
    } else if (provider === 'deepseek') {
      const response = await deepseek.chat.completions.create({
        model: process.env.DEEPSEEK_MODEL || 'deepseek/deepseek-r1',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: keyword },
        ],
      });

      result = response.choices[0].message.content?.trim().toLowerCase();
    } else {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: keyword },
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
    console.error('Classification error:', error);
    throw new Error('Failed to classify keyword');
  }
};

export { classifyKeyword, VALID_TOPICS };
