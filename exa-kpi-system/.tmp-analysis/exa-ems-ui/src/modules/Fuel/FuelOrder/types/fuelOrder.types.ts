export interface RouteLeg {
  fromCityId?: number | null
  fromCityName?: string
  toCityId?: number | null
  toCityName?: string
}

export interface TripDetail {
  tripsid?: number
  workorderid?: number
  workOrderId?: number
  referenceNumber?: string
  pickupCity?: string
  deliveryCity?: string
  returnCity?: string
  returncity?: string
  clientName?: string
  routeName?: string
  subdivisionName?: string
  inventoryName?: string
  cargoDescription?: string
  containertypeid?: number
  containerTypeId?: number
}

export interface FuelAuditorData {
  gasStationTransactionId?: number | null
  licensePlate?: string
  fuelType?: string
  measureUnit?: string
  unitPrice?: number | null
  quantity?: number | null
  currency?: string
  amount?: number | null
  transactionId?: string
  documentNumber?: string
  paymentMethod?: string
  dateTime?: string
}

export interface ReconciliationData {
  gasStationTransactionId?: number
  licensePlate?: string
  fuelType?: string
  measureUnit?: string
  unitPrice?: number | null
  quantity?: number | null
  currency?: string
  amount?: number | null
  transactionId?: string
  documentNumber?: string
  paymentMethod?: string
  dateTime?: string
}

export interface FuelPriceData {
  price?: number | null
  currency?: string
}

export interface GasStationInfo {
  gasStationsId?: number
  name?: string
  email?: string
  phone?: string
  address?: string
  cityName?: string
  departmentName?: string
  parentName?: string
}

export interface EquipmentDetail {
  plate?: string
  chassis?: string
  serial?: string
  brand?: string
  model?: string
  year?: number
  color?: string
}

export interface DriverOption {
  value?: number | string
  label?: string
  driverId?: number
  name?: string
  firstName?: string
  lastName?: string
}

export interface EquipmentSearchResult {
  assetsid: number
  truck_plate?: string
  serial_no?: string
  model?: string
  personal_identification?: string
  name?: string
}

export interface FuelOrder {
  fuelOrderId: number
  companyId?: number
  tripId?: number | null
  tripsid?: number | null
  plate?: string
  gasStationsId?: number | null
  gasStationsParentId?: number | null
  gasStationName?: string
  orderType?: number | null
  orderTypeName?: string
  typeContainer?: number | null
  typeContainerName?: string
  fuelType?: number | null
  fuelTypeName?: string
  fuelTank?: number | null
  fuelTankLiters?: number | null
  fuelRequest?: number | null
  fuelRequestLtr?: number | null
  fuelRequestLiters?: number | null
  suggested?: number | null
  supplied?: number | null
  totalLps?: number | null
  totalDollar?: number | null
  unitPrice?: number | null
  statusFuelOrder?: number | null
  statusFuelOrderName?: string
  statusReconciliation?: number | null
  statusReconciliationName?: string
  gasSupplierPaymentStatus?: number | null
  gasSupplierPaymentStatusName?: string
  subdivisionPaymentStatus?: number | null
  subdivisionPaymentStatusName?: string
  subdivisionId?: number | null
  subdivisionName?: string
  equipmentType?: number | null
  equipmentId?: number | null
  responsibleId?: number | null
  responsibleName?: string
  mechanicId?: number | null
  resourceCategory?: number | null
  resourceCategoryName?: string
  measure?: number | null
  dateSchedule?: string | null
  expirationDate?: string | null
  routeLegs?: RouteLeg[]
  tripDetail?: TripDetail | null
  settings?: any
  fuelAuditor?: FuelAuditorData | null
  fuelPrice?: FuelPriceData | null
  gasStation?: GasStationInfo | null
  equipmentDetail?: EquipmentDetail | null
  driverOptions?: DriverOption[]
  fuelLimitAssesment?: boolean
  fuelStatementId?: number | null
  gasStationStatementId?: number | null
  gasStationfuelStatementId?: number | null
  createdAt?: string
  updatedAt?: string
  createdAtFormat?: string
  updatedAtFormat?: string
  CreatedBy?: { firstName?: string; lastName?: string; fullName?: string }
  UpdatedBy?: { firstName?: string; lastName?: string; fullName?: string }
}

export type FuelOrderForm = Partial<FuelOrder>

export type FuelOrderErrors =
  | Record<string, string>
  | string
  | { message?: string; name?: string; code?: string; stack?: string }
  | null
  | undefined

export interface FuelOrderListParams {
  page: number
  size: number
  sortField?: string
  sortOrder?: string
  filters?: Record<string, any>
}

export interface FuelOrderListResponse {
  data: FuelOrder[]
  total: number
  page: number
  size: number
}

export interface AttributeItem {
  attributeItemId: number
  attribute_item_id?: number
  name: string
  flat_name_id?: string
  value?: string | number
}

export interface CityOption {
  citieid?: number
  cityId?: number
  name: string
  variantid?: number | null
}

export interface TripSearchResult {
  tripsid: number
  referenceNumber?: string
  plate?: string
  pickupCity?: string
  deliveryCity?: string
}

export interface StatusUpdatePayload {
  orderId: number
  action: 'approve' | 'reject' | 'cancel'
}

export interface PaymentStatusPayload {
  fuelOrderId: number
  gasSupplierPaymentStatus?: number
  subdivisionPaymentStatus?: number
}

export interface ReconciliationPayload {
  fuelOrderId: number
  licensePlate?: string
  fuelType?: string
  measureUnit?: string
  unitPrice?: number
  quantity?: number
  currency?: string
  amount?: number
  transactionId?: string
  documentNumber?: string
  paymentMethod?: string
  dateTime?: string
}

export interface SuggestedFuelParams {
  tripId?: number
  equipmentType?: number
  equipmentId?: number
  routeLegs?: RouteLeg[]
  orderType?: number
  routeid?: number
  clientid?: number
  subdivisionId?: number
  workorderid?: number
  ratebuilderId?: number
}

export interface FuelLimitAssessmentParams {
  fuelRequestLtr: number
  fuelModuleConfigId: number
  assetId: number
  subdivisionId: number
  assetTypeId: number
}

export interface ManualTripSearchParams {
  fromCityId?: number
  toCityId?: number
  subdivisionId?: number
  responsibleId?: number
  clientId?: number
}
