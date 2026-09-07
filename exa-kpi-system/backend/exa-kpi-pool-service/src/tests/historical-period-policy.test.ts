import {afterEach,expect,it,vi} from "vitest";
import {poolPeriods,resolvePoolPeriod,defaultTargetPeriod} from "../domain/input-period.js";
import {createKpiPoolBodySchema} from "../schemas/kpi-pool.schema.js";
import {periodFinalizationGateway} from "../gateways/period-finalization.gateway.js";
afterEach(()=>vi.useRealTimers());
it.each(["2023-01","2023-12","2024-08"])("allows %s when the system clock is 2026",key=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-09-07"));
  const start=new Date(`${key}-01`),end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0));
  const body={poolName:"Historical",poolAreaIds:["1"],companyIds:["1"],inputFrequencyId:"1",validFrom:`${key}-01`,validTo:end.toISOString().slice(0,10)};
  expect(createKpiPoolBodySchema.safeParse(body).success).toBe(true);
  expect(defaultTargetPeriod(start,end,1,"ACTIVE").start).toEqual(start);
});
it("preserves structural schedule validation",()=>{
  const a=new Date("2023-01-01"),b=new Date("2023-12-31");
  expect(poolPeriods(a,b,1)).toHaveLength(12);
  expect(()=>poolPeriods(b,a,1)).toThrow();
  expect(()=>poolPeriods(a,b,2)).toThrow();
  expect(()=>poolPeriods(new Date("2023-02-01"),b,3)).toThrow();
  for(const key of ["2022-12-01","2023-01-02","2023-13-01","invalid"]) expect(()=>resolvePoolPeriod(a,b,1,key)).toThrow();
  const body={poolName:"Historical",poolAreaIds:["1"],companyIds:["1"],inputFrequencyId:"1",validFrom:"2023-02-30",validTo:"2023-03-31"};
  expect(createKpiPoolBodySchema.safeParse(body).success).toBe(false);
});
it("starts at January without December 2022 and keeps February's closure gate",async()=>{
  const periods=poolPeriods(new Date("2023-01-01"),new Date("2023-12-31"),1);
  const provider={getStatus:vi.fn().mockResolvedValue("OPEN")};
  expect(await periodFinalizationGateway.evaluate(1n,periods,0,provider)).toMatchObject({canFinalize:true,previousMonitoringStatus:"NOT_REQUIRED"});
  expect(provider.getStatus).not.toHaveBeenCalled();
  expect(await periodFinalizationGateway.evaluate(1n,periods,1,provider)).toMatchObject({canFinalize:false,previousPeriodStart:"2023-01-01"});
  provider.getStatus.mockResolvedValue("CLOSED");
  expect(await periodFinalizationGateway.evaluate(1n,periods,1,provider)).toMatchObject({canFinalize:true});
});
