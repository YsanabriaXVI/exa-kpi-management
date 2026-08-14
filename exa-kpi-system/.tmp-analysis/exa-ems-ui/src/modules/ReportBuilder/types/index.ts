/**
 * Custom Report Builder Module Types
 */

export interface ReportBuilderWizardData {
  // Step 1: Date Range & Data Types
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  axis: 'x' | 'y'
  multi: boolean
  data_types?: string[]
  start_date?: number // unix timestamp
  end_date?: number // unix timestamp

  // Step 2: Sections Selection
  sections?: string[]

  // Step 3: Entity Filters
  clients?: number[]
  subdivisions?: number[]
  drivers?: number[]
  trucks?: number[]
  routes?: number[]
  locations?: number[]

  // "Select All" flags
  clients_all: boolean
  subdivisions_all: boolean
  drivers_all: boolean
  trucks_all: boolean
  routes_all: boolean
  locations_all: boolean
}

export interface ReportSection {
  value: string
  label: string
}

export interface DataType {
  value: string
  label: string
}

export interface EntityIds {
  clients?: number[]
  subdivisions?: number[]
  drivers?: number[]
  trucks?: number[]
  routes?: number[]
  locations?: number[]
}

export interface ReportEntityLists {
  clients?: SelectOption[]
  subdivisions?: SelectOption[]
  drivers?: SelectOption[]
  trucks?: SelectOption[]
  routes?: SelectOption[]
  locations?: SelectOption[]
}

export interface SelectOption {
  value: string
  label: string
  selected?: boolean
}

export interface ReportResultTable {
  title: string
  columns: string[]
  rows: any[][]
  totals?: any[]
}

export interface ReportBuilderState {
  report: ReportResultTable[] | null
  isLoading: boolean
  error: string | null
  availableEntities: EntityIds | null
}

export interface GenerateReportPayload extends ReportBuilderWizardData {}

export interface ExportReportParams {
  format: 'xlsx'
}
