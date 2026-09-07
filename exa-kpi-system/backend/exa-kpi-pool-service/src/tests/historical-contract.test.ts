import {readFileSync} from "node:fs";
import {afterEach,describe,it,expect,vi} from "vitest";
import {kpiManagementClient} from "../clients/kpi-management.client.js";
const fixture=JSON.parse(readFileSync(new URL("../../../../docs/monitoring/fixtures/historical-effective.json",import.meta.url),"utf8"));
afterEach(()=>vi.unstubAllGlobals());
describe("Pool historical effective contract",()=>{
  it.each(["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"])("explicitly retains historical %s fields from producer",async ref=>{
    const snapshot={...fixture,periodScope:ref,comparisonMode:ref};
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({data:[snapshot]})}));
    expect(await kpiManagementClient.effectiveSnapshot("5","2026-08-01","2026-08-31")).toMatchObject(snapshot);
  });
  it("rejects a legacy historical snapshot without direction",async()=>{
    const snapshot={...fixture};delete snapshot.comparisonDirection;
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({data:[snapshot]})}));
    await expect(kpiManagementClient.effectiveSnapshot("5","2026-08-01","2026-08-31")).rejects.toMatchObject({code:"HISTORICAL_CONTRACT_INVALID"});
  });
});
