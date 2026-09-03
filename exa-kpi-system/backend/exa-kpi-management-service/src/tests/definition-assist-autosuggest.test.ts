import { describe, expect, it } from "vitest";
import {
  calculateSimilarity, classifySuggestionEligibility, rankAutosuggestCandidates,
} from "../definition-assist/index.js";

const candidates = [
  { id: "1", code: "KPI-001", name: "Costo por km de cabezales", description: "Costo operativo por kilómetro" },
  { id: "2", code: "KPI-002", name: "Venta de contenedores", description: "Ventas de contenedores" },
  { id: "3", code: "KPI-003", name: "Cero accidentes", description: "Incidentes de seguridad" },
  { id: "4", code: "KPI-004", name: "Costo por km cabezales", description: "Operational Template" },
] as const;

describe("Definition Assist Autosuggest ranking", () => {
  it("treats normalized accents, case and punctuation as an exact match", () => {
    expect(calculateSimilarity("CÓSTO por KM — Cabezales", "costo por km - cabezales")).toBe(100);
  });

  it("ranks reordered equivalent tokens as a near duplicate", () => {
    const ranked = rankAutosuggestCandidates("cabezales costo km", candidates);
    expect(ranked[0]).toMatchObject({ id: "1", matchType: "EXACT_OR_NEAR_DUPLICATE" });
  });

  it("finds a relevant partial phrase across business inflections", () => {
    const ranked = rankAutosuggestCandidates("Vender contenedores por mes", candidates);
    expect(ranked[0]).toMatchObject({ id: "2" });
    expect(ranked[0]?.similarityScore).toBeGreaterThanOrEqual(20);
  });

  it("does not rank an unrelated KPI as strong similarity", () => {
    const ranked = rankAutosuggestCandidates("Cero accidentes", candidates);
    expect(ranked.find(({ id }) => id === "2")?.matchType).not.toBe("STRONG_SIMILARITY");
    expect(ranked[0]).toMatchObject({ id: "3", matchType: "EXACT_OR_NEAR_DUPLICATE" });
  });

  it("ranks an eligible Definition above equivalent template data", () => {
    const ranked = rankAutosuggestCandidates("costo por km cabezales", candidates);
    expect(classifySuggestionEligibility(candidates[3])).toBe("LOW_PRIORITY");
    expect(ranked[0]?.id).toBe("1");
    expect(ranked.findIndex(({ id }) => id === "1")).toBeLessThan(ranked.findIndex(({ id }) => id === "4"));
  });

  it("excludes administrative records and applies the requested limit", () => {
    const input = [...candidates, { id: "5", code: "KPI-005", name: "SCORE CARD Grupo EXA", description: "Linked Scorecard" }];
    const ranked = rankAutosuggestCandidates("costo km", input, 1);
    expect(ranked).toHaveLength(1);
    expect(ranked.some(({ id }) => id === "5")).toBe(false);
  });

  it("is deterministic and does not mutate candidates", () => {
    const snapshot = structuredClone(candidates);
    const first = rankAutosuggestCandidates("costo por km cabezales", candidates);
    const second = rankAutosuggestCandidates("costo por km cabezales", candidates);
    expect(second).toEqual(first);
    expect(candidates).toEqual(snapshot);
  });
});
