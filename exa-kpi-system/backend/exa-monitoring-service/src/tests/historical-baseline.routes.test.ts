import request from "supertest";
import {beforeEach,describe,it,expect,vi} from "vitest";
const service=vi.hoisted(()=>({candidates:vi.fn(),history:vi.fn(),save:vi.fn()}));
vi.mock("../services/historical-baseline.service.js",async original=>({...await original<object>(),historicalBaselineService:service}));
import {createApp} from "../app.js";
const url="/api/v1/monitoring-periods/1/inputs/2";
beforeEach(()=>{vi.clearAllMocks();service.candidates.mockResolvedValue({candidates:[]});service.save.mockResolvedValue({baselineVersion:1});service.history.mockResolvedValue({revisions:[]});});
describe("Baseline API contracts",()=>{
  it("owns candidate search filters and history",async()=>{
    expect((await request(createApp()).get(url+"/baseline-candidates?query=Sales&pool=5&scorecard=8")).status).toBe(200);
    expect(service.candidates).toHaveBeenCalledWith("1","2",{query:"Sales",pool:"5",scorecard:"8",page:1});
    expect((await request(createApp()).get(url+"/baseline-resolution/history")).status).toBe(200);
  });
  it("accepts only a source ID for USER_MATCH",async()=>{
    expect((await request(createApp()).put(url+"/baseline-resolution").send({expectedBaselineVersion:2,sourceResultId:"9"})).status).toBe(200);
    expect(service.save).toHaveBeenCalledWith("1","2",{expectedBaselineVersion:2,sourceResultId:"9"},expect.any(BigInt));
  });
  it.each([{expectedBaselineVersion:2,sourceResultId:"9",baselineValue:"999"},
    {expectedBaselineVersion:2,sourceResultId:"9",period:"2025-01"}, {expectedBaselineVersion:-1,sourceResultId:"9"}])("rejects spoofed source context %j",async body=>{
      expect((await request(createApp()).put(url+"/baseline-resolution").send(body)).status).toBe(400);expect(service.save).not.toHaveBeenCalled();
    });
  it("validates manual provenance and prevents changing required unit/period",async()=>{
    const valid={expectedBaselineVersion:0,value:"100000",reason:"Historical ERP export",sourceReference:"ERP export for required reference period"};
    expect((await request(createApp()).post(url+"/baseline-resolution/manual").send(valid)).status).toBe(200);
    for(const body of [{...valid,sourceReference:""},{...valid,sourceReference:undefined},{...valid,reason:"short"},{...valid,unit:"EUR"},{...valid,period:"2025-01"},{...valid,value:"-1"},{...valid,value:"Infinity"}]) {
      expect((await request(createApp()).post(url+"/baseline-resolution/manual").send(body)).status).toBe(400);
    }
  });
});
