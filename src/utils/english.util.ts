const isEnglishWord = (str: string): boolean => {
  // This regex allows English letters, numbers, spaces, punctuation, and parentheses
  return /^[a-zA-Z0-9\s.,!?()|-]+$/.test(str);
};

export { isEnglishWord };
