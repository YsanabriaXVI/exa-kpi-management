import { describe, expect, it } from "vitest";
import { averageOf, comparisonResult, difference, latestResults, percent, type OfficialResult } from "./official-results";

const card = (id: string, sequenceNo: number, score: string | null = "0") => ({
  id, scorecardId: "7", code: "SC-7", poolId: "9", frequencyCode: "MONTHLY", sequenceNo,
  periodKey: `2026-${String(sequenceNo).padStart(2, "0")}`,
  periodStart: `2026-${String(sequenceNo).padStart(2, "0")}-01`,
  periodEnd: `2026-${String(sequenceNo).padStart(2, "0")}-28`, score,
}) as OfficialResult;

describe("official report comparisons", () => {
  it("selects the latest calendar result regardless of ID, arrival order or missing score", () => {
    const older = card("99", 8, "90");
    const newest = card("1", 10, null);
    expect(latestResults([newest, older, card("4", 9)])).toEqual([newest]);
  });
  it("does not skip missing periods or compare a different Pool or frequency", () => {
    const current = card("1", 10);
    expect(comparisonResult([card("2", 8)], current, "Previous Period")).toBeUndefined();
    expect(comparisonResult([{ ...card("3", 9), poolId: "10" }], current, "Previous Period")).toBeUndefined();
    expect(comparisonResult([{ ...card("3", 9), frequencyCode: "QUARTERLY" }], current, "Previous Period")).toBeUndefined();
    expect(comparisonResult([card("3", 9)], current, "Previous Period")?.id).toBe("3");
  });
  it("keeps zero distinct from unavailable values in summaries and differences", () => {
    expect(percent(null)).toBe("—");
    expect(percent("0")).toBe("0.00%");
    expect(averageOf([null, "0", "80"])).toBe(40);
    expect(averageOf([null])).toBeNull();
    expect(difference(null, "20")).toBeNull();
    expect(difference("0", "20")).toBe(-20);
  });
});
