export const buildRephrasePrompt = (
  userInput: string,
  styleInstructions: string,
): string =>
  [
    "Fake global prompt.",
    "",
    styleInstructions,
    "",
    `Input text: ${userInput}`,
  ].join("\n");

export const calcUserTokens = (userInput: string): number => {
  // Fake token calculation
  return userInput.length;
};
