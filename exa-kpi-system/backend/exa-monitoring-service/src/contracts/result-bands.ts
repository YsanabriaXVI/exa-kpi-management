export type ResultBand = { minResult: number; maxResult?: number; compliance: number; includesMin?: boolean; includesMax?: boolean };
export function validResultBands(value: unknown): value is ResultBand[] {
  if (!Array.isArray(value) || !value.length) return false;
  const bands = [...value].sort((a, b) => Number(a?.minResult) - Number(b?.minResult));
  return !bands.some((b, index) => {
    if (!b || !Number.isFinite(b.minResult) || !Number.isFinite(b.compliance) || b.compliance < 0 || b.compliance > 100
      || b.includesMin !== undefined && typeof b.includesMin !== "boolean" || b.includesMax !== undefined && typeof b.includesMax !== "boolean"
      || b.maxResult !== undefined && (!Number.isFinite(b.maxResult) || b.maxResult < b.minResult || b.maxResult === b.minResult && (b.includesMin === false || b.includesMax === false))) return true;
    const prev = bands[index - 1];
    return prev && (prev.maxResult === undefined || prev.maxResult > b.minResult || prev.maxResult === b.minResult && prev.includesMax !== false && b.includesMin !== false);
  });
}
