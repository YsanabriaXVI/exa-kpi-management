import { describe, expect, it } from "vitest";
import { addPeriodKpisBodySchema, updatePeriodWeightsBodySchema } from "../schemas/scorecard.schema.js";
import { hasCircularLink } from "../services/scorecard-composition.service.js";

describe("Scorecard period composition rules", () => {
  it("detects direct and transitive circular linked Scorecards", () => {
    expect(hasCircularLink(new Map([["1", ["2"]], ["2", ["1"]]]), "1")).toBe(true);
    expect(hasCircularLink(new Map([["1", ["2"]], ["2", ["3"]], ["3", ["1"]]]), "1")).toBe(true);
    expect(hasCircularLink(new Map([["1", ["2"]], ["2", ["3"]]]), "1")).toBe(false);
  });

  it("allows zero while preparing and rejects invalid weights", () => {
    expect(addPeriodKpisBodySchema.safeParse({ items: [{ poolMembershipExternalId: "10", weight: 25.1234 }] }).success).toBe(true);
    expect(addPeriodKpisBodySchema.safeParse({ items: [{ poolMembershipExternalId: "10", weight: 0 }] }).success).toBe(true);
    expect(addPeriodKpisBodySchema.safeParse({ items: [{ poolMembershipExternalId: "10", weight: -1 }] }).success).toBe(false);
    expect(updatePeriodWeightsBodySchema.safeParse({ kpis: [{ kpiConfigurationExternalId: "3", weight: 100.0001 }], linkedScorecards: [] }).success).toBe(false);
  });
});
