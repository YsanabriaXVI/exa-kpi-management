import { Prisma } from "@prisma/client";

// Only normalizes the measured change. Compliance, Traffic and contributions stay in scoring-engine.
export function historicalComparison(current: any, context: any) {
  const unavailable = (errorCode:string) => ({errorCode,signedChangePercent:null,achievedChangePercent:null});
  if(context?.errorCode) return unavailable(context.errorCode);
  if(!context?.resolution) return unavailable("HISTORICAL_BASELINE_MISSING");
  try {
    const baseline=new Prisma.Decimal(context.resolution.value);
    if(baseline.isZero()) return unavailable("HISTORICAL_BASELINE_ZERO_UNDEFINED");
    if(!baseline.isFinite() || baseline.lt(0)) return unavailable("HISTORICAL_BASELINE_INCOMPATIBLE");
    if(current===null) return unavailable("RESULT_MISSING");
    const signed=new Prisma.Decimal(current).minus(baseline).div(baseline).mul(100);
    const achieved=context.comparisonDirection==="REDUCTION"?signed.neg():signed;
    return {errorCode:null,signedChangePercent:signed.toString(),achievedChangePercent:achieved.toString()};
  } catch {return unavailable("HISTORICAL_BASELINE_INCOMPATIBLE");}
}
