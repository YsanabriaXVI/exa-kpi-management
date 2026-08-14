import calculateCheckDigit from "./calculateCheckDigit";

const validateContainerNumKey = (value: string): false | string => {
  const stringLength = value.length;
  let errorFound: false | string = false;

  const ownerCodeComplete = stringLength === 3 ? value.slice(0, 3) : false;
  const ownerCodeChar = stringLength < 3 ? value.slice(0, stringLength) : false;
  const equipmentCategory = stringLength >= 4 ? value[3] : false;
  const serialNumberComplete = stringLength === 10 ? value.slice(4, 10) : false;
  const serialNumberChar =
    stringLength > 4 && stringLength < 10 ? value.slice(4, stringLength) : false;
  const lastDigit = stringLength === 11 ? value[10] : false;
  const numberTooLong = stringLength > 11;

  if (numberTooLong) return false;

  if (ownerCodeComplete && !/^[A-Z]{3}$/.test(ownerCodeComplete)) {
    errorFound =
      "Invalid owner code. The first three characters must be alphabetic (A-Z).";
  }

  const regex1 = new RegExp(`^[A-Z]{${stringLength}}$`);
  if (ownerCodeChar && !regex1.test(ownerCodeChar)) {
    errorFound =
      "Invalid owner code. The first three characters must be alphabetic (A-Z).";
  }

  if (equipmentCategory && !["U", "J", "Z"].includes(equipmentCategory)) {
    errorFound =
      "Invalid equipment category. The fourth character must be 'U', 'J', or 'Z'.";
  }

  if (serialNumberChar && !/^\d+$/.test(serialNumberChar)) {
    errorFound = "Invalid serial number. Must be numeric (0-9).";
  }

  if (serialNumberComplete && !/^\d{6}$/.test(serialNumberComplete)) {
    errorFound =
      "Invalid serial number. The previous six characters must be numeric (0-9).";
  }

  if (lastDigit) {
    const code = value.slice(0, 3);
    const category = value[3];
    const serial = value.slice(4, 10);
    const calculatedLastDigit = calculateCheckDigit(code + category + serial);

    if (lastDigit !== calculatedLastDigit.toString()) {
      errorFound = `Invalid check digit. The correct check digit is ${calculatedLastDigit}.`;
    }
  }

  return errorFound;
};


export default validateContainerNumKey;