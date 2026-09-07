import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { checkInputs, checkCards } from "./fixtures/check-results.js";
const tx=vi.hoisted(()=>({monitoringPeriod:{findUnique:vi.fn(),updateMany:vi.fn(),update:vi.fn()},monitoringPeriodInput:{findMany:vi.fn()},monitoringPeriodScorecard:{findMany:vi.fn(),updateMany:vi.fn(),update:vi.fn()},kpiResult:{update:vi.fn(),updateMany:vi.fn()},monitoringValidationRun:{aggregate:vi.fn(),create:vi.fn(),updateMany:vi.fn()},monitoringValidationIssue:{createMany:vi.fn()}}));
const db=vi.hoisted(()=>({$transaction:vi.fn()}));
vi.mock("../config/prisma.js",()=>({prisma:db}));
vi.mock("../services/result-entry.service.js",()=>({resultEntryService:{get:vi.fn().mockResolvedValue({})}}));
import { checkResultsService } from "../services/check-results.service.js";
beforeEach(()=>{
 vi.clearAllMocks();db.$transaction.mockImplementation((cb:any)=>cb(tx));
 tx.monitoringPeriod.findUnique.mockResolvedValue({id:1n,version:91,resultsVersion:4,statusId:1n,status:{code:"DRAFT"},selectedEntryMethod:"MANUAL"});
 tx.monitoringPeriod.updateMany.mockResolvedValue({count:1});tx.monitoringPeriodInput.findMany.mockResolvedValue(checkInputs());tx.monitoringPeriodScorecard.findMany.mockResolvedValue(checkCards());
 tx.monitoringValidationRun.aggregate.mockResolvedValue({_max:{runNo:9}});tx.monitoringValidationRun.create.mockResolvedValue({id:10n,createdAt:new Date()});
});
describe("Check Results transaction",()=>{
 it("records Results v4 independently of workflow v91 without writing Results or transitioning",async()=>{
  await checkResultsService.check("1",{expectedResultsVersion:4},7n);
  const created=tx.monitoringValidationRun.create.mock.calls[0]![0].data;
  expect(created).toMatchObject({runNo:10,basedOnResultsVersion:4,status:"RECORDED",scoringSnapshot:{basedOnResultsVersion:4}});
  expect(created).not.toHaveProperty("legacyWorkflowVersion");
  expect(tx.monitoringValidationRun.updateMany).not.toHaveBeenCalled();
  for(const call of tx.kpiResult.update.mock.calls)for(const forbidden of ["resultValue","revisionNo","version"])expect(call[0].data).not.toHaveProperty(forbidden);
  expect(tx.monitoringPeriod.update.mock.calls[0]![0].data).not.toHaveProperty("statusId");
  expect(tx.monitoringPeriod.update.mock.calls[0]![0].data).not.toHaveProperty("resultsVersion");
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function),{isolationLevel:"Serializable"});
 });
 it("rejects obsolete expected Results versions before scoring",async()=>{
  await expect(checkResultsService.check("1",{expectedResultsVersion:3},7n)).rejects.toMatchObject({code:"RESULT_VERSION_CONFLICT"});
  expect(tx.kpiResult.update).not.toHaveBeenCalled();expect(tx.monitoringValidationRun.create).not.toHaveBeenCalled();
 });
 it("reports a conflict when a Result writer wins the period lock",async()=>{
  tx.monitoringPeriod.updateMany.mockResolvedValue({count:0});
  await expect(checkResultsService.check("1",{expectedResultsVersion:4},7n)).rejects.toMatchObject({code:"RESULT_VERSION_CONFLICT"});
  expect(tx.monitoringValidationRun.create).not.toHaveBeenCalled();
 });
 it("translates MySQL serializable conflicts",async()=>{
  db.$transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("deadlock",{code:"P2034",clientVersion:"6"}));
  await expect(checkResultsService.check("1",{expectedResultsVersion:4},7n)).rejects.toMatchObject({code:"RESULT_VERSION_CONFLICT"});
 });
 it.each(["SUBMITTED","VALIDATED","CLOSED"])("rejects Check in %s",async status=>{
  tx.monitoringPeriod.findUnique.mockResolvedValue({status:{code:status}});
  await expect(checkResultsService.check("1",{expectedResultsVersion:4},7n)).rejects.toMatchObject({code:"MONITORING_PERIOD_NOT_DRAFT"});
 });
 it("requires Manual and rejects client-calculated fields",async()=>{
  await expect(checkResultsService.check("1",{expectedResultsVersion:4,compliance:100} as any,7n)).rejects.toThrow();
  tx.monitoringPeriod.findUnique.mockResolvedValue({status:{code:"DRAFT"},resultsVersion:4,selectedEntryMethod:null});
  await expect(checkResultsService.check("1",{expectedResultsVersion:4},7n)).rejects.toMatchObject({code:"ENTRY_METHOD_CONFLICT"});
 });
});
