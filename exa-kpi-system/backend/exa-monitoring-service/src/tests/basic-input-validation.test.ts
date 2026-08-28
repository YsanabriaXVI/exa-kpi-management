import { describe, expect, it } from "vitest";
import { saveResultEntryBodySchema } from "../schemas/monitoring-period.schema.js";

const body = (resultValue: string | null) => ({ changes: [{ monitoringPeriodInputId: "1", resultValue, comment: null, version: null }] });

describe("Basic Input Validation V1", () => {
  it("accepts zero and null as distinct valid Draft inputs", () => {
    expect(saveResultEntryBodySchema.safeParse(body("0")).success).toBe(true);
    expect(saveResultEntryBodySchema.safeParse(body(null)).success).toBe(true);
  });

  it("rejects non-numeric input and values exceeding DECIMAL(20,6) without truncation", () => {
    const nonNumeric = saveResultEntryBodySchema.safeParse(body("abc"));
    const excessiveScale = saveResultEntryBodySchema.safeParse(body("1.1234567"));
    const excessivePrecision = saveResultEntryBodySchema.safeParse(body("123456789012345"));
    expect(nonNumeric.success).toBe(false);
    expect(excessiveScale.success).toBe(false);
    expect(excessivePrecision.success).toBe(false);
  });
});
