/**
 * Weekly Analytics Module Types
 */

export interface Week {
  week_id: number
  week_no: number | string
  week_year: number | string
  start_date?: string
  end_date?: string
  status?: number
}

export interface Client {
  client_id: number
  name: string
  status?: number
  active?: number | string | boolean
}

export interface Subdivision {
  subdivision_id: number
  name: string
  status?: number
  active?: number | string | boolean
}

export interface WeeklyAnalyticsFilter {
  weeks: number[] | null
  clients: number[] | null
  subdivisions: number[] | null
  all_clients: boolean
  all_subdivisions: boolean
  active_checkbox: number
  active_km: number
  active_trucks: number
}

/**
 * Table structure from API response
 */
export interface WeeklyTableHeader {
  [key: string]: string
}

export interface WeeklyTableRow {
  [key: string]: any
}

export interface WeeklyTableFooter {
  [key: string]: any
}

export interface WeeklyTableContent {
  header: WeeklyTableHeader
  columns: WeeklyTableRow[]
  footer: WeeklyTableFooter
  margin?: WeeklyTableFooter
}

export interface WeeklyAnalyticsTableData {
  title: string
  table: WeeklyTableContent
}

/**
 * Matrix structure from API response
 */
export interface WeeklyMatrixContent {
  header: (string | null)[]
  columns: (string | number)[][]
  footer: (string | number)[]
}

export interface WeeklyAnalyticsMatrixData {
  title: string
  table: WeeklyMatrixContent
}

export interface WeeklyAnalyticsReport {
  title: string
  tables: WeeklyAnalyticsTableData[]
  matrices: WeeklyAnalyticsMatrixData[]
}

export interface WeeklyAnalyticsState {
  report: WeeklyAnalyticsReport | null
  isLoading: boolean
  error: string | null
}

export interface ExportParams {
  format: 'pdf' | 'xlsx'
}

