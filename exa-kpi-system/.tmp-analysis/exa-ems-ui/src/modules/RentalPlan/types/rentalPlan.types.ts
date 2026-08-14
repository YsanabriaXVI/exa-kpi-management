// src/modules/RentalPlan/types/rentalPlan.types.ts

export interface RentalPlanListItem {
  rentalPlanId: number
  planName: string
  clients: string
  status: number
}

/* -----------------------
 * Top form
 * ----------------------- */

export interface RentalPlanFormValues {
  rentalPlanId?: number
  planName: string
  taxRate: number
  clientIds: number[]
  status: number
}

/* -----------------------
 * Combo Rates
 * ----------------------- */

export interface ComboRateRow {
  rentalPlanComboId?: number
  rentalPlanId?: number

  chassisSizeId: number | null
  containerSizeId: number | null
  gensetTypeId: number | null
  rate: number | null
  period: number | null

  chassislabel: string
  containerlabel: string
  gensetLabel: string
  rateLabel: string
  periodLabel: string
}

/* -----------------------
 * Job Rates
 * ----------------------- */

export interface JobRateRow {
  rentalPlanJobRateId?: number
  rentalPlanId?: number

  jobId: number | null
  jobRate: number | null

  joblabel: string
  ratelabel: string
}

/* -----------------------
 * Full Edit Model
 * ----------------------- */

export interface RentalPlanEditModel extends RentalPlanFormValues {
  comboRates: ComboRateRow[]
  jobRates: JobRateRow[]
}
