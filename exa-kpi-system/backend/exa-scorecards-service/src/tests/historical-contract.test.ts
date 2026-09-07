import {readFileSync} from "node:fs";
import {describe,it,expect} from "vitest";
import {parseEffectiveKpiSettings,freezeEffectiveKpiSettings} from "../contracts/frozen-effective-kpi-settings.js";
const fixture=JSON.parse(readFileSync(new URL("../../../../docs/monitoring/fixtures/historical-effective.json",import.meta.url),"utf8"));
describe("Scorecard FINALIZED historical contract",()=>{
  it.each(["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"])("freezes canonical %s context from Pool",ref=>{
    const snapshot={...fixture,periodScope:ref,comparisonMode:ref};
    expect(freezeEffectiveKpiSettings(parseEffectiveKpiSettings(snapshot))).toEqual({...snapshot,contractVersion:"FrozenEffectiveKpiSettingsV1"});
  });
  it("does not finalize absent historical intent or invalid change target",()=>{
    for(const patch of [{targetKind:undefined},{goal:"0"},{comparisonDirection:null},{inputFrequency:undefined}])
      expect(()=>parseEffectiveKpiSettings({...fixture,...patch})).toThrow();
  });
});
