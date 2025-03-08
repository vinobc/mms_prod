// client/src/utils/formatUtils.ts

/**
 * Convert number to words in the required format
 * Converts each digit to its word representation and joins with spaces
 * For example: 32 -> "THREE TWO"
 */
export const numberToWords = (num: number): string => {
  // Convert the number to a string to handle each digit
  const numStr = num.toString();
  const digits = numStr.split("");

  // Map each digit to its word representation
  const words = digits.map((digit) => {
    switch (digit) {
      case "0":
        return "ZERO";
      case "1":
        return "ONE";
      case "2":
        return "TWO";
      case "3":
        return "THREE";
      case "4":
        return "FOUR";
      case "5":
        return "FIVE";
      case "6":
        return "SIX";
      case "7":
        return "SEVEN";
      case "8":
        return "EIGHT";
      case "9":
        return "NINE";
      default:
        return "";
    }
  });

  // Join with spaces
  return words.join(" ");
};
