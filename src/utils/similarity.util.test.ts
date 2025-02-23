import { getWordSimilarity } from './similarity.util';

describe('getWordSimilarity', () => {
  it('should return 1 for identical words', () => {
    expect(getWordSimilarity('hello', 'hello')).toBe(1);
    expect(getWordSimilarity('test', 'test')).toBe(1);
  });

  it('should handle case-insensitive comparison', () => {
    expect(getWordSimilarity('Hello', 'hello')).toBe(1);
    expect(getWordSimilarity('TEST', 'test')).toBe(1);
  });

  it('should return lower values for different words', () => {
    expect(getWordSimilarity('hello', 'helo')).toBe(0.8);
    expect(getWordSimilarity('test', 'tent')).toBe(0.75);
  });

  it('should return lower values for different words', () => {
    expect(getWordSimilarity('education', 'exploration')).toBeGreaterThan(0.5);
    // expect(getWordSimilarity('test', 'tent')).toBe(0.75);
  });
});
