
import calculateCheckDigit from "./calculateCheckDigit";


const validateCompleteContainerNum = (value: string | null): false | string => {
  if (value === "" || value === null) {
    return "Is not allowed to be empty.";
  }

  if (value.length < 11) {
    return "Serial number must contain 11 characters.";
  }

  const code = value.slice(0, 3);
  const category = value[3];
  const serial = value.slice(4, 10);
  const calculatedLastDigit = calculateCheckDigit(code + category + serial);
  const lastDigit = value[10];

  if (!/^[A-Z]{3}$/.test(code)) {
    return "Invalid owner code. The first three characters must be alphabetic (A-Z).";
  }

  if (category && !["U", "J", "Z"].includes(category)) {
    return "Invalid equipment category. The fourth character must be 'U', 'J', or 'Z'.";
  }

  if (!/^\d{6}$/.test(serial)) {
    return "Invalid serial number. Characters 5-9 must be numeric (0-9).";
  }

  if (lastDigit !== calculatedLastDigit.toString()) {
    return `Invalid last digit. The correct check digit is ${calculatedLastDigit}.`;
  }

  return false;
};


export default validateCompleteContainerNum;