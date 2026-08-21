const scopePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function normalizeAreaScope(codes: string[]) {
  const normalized = [...new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean))].sort();
  if (!normalized.length || normalized.some((code) => !scopePattern.test(code))) throw new Error("A valid area scope is required");
  return normalized.join("-");
}

export function formatScorecardCode(scopeKey: string, sequence: number, issueYear: number) {
  if (!scopePattern.test(scopeKey) || !Number.isInteger(sequence) || sequence < 1 || !Number.isInteger(issueYear) || issueYear < 2000 || issueYear > 9999) throw new Error("Invalid Scorecard code components");
  return `SC-${scopeKey}-${String(sequence).padStart(2, "0")}-${issueYear}`;
}
