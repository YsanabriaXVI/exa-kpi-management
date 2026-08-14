export type AppType = 'carrier' | 'shipper' | 'operations'

export interface MobileFieldDefinition {
  key: string
  label: string
  section: string
  description?: string
}

export const MOBILE_FIELD_CATALOG: Record<AppType, MobileFieldDefinition[]> = {
  carrier: [
    { key: 'trip.driver_assignment', label: 'Truck & Driver Assignment', section: 'Trip' },
    { key: 'trip.subdivision', label: 'Subdivision', section: 'Trip' },
    { key: 'trip.route', label: 'Route', section: 'Trip' },
    { key: 'trip.client', label: 'Client', section: 'Trip' },
    { key: 'trip.charges', label: 'Charges', section: 'Trip' },
    { key: 'trip.notes', label: 'Notes', section: 'Trip' },
  ],
  shipper: [
    { key: 'trip.driver_assignment', label: 'Truck & Driver Assignment', section: 'Trip' },
    { key: 'trip.subdivision', label: 'Subdivision', section: 'Trip' },
    { key: 'trip.charges', label: 'Charges', section: 'Trip' },
  ],
  operations: [
    { key: 'trip.driver_assignment', label: 'Truck & Driver Assignment', section: 'Trip' },
    { key: 'trip.subdivision', label: 'Subdivision', section: 'Trip' },
    { key: 'trip.route', label: 'Route', section: 'Trip' },
    { key: 'trip.client', label: 'Client', section: 'Trip' },
    { key: 'trip.charges', label: 'Charges', section: 'Trip' },
    { key: 'trip.notes', label: 'Notes', section: 'Trip' },
  ],
}

export const APP_TYPE_LABELS: Record<AppType, string> = {
  carrier: 'Carrier',
  shipper: 'Shipper',
  operations: 'Operations',
}

export const APP_TYPES: AppType[] = ['carrier', 'shipper', 'operations']
