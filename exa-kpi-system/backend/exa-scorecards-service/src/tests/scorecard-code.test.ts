import { describe, expect, it } from "vitest";
import { formatScorecardCode, normalizeAreaScope } from "../utils/scorecard-code.js";
describe("Scorecard code", () => {
  it("formats canonical scope/year codes", () => expect(formatScorecardCode("OPS", 1, 2026)).toBe("SC-OPS-01-2026"));
  it("normalizes deterministic multi-area scopes", () => expect(normalizeAreaScope(["SEG", "ops", "OPS"])).toBe("OPS-SEG"));
  it("rejects empty scopes", () => expect(() => normalizeAreaScope([])).toThrow());
});
