import {afterEach,expect,it,vi} from "vitest";
import {deriveInputPeriods} from "./pool-schedule";
afterEach(()=>vi.useRealTimers());
it("builds the historical business schedule independently of browser time",()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date("2026-09-07"));
  const periods=deriveInputPeriods("2023-01-01","2023-12-31","MONTHLY");
  expect(periods).toHaveLength(12);
  expect(periods[0]?.start).toBe("2023-01-01");
  expect(periods[11]?.end).toBe("2023-12-31");
  expect(deriveInputPeriods("2024-08-01","2024-08-31","MONTHLY")[0]?.start).toBe("2024-08-01");
});
