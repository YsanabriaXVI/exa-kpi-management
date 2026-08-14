/**
 * Weekly Analytics API
 */

import apiClient from '../../../services/api/axios.config'
import type {
  WeeklyAnalyticsFilter,
  WeeklyAnalyticsReport,
  ExportParams,
} from '../types'

export const weeklyAnalyticsAPI = {
  /**
   * Generate weekly analytics report
   */
  generateReport: async (filter: WeeklyAnalyticsFilter): Promise<WeeklyAnalyticsReport> => {
    console.log('[WeeklyAnalytics API] Generating report with filter:', filter)
    const response = await apiClient.post('/reports/weeksummary', filter)
    console.log('[WeeklyAnalytics API] Raw response:', response.data)
    
    // Handle nested response structure: { status, code, data: { report: {...} } }
    const report = response.data?.data?.report || response.data?.report || response.data
    console.log('[WeeklyAnalytics API] Extracted report:', report)
    
    return report
  },

  /**
   * Export report to PDF or Excel
   */
  exportReport: async (
    filter: WeeklyAnalyticsFilter,
    params: ExportParams,
  ): Promise<Blob> => {
    const response = await apiClient.post(
      `/reports/export/week_report/${params.format}`,
      filter,
      {
        responseType: 'blob',
      },
    )
    return response.data
  },
}

