import { normalizeDefinitionText } from "./normalize.js";

export const AUTOSUGGEST_DEFAULT_LIMIT = 6;
export const AUTOSUGGEST_MAX_LIMIT = 8;

export type AutosuggestMatchType = "EXACT_OR_NEAR_DUPLICATE" | "STRONG_SIMILARITY" | "RELATED";
export type SuggestionEligibility = "ELIGIBLE" | "LOW_PRIORITY" | "EXCLUDED";

export type AutosuggestCandidate = Readonly<{
  id: string;
  code: string;
  name: string;
  description?: string | null;
}>;

export type RankedAutosuggestCandidate = Readonly<{
  id: string;
  code: string;
  name: string;
  normalizedName: string;
  similarityScore: number;
  matchType: AutosuggestMatchType;
}>;

const STOP_WORDS = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "los", "para", "por", "un", "una", "y"]);
const ADMINISTRATIVE_PATTERN = /\b(scorecard|score card|linked scorecard|colaborador|collaborator|weighted value|demo|test|sample|example)\b/;
const LOW_PRIORITY_PATTERN = /\b(template|plantilla|mock|seed|generated|generico|generic)\b|define and monitor .* consistently across assigned kpi pools and scorecards/;

const canonicalToken = (token: string): string => {
  const aliases: Record<string, string> = {
    vender: "venta", ventas: "venta", venta: "venta",
    costos: "costo", gastos: "gasto", kilometro: "km", kilometros: "km", kms: "km",
    contenedores: "contenedor", cabezales: "cabezal", accidentes: "accidente", incidentes: "incidente",
    clientes: "cliente", viajes: "viaje", ordenes: "orden",
  };
  return aliases[token] ?? token;
};

export function autosuggestTokens(value: string): readonly string[] {
  return normalizeDefinitionText(value)
    .split(/[\s/+-]+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token))
    .map(canonicalToken);
}

export function classifySuggestionEligibility(candidate: AutosuggestCandidate): SuggestionEligibility {
  const identity = normalizeDefinitionText(`${candidate.code} ${candidate.name}`);
  const searchable = normalizeDefinitionText(`${candidate.code} ${candidate.name} ${candidate.description ?? ""}`);
  // Descriptions can legitimately mention collaborators or scorecards as scope.
  // Administrative markers exclude only when they identify the Definition itself.
  if (ADMINISTRATIVE_PATTERN.test(identity)) return "EXCLUDED";
  if (LOW_PRIORITY_PATTERN.test(searchable)) return "LOW_PRIORITY";
  return "ELIGIBLE";
}

const intersectionSize = (left: ReadonlySet<string>, right: ReadonlySet<string>): number => {
  let count = 0;
  for (const token of left) if (right.has(token)) count += 1;
  return count;
};

const editDistance = (left: string, right: string): number => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0]!;
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex]!;
      row[rightIndex] = Math.min(
        row[rightIndex]! + 1,
        row[rightIndex - 1]! + 1,
        previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[right.length]!;
};

const tokensMatch = (left: string, right: string): boolean => {
  if (left === right) return true;
  if (left.length < 5 || right.length < 5) return false;
  return 1 - (editDistance(left, right) / Math.max(left.length, right.length)) >= 0.82;
};

const fuzzyIntersectionSize = (left: readonly string[], right: readonly string[]): number => {
  const usedRight = new Set<number>();
  let count = 0;
  for (const leftToken of new Set(left)) {
    const matchIndex = right.findIndex((rightToken, index) => !usedRight.has(index) && tokensMatch(leftToken, rightToken));
    if (matchIndex >= 0) {
      usedRight.add(matchIndex);
      count += 1;
    }
  }
  return count;
};

const orderedCoverage = (query: readonly string[], candidate: readonly string[]): number => {
  if (query.length === 0) return 0;
  let candidateIndex = 0;
  let matched = 0;
  for (const queryToken of query) {
    while (candidateIndex < candidate.length && candidate[candidateIndex] !== queryToken) candidateIndex += 1;
    if (candidateIndex < candidate.length) {
      matched += 1;
      candidateIndex += 1;
    }
  }
  return matched / query.length;
};

export function calculateSimilarity(query: string, candidateName: string, eligibility: SuggestionEligibility = "ELIGIBLE"): number {
  if (eligibility === "EXCLUDED") return 0;
  const normalizedQuery = normalizeDefinitionText(query);
  const normalizedCandidate = normalizeDefinitionText(candidateName);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return eligibility === "LOW_PRIORITY" ? 92 : 100;

  const queryTokens = autosuggestTokens(normalizedQuery);
  const candidateTokens = autosuggestTokens(normalizedCandidate);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const querySet = new Set(queryTokens);
  const candidateSet = new Set(candidateTokens);
  const intersection = Math.max(intersectionSize(querySet, candidateSet), fuzzyIntersectionSize(queryTokens, candidateTokens));
  const union = new Set([...querySet, ...candidateSet]).size;
  const jaccard = intersection / union;
  const queryCoverage = intersection / querySet.size;
  const candidateCoverage = intersection / candidateSet.size;
  const queryPhrase = queryTokens.join(" ");
  const candidatePhrase = candidateTokens.join(" ");

  let score = (jaccard * 45) + (queryCoverage * 25) + (candidateCoverage * 15) + (orderedCoverage(queryTokens, candidateTokens) * 10);
  if (queryPhrase === candidatePhrase) score = Math.max(score, 98);
  else if (querySet.size === candidateSet.size && intersection === querySet.size) score = Math.max(score, 96);
  else if (candidatePhrase.includes(queryPhrase) || queryPhrase.includes(candidatePhrase)) score += 8;
  else if (normalizedCandidate.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedCandidate)) score += 4;
  if (eligibility === "ELIGIBLE") score += 5;
  else score -= 18;

  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

export function matchTypeForScore(score: number): AutosuggestMatchType {
  if (score >= 90) return "EXACT_OR_NEAR_DUPLICATE";
  if (score >= 65) return "STRONG_SIMILARITY";
  return "RELATED";
}

export function rankAutosuggestCandidates(query: string, candidates: readonly AutosuggestCandidate[], limit = AUTOSUGGEST_DEFAULT_LIMIT): readonly RankedAutosuggestCandidate[] {
  const safeLimit = Math.max(1, Math.min(AUTOSUGGEST_MAX_LIMIT, Math.trunc(limit)));
  return candidates
    .map((candidate) => {
      const eligibility = classifySuggestionEligibility(candidate);
      const similarityScore = calculateSimilarity(query, candidate.name, eligibility);
      return { candidate, eligibility, similarityScore };
    })
    .filter(({ eligibility, similarityScore }) => eligibility !== "EXCLUDED" && similarityScore >= 20)
    .sort((left, right) =>
      right.similarityScore - left.similarityScore ||
      Number(right.eligibility === "ELIGIBLE") - Number(left.eligibility === "ELIGIBLE") ||
      left.candidate.code.localeCompare(right.candidate.code) ||
      left.candidate.id.localeCompare(right.candidate.id),
    )
    .slice(0, safeLimit)
    .map(({ candidate, similarityScore }) => ({
      id: candidate.id,
      code: candidate.code,
      name: candidate.name,
      normalizedName: normalizeDefinitionText(candidate.name),
      similarityScore,
      matchType: matchTypeForScore(similarityScore),
    }));
}
