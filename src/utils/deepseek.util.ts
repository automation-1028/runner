const extractContent = (text: string) => {
  // Remove content between think tags using regex
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, '');

  // Remove extra whitespace and return
  return cleaned.trim();
};

export { extractContent };
