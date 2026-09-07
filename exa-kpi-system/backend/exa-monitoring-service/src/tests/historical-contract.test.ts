import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {parseFrozenEffectiveKpiSettings} from "../contracts/frozen-effective-kpi-settings.js";
const fixture=JSON.parse(readFileSync(new URL("../../../../docs/monitoring/fixtures/historical-effective.json",import.meta.url),"utf8"));
describe("Monitoring historical frozen consumer",()=>{
  it.each(["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"])("preserves %s FINALIZED intent without live configuration lookups",ref=>{
    const snapshot={...fixture,contractVersion:"FrozenEffectiveKpiSettingsV1",periodScope:ref,comparisonMode:ref};
    const expected={...snapshot,thresholds:snapshot.thresholds.map(({id,...threshold}:any)=>threshold)};
    expect(parseFrozenEffectiveKpiSettings(snapshot)).toEqual(expected);
  });
  it("rejects historical metadata lost by legacy producers",()=>{
    const snapshot={...fixture,contractVersion:"FrozenEffectiveKpiSettingsV1"};delete snapshot.periodScope;
    expect(()=>parseFrozenEffectiveKpiSettings(snapshot)).toThrow("Incomplete frozen historical contract");
  });
});
