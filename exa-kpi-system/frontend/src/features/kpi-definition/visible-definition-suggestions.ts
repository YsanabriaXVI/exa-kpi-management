import type { KpiDefinition, KpiDefinitionSuggestion } from "./kpi-definition.types";

const stopWords = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "los", "para", "por", "un", "una", "y"]);
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const tokens = (value: string) => normalize(value).split(/\s+/).filter((token) => token.length > 2 && !stopWords.has(token));

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0]; row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(row[rightIndex] + 1, row[rightIndex - 1] + 1, previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[right.length];
}

const tokenSimilarity = (left: string, right: string) => left === right ? 1 : 1 - (editDistance(left, right) / Math.max(left.length, right.length));

export function visibleDefinitionSuggestions(query: string, definitions: readonly KpiDefinition[]): KpiDefinitionSuggestion[] {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  return definitions.map((definition) => {
    const candidateTokens = tokens(definition.kpiName);
    const matched = queryTokens.filter((queryToken) => candidateTokens.some((candidateToken) => tokenSimilarity(queryToken, candidateToken) >= .82)).length;
    const score = Math.round((matched / Math.max(queryTokens.length, candidateTokens.length, 1)) * 64 * 100) / 100;
    return { definition, score, matched };
  }).filter(({ matched, score }) => matched > 0 && score >= 20)
    .sort((left, right) => right.score - left.score || left.definition.kpiCode.localeCompare(right.definition.kpiCode))
    .map(({ definition, score }) => ({ id: definition.id, code: definition.kpiCode, name: definition.kpiName, normalizedName: normalize(definition.kpiName), similarityScore: score, matchType: "RELATED" }));
}

export function mergeDefinitionSuggestions(backend: readonly KpiDefinitionSuggestion[], visible: readonly KpiDefinitionSuggestion[], limit = 8) {
  const seen = new Set<string>();
  return [...backend, ...visible].filter((item) => !seen.has(item.id) && Boolean(seen.add(item.id))).slice(0, limit);
}
