/**
 * Custom Report Builder API
 */

import apiClient from '../../../services/api/axios.config'
import type {
  ReportBuilderWizardData,
  EntityIds,
  ReportResultTable,
  ExportReportParams,
} from '../types'

export const reportBuilderAPI = {
  /**
   * Get available entities based on selected sections and date range
   */
  getAvailableEntities: async (
    data: Partial<ReportBuilderWizardData>,
  ): Promise<EntityIds> => {
    console.log('=== API getAvailableEntities ===')
    console.log('Request data:', data)
    const response = await apiClient.post<{ entities: Record<string, number[]>; data?: any }>(
      '/reports/summary/entities',
      data,
    )
    console.log('Response data:', response.data)
    const entities = (response.data as any)?.entities ?? (response.data as any)?.data?.entities ?? {}
    return entities as unknown as EntityIds
  },

  /**
   * Generate custom report
   */
  generateReport: async (data: ReportBuilderWizardData): Promise<ReportResultTable[]> => {
    console.log('=== API generateReport ===')
    console.log('Request data:', JSON.stringify(data, null, 2))
    const response = await apiClient.post<{ report: ReportResultTable[]; data?: any }>(
      '/reports/summary',
      data,
    )
    const body = response.data as any
    return body.report || body?.data?.report || []
  },

  /**
   * Export report to Excel
   */
  exportReport: async (
    data: ReportBuilderWizardData,
    params: ExportReportParams,
  ): Promise<Blob> => {
    const response = await apiClient.post(
      `/reports/export/summary_report/${params.format}`,
      data,
      {
        responseType: 'blob',
      },
    )
    return response.data
  },
}
