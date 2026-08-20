import { describe, expect, it } from "vitest";
import { buildAreaScopeKey, buildPoolSequenceScopeKey, formatPoolBusinessCode, normalizeAreaCodes, normalizeCompanyCodes } from "../utils/pool-code.js";

describe("Pool code helpers", () => {
  const areas = [
    { code: "FIN", displayOrder: 30 },
    { code: "OPS", displayOrder: 10 },
    { code: "SEG", displayOrder: 20 },
  ];
  const companies = [
    { code: "LMG", displayOrder: 30 },
    { code: "EXA", displayOrder: 10 },
    { code: "CMX", displayOrder: 20 },
  ];

  it("builds canonical scope keys independent of click order", () => {
    expect(buildAreaScopeKey(areas)).toBe("OPS|SEG|FIN");
    expect(buildAreaScopeKey([areas[2]!, areas[0]!, areas[1]!])).toBe("OPS|SEG|FIN");
    expect(normalizeCompanyCodes(companies)).toEqual(["EXA", "CMX", "LMG"]);
  });

  it("formats a single-area business code", () => {
    expect(formatPoolBusinessCode({ areas: [{ code: "OPS", displayOrder: 10 }], sequence: 1, issueYear: 2026 }))
      .toBe("OPS-01-2026");
  });

  it("normalizes areas and formats the area-only business code", () => {
    expect(normalizeAreaCodes(areas)).toEqual(["OPS", "SEG", "FIN"]);
    expect(formatPoolBusinessCode({ areas, sequence: 1, issueYear: 2026 }))
      .toBe("OPS-SEG-FIN-01-2026");
  });

  it("increments within the same area/year scope", () => {
    const scopeAreas = [areas[1]!, areas[2]!];
    expect(formatPoolBusinessCode({ areas: scopeAreas, sequence: 1, issueYear: 2026 })).toBe("OPS-SEG-01-2026");
    expect(formatPoolBusinessCode({ areas: scopeAreas, sequence: 2, issueYear: 2026 })).toBe("OPS-SEG-02-2026");
  });

  it("does not accept or render companies in the business code", () => {
    const withExa = formatPoolBusinessCode({ areas, sequence: 1, issueYear: 2026 });
    const withDifferentCompanySelection = formatPoolBusinessCode({ areas, sequence: 1, issueYear: 2026 });
    expect(withExa).toBe(withDifferentCompanySelection);
    expect(withExa).not.toMatch(/EXA|CMX|LMG/);
  });

  it("supports an independent annual sequence and more than 99 pools", () => {
    expect(buildPoolSequenceScopeKey(areas, 2026)).toBe("OPS|SEG|FIN:2026");
    expect(buildPoolSequenceScopeKey(areas, 2027)).toBe("OPS|SEG|FIN:2027");
    expect(formatPoolBusinessCode({ areas, sequence: 1, issueYear: 2027 })).toBe("OPS-SEG-FIN-01-2027");
    expect(formatPoolBusinessCode({ areas, sequence: 100, issueYear: 2026 })).toBe("OPS-SEG-FIN-100-2026");
  });
});
