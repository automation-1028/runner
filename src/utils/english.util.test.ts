import { isEnglishWord } from './english.util';

describe('isEnglishWord', () => {
  it('should return true for English words', () => {
    expect(isEnglishWord('hello')).toBe(true);
    expect(isEnglishWord('world')).toBe(true);
    expect(isEnglishWord('Hello, world!')).toBe(true);
    expect(
      isEnglishWord('how to read human mind psychology in hindi (ATD)'),
    ).toBe(true);
    expect(isEnglishWord('how to wake up earlier | morning life hacks')).toBe(
      true,
    );
    expect(
      isEnglishWord(
        'how to make an electric hot wire lighter using battery - life hacks | diy',
      ),
    ).toBe(true);
    expect(
      isEnglishWord(
        'how to be a smart parent || creative parenting ideas, life hacks by kaboom!',
      ),
    ).toBe(true);
  });

  it('should return false for non-English words', () => {
    expect(isEnglishWord('你好')).toBe(false);
    expect(isEnglishWord('안녕하세요')).toBe(false);
    expect(isEnglishWord('こんにちは')).toBe(false);
  });
});
