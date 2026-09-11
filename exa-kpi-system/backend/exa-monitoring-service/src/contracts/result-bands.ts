export type ResultBand = { minResult: number | null; maxResult?: number | null; compliance: number; includesMin?: boolean; includesMax?: boolean };
export function validResultBands(value: unknown): value is ResultBand[] {
  if (!Array.isArray(value) || !value.length) return false;
  if (value.some(b => !b || (b.minResult !== null && !Number.isFinite(b.minResult))
    || (b.maxResult != null && !Number.isFinite(b.maxResult))
    || !Number.isFinite(b.compliance) || b.compliance < 0 || b.compliance > 100
    || (b.includesMin !== undefined && typeof b.includesMin !== "boolean")
    || (b.includesMax !== undefined && typeof b.includesMax !== "boolean"))) return false;
  const bands = [...value].sort((a, b) => (a.minResult ?? -Infinity) - (b.minResult ?? -Infinity));
  return !bands.some((b, index) => {
    const min = b.minResult ?? -Infinity, max = b.maxResult ?? Infinity;
    if (max < min || max === min && (b.includesMin === false || b.includesMax === false)) return true;
    const prev = bands[index - 1];
    return !!prev && ((prev.maxResult ?? Infinity) > min
      || prev.maxResult === min && prev.includesMax !== false && b.includesMin !== false);
  });
}

// Only explicit outer rows may use <= N or >= N. Interior rows are exact equalities.
export function validExactPoints(value: unknown): value is ResultBand[] {
  return validResultBands(value) && value.every((b, i) => {
    const anchor = b.minResult ?? b.maxResult;
    const previous = i > 0 ? value[i - 1]!.minResult ?? value[i - 1]!.maxResult : null;
    return anchor != null && b.includesMin !== false && b.includesMax !== false &&
      (b.minResult === null && b.maxResult != null && i === 0 ||
       b.minResult !== null && (b.maxResult === b.minResult || b.maxResult === null && i === value.length - 1 && b.minResult >= 0)) &&
      (i === 0 || previous != null && anchor > previous);
  });
}
