// Add this function at the top level
const isEnglishWord = (str: string): boolean => {
  // This regex allows English letters, numbers, spaces, and basic punctuation
  return /^[a-zA-Z0-9\s.,!?-]+$/.test(str);
};

export { isEnglishWord };
