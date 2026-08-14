
const calculateCheckDigit = (input: string): number => {
  const alphabet = "0123456789A?BCDEFGHIJK?LMNOPQRSTU?VWXYZ";
  let sum = 0;
  let multiplier = 1;

  // Iterate over characters in input (typically 10 chars for container check digit calc)
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const value = alphabet.indexOf(char);

    sum += value * multiplier;
    multiplier *= 2;
  }

  const checkDigit = sum % 11;
  return checkDigit === 10 ? 0 : checkDigit;
};

export default calculateCheckDigit;