import { describe, expect, it } from "vitest";
import { defaultTargetPeriod, formatDateOnly, periodContaining, poolPeriods, resolvePoolPeriod } from "../domain/input-period.js";

describe("Input Period resolver", () => {
  it.each([
    [1, "2026-03-01", "2026-03-31"],
    [3, "2026-01-01", "2026-03-31"],
    [4, "2026-01-01", "2026-04-30"],
    [6, "2026-01-01", "2026-06-30"],
    [12, "2026-01-01", "2026-12-31"],
  ])("resolves %i-month periods", (months, expectedStart, expectedEnd) => {
    const period = periodContaining(new Date("2026-03-15T00:00:00.000Z"), months);
    expect(formatDateOnly(period.start)).toBe(expectedStart);
    expect(formatDateOnly(period.end)).toBe(expectedEnd);
  });

  it("defaults an ACTIVE monthly Pool change to the next Input Period", () => {
    const period = defaultTargetPeriod(new Date("2026-01-01T00:00:00.000Z"), new Date("2026-06-30T00:00:00.000Z"), 1, "ACTIVE", new Date("2026-03-15T00:00:00.000Z"));
    expect(formatDateOnly(period.start)).toBe("2026-04-01");
  });

  it("requires complete aligned periods and supports historical lookup", () => {
    expect(poolPeriods(new Date("2026-01-01T00:00:00.000Z"), new Date("2026-06-30T00:00:00.000Z"), 3)).toHaveLength(2);
    expect(formatDateOnly(resolvePoolPeriod(new Date("2026-01-01T00:00:00.000Z"), new Date("2026-06-30T00:00:00.000Z"), 3, "2026-04-01").end)).toBe("2026-06-30");
  });
});
