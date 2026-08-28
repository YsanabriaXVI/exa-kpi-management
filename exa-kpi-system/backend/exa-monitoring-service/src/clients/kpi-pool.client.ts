import { env } from "../config/env.js"; import { AppError } from "../utils/app-error.js"; import { serviceRequest } from "./http.client.js";
export type Pool={id:string;poolCode:string;poolName:string;status:string;inputFrequency:{id:string;code:string};companies:Array<{id:string;code:string;name:string}>};
export type PoolPeriod={poolPeriodId:string|null;poolCompositionId:string|null;periodKey:string;start:string;end:string;workflowStatus:string};
export const kpiPoolClient={
  async get(poolId:string){return(await serviceRequest<{data:Pool}>("KPI Pool",env.KPI_POOL_BASE_URL,`/api/v1/kpi-pools/${poolId}`)).data;},
  async periods(poolId:string){return(await serviceRequest<{data:PoolPeriod[]}>("KPI Pool",env.KPI_POOL_BASE_URL,`/api/v1/kpi-pools/${poolId}/input-periods`)).data;},
  async context(poolId:string,poolInputPeriodId:string){const [pool,periods]=await Promise.all([this.get(poolId),this.periods(poolId)]);const period=periods.find((item)=>item.poolPeriodId===poolInputPeriodId);if(!period)throw new AppError(404,"POOL_INPUT_PERIOD_NOT_FOUND","The Pool Input Period does not belong to the selected KPI Pool");return{pool,period};}
};
