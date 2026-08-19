import request from "supertest";
import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({list:vi.fn(),get:vi.fn(),create:vi.fn(),update:vi.fn(),deactivate:vi.fn(),softDelete:vi.fn()}));
vi.mock("../services/kpi-configuration.service.js",()=>({kpiConfigurationService:mocks}));
import {app} from "../app.js";
const record={id:1,code:"KPC-049-01",definitionId:49,definitionCode:"KPI-049",definitionName:"Costs",goal:20,measurementUnit:"%",evaluationType:"Lower is better",dataSource:"EMS",ranges:{redFrom:0,redTo:30,yellowFrom:31,yellowTo:65,greenFrom:66,greenTo:100},usedIn:0,status:"CONFIGURED",createdAt:"2026-01-01",createdBy:"System",updatedAt:"2026-01-01",updatedBy:"System",poolNames:[]};
const body={definitionId:49,goal:20,measurementUnit:"%",dataSource:"EMS",ranges:record.ranges,isActive:true};
beforeEach(()=>{vi.clearAllMocks();mocks.list.mockResolvedValue({data:[],meta:{page:1,pageSize:20,totalItems:0,totalPages:0}})});
describe("KPI Configuration API",()=>{
 it("lists configurations",async()=>expect((await request(app).get("/api/v1/kpi-configurations")).status).toBe(200));
 it("gets a configuration",async()=>{mocks.get.mockResolvedValue(record);expect((await request(app).get("/api/v1/kpi-configurations/1")).body.data.code).toBe(record.code)});
 it("creates a validated configuration",async()=>{mocks.create.mockResolvedValue(record);expect((await request(app).post("/api/v1/kpi-configurations").send(body)).status).toBe(201)});
 it("rejects invalid ranges payload",async()=>expect((await request(app).post("/api/v1/kpi-configurations").send({...body,ranges:{}})).status).toBe(400));
 it("accepts continuous Red, Yellow, Green score ranges",async()=>{mocks.create.mockResolvedValue(record);expect((await request(app).post("/api/v1/kpi-configurations").send({...body,ranges:{redFrom:0,redTo:64,yellowFrom:65,yellowTo:79,greenFrom:80,greenTo:100}})).status).toBe(201)});
 it("rejects inverted color ranges",async()=>expect((await request(app).post("/api/v1/kpi-configurations").send({...body,ranges:{redFrom:66,redTo:100,yellowFrom:31,yellowTo:65,greenFrom:0,greenTo:30}})).status).toBe(400));
 it("deactivates a configuration",async()=>{mocks.deactivate.mockResolvedValue({...record,status:"INACTIVE"});expect((await request(app).patch("/api/v1/kpi-configurations/1/deactivate")).body.data.status).toBe("INACTIVE")});
 it("soft deletes without physically deleting the record",async()=>{mocks.softDelete.mockResolvedValue(record);expect((await request(app).delete("/api/v1/kpi-configurations/1")).status).toBe(200);expect(mocks.softDelete).toHaveBeenCalledWith(1n,null)});
});
