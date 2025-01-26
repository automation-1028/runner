import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VALID_CATEGORIES = [
  'travel',
  'food',
  'exploration',
  'culture',

  'motivation',
  'mindfulness',
  'psychology',
  'leadership',
  'selfhelp',
  'Life Experiences',
  'Personal Growth',

  'others',
] as const;

const classifyKeyword = async (keyword: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `First classify the keyword into one of these categories: ${VALID_CATEGORIES.join(
            '/',
          )}. If it falls under "others", provide a specific topic name. Return either one of the predefined categories or "others:specific_topic" format. No punctuation or additional text.`,
        },
        {
          role: 'user',
          content: keyword,
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    const result: string | undefined = response.choices[0].message.content
      ?.trim()
      .toLowerCase();
    if (!result) {
      throw new Error('No classification received');
    }

    // If the result starts with 'others:', return the specific topic
    if (result.startsWith('others:')) {
      return result.split(':')[1].trim();
    }

    return result;
  } catch (error) {
    console.error('Classification error:', error);
    throw new Error('Failed to classify keyword');
  }
};

export { classifyKeyword, VALID_CATEGORIES };
