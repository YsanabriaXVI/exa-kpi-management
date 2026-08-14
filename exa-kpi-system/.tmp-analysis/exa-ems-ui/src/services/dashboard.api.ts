/**
 * Dashboard API Service
 * Centralized API calls for dashboard statistics and metrics
 */

import apiClient from './api/axios.config'

// Dashboard API endpoints are under /workorder-service/dashboard

export interface DashboardStats {
  tripsInProgress: number
  openWorkOrders: number
  totalWorkOrders: number
  activeTrucks: number
  totalTrucks: number
  activeDrivers: number
  totalDrivers: number
  totalClients: number
}

export interface TripStatusDistribution {
  status: string
  count: number
}

export interface WorkOrdersByClient {
  clientId: number
  clientName: string
  workOrderCount: number
}

export interface ActivityMetrics {
  totalTrips: number
  tripsInProgress: number
  totalWorkOrders: number
  openWorkOrders: number
  totalTrucks: number
  activeTrucks: number
  totalDrivers: number
  activeDrivers: number
}

export const dashboardAPI = {
  /**
   * Get overall dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/workorder-service/dashboard/stats')
    return response.data
  },

  /**
   * Get trip status distribution for charts
   */
  async getTripStatusDistribution(): Promise<TripStatusDistribution[]> {
    const response = await apiClient.get<TripStatusDistribution[]>('/workorder-service/dashboard/trips-status')
    return response.data
  },

  /**
   * Get work orders grouped by client
   * @param limit Number of top clients to return (default: 10)
   */
  async getWorkOrdersByClient(limit: number = 10): Promise<WorkOrdersByClient[]> {
    const response = await apiClient.get<WorkOrdersByClient[]>('/workorder-service/dashboard/work-orders-by-client', {
      params: { limit },
    })
    return response.data
  },

  /**
   * Get activity metrics for comparison charts
   */
  async getActivityMetrics(): Promise<ActivityMetrics> {
    const response = await apiClient.get<ActivityMetrics>('/workorder-service/dashboard/activity-metrics')
    return response.data
  },

  /**
   * Get recent trips summary
   * @param days Number of days to look back (default: 30)
   */
  async getRecentTripsSummary(days: number = 30): Promise<any> {
    const response = await apiClient.get('/workorder-service/dashboard/recent-trips', {
      params: { days },
    })
    return response.data
  },

  /**
   * Get work order status breakdown
   */
  async getWorkOrderStatusBreakdown(): Promise<any> {
    const response = await apiClient.get('/workorder-service/dashboard/work-order-status')
    return response.data
  },
}

export default dashboardAPI
