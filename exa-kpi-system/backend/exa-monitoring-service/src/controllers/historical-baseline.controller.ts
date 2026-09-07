import type { Request,Response,NextFunction } from "express";
import { baselineParams,baselineQuery,selectedBaselineBody,manualBaselineBody,historicalBaselineService } from "../services/historical-baseline.service.js";
export async function baselineCandidates(req:Request,res:Response,next:NextFunction) {
  try {const {id,inputId}=baselineParams.parse(req.params);res.json(await historicalBaselineService.candidates(id,inputId,baselineQuery.parse(req.query)));} catch(e){next(e);}
}
export async function baselineHistory(req:Request,res:Response,next:NextFunction) {
  try {const {id,inputId}=baselineParams.parse(req.params);res.json(await historicalBaselineService.history(id,inputId));} catch(e){next(e);}
}
export async function selectBaseline(req:Request,res:Response,next:NextFunction) {
  try {const {id,inputId}=baselineParams.parse(req.params);res.json(await historicalBaselineService.save(id,inputId,selectedBaselineBody.parse(req.body),req.identity.actorUserId));} catch(e){next(e);}
}
export async function manualBaseline(req:Request,res:Response,next:NextFunction) {
  try {const {id,inputId}=baselineParams.parse(req.params);res.json(await historicalBaselineService.save(id,inputId,manualBaselineBody.parse(req.body),req.identity.actorUserId));} catch(e){next(e);}
}
