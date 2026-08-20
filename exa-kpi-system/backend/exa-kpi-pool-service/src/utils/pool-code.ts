export interface OrderedCode {
  code: string;
  displayOrder: number;
}

function canonicalCodes(values: readonly OrderedCode[]): string[] {
  return [...values]
    .map(({ code, displayOrder }) => ({ code: code.trim().toUpperCase(), displayOrder }))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.code.localeCompare(right.code))
    .map(({ code }) => code);
}

export const normalizeAreaCodes = canonicalCodes;
export const normalizeCompanyCodes = canonicalCodes;

export function buildAreaScopeKey(values: readonly OrderedCode[]): string {
  return canonicalCodes(values).join("|");
}

export function buildPoolSequenceScopeKey(areas: readonly OrderedCode[], issueYear: number): string {
  if (!Number.isInteger(issueYear) || issueYear < 1) throw new Error("issueYear must be a positive integer");
  const areaScopeKey = buildAreaScopeKey(areas);
  if (!areaScopeKey) throw new Error("At least one area is required");
  return `${areaScopeKey}:${issueYear}`;
}

export function formatPoolBusinessCode(input: {
  areas: readonly OrderedCode[];
  sequence: number;
  issueYear: number;
}): string {
  if (!Number.isInteger(input.sequence) || input.sequence < 1) throw new Error("sequence must be a positive integer");
  if (!Number.isInteger(input.issueYear) || input.issueYear < 1) throw new Error("issueYear must be a positive integer");
  const areaCodes = normalizeAreaCodes(input.areas);
  if (areaCodes.length === 0) throw new Error("At least one area is required");
  return [...areaCodes, String(input.sequence).padStart(2, "0"), String(input.issueYear)].join("-");
}
