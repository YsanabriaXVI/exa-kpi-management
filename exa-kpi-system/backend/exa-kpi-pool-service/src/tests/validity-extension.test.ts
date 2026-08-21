import { describe, expect, it } from "vitest";
import { formatDateOnly } from "../domain/input-period.js";
import { validateValidityExtension } from "../services/kpi-pool.service.js";

describe("KPI Pool validity extension", () => {
  it("adds only consecutive periods after the current end", () => {
    const result = validateValidityExtension(
      "ACTIVE",
      new Date("2026-08-01T00:00:00.000Z"),
      new Date("2026-12-31T00:00:00.000Z"),
      new Date("2027-03-31T00:00:00.000Z"),
      1,
    );
    expect(result.addedPeriods.map((period) => formatDateOnly(period.start))).toEqual(["2027-01-01", "2027-02-01", "2027-03-01"]);
  });

  it("rejects shrinking or keeping the same end", () => {
    expect(() => validateValidityExtension("ACTIVE", new Date("2026-08-01"), new Date("2026-12-31"), new Date("2026-12-31"), 1)).toThrowError(expect.objectContaining({ code: "POOL_VALIDITY_MUST_EXTEND" }));
  });

  it("rejects extension for a Pool that is not ACTIVE", () => {
    expect(() => validateValidityExtension("DRAFT", new Date("2026-08-01"), new Date("2026-12-31"), new Date("2027-01-31"), 1)).toThrowError(expect.objectContaining({ code: "POOL_VALIDITY_EXTENSION_NOT_ALLOWED" }));
  });

  it("rejects an end that is not aligned to the Pool frequency", () => {
    expect(() => validateValidityExtension("ACTIVE", new Date("2026-01-01"), new Date("2026-06-30"), new Date("2026-08-31"), 3)).toThrowError(expect.objectContaining({ code: "POOL_VALIDITY_NOT_PERIOD_ALIGNED" }));
  });
});
