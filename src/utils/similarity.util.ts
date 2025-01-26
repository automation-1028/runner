import natural from 'natural';

// Levenshtein distance for word similarity
const getWordSimilarity = (word1: string, word2: string): number => {
  const distance = natural.LevenshteinDistance(
    word1.toLowerCase(),
    word2.toLowerCase(),
  );
  const maxLength = Math.max(word1.length, word2.length);
  return 1 - distance / maxLength;
};

// Cosine similarity for sentence comparison
const getSentenceSimilarity = (str1: string, str2: string): number => {
  const words1 = str1.toLowerCase().split(' ');
  const words2 = str2.toLowerCase().split(' ');

  // Create word frequency vectors
  const wordSet = new Set([...words1, ...words2]);
  const vector1 = Array.from(wordSet).map(
    (word) => words1.filter((w) => w === word).length,
  );
  const vector2 = Array.from(wordSet).map(
    (word) => words2.filter((w) => w === word).length,
  );

  // Calculate cosine similarity
  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(
    vector1.reduce((sum, val) => sum + val * val, 0),
  );
  const magnitude2 = Math.sqrt(
    vector2.reduce((sum, val) => sum + val * val, 0),
  );

  return dotProduct / (magnitude1 * magnitude2);
};

export { getWordSimilarity, getSentenceSimilarity };
