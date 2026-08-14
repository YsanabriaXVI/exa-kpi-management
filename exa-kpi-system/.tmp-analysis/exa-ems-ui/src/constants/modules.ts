export const MODULE_CLIENTS = 'clients'
export const MODULE_SUBDIVISION = 'subdivision'
export const MODULE_TRUCKS = 'trucks'
export const MODULE_ADDITINAL_EQUIPMENT = 'additional equipment'
export const MODULE_ROLES = 'roles'
export const MODULE_USERS = 'users'
export const MODULE_INVOICE = 'invoice'
export const MODULE_STATEMENTS = 'statements'
export const MODULE_DRIVERS = 'drivers'
export const MODULE_INVENTORYASSIGNMENTS = 'inventory assignments'
export const MODULE_RATE_BUILDER = 'rate builder'
export const MODULE_RATE_ROUTES = 'rate routes'
export const MODULE_WORK_ORDERS = 'work orders'
export const MODULE_TRIP = 'trip'
export const MODULE_TRIP_AUDITOR = 'trip auditor'
export const MODULE_FUEL = 'fuel'
export const MODULE_RESET_MODULE = 'reset module'
export const MODULE_ATTRIBUTES = 'attributes'
export const MODULE_RATE_BUILDER_ADMIN = 'rate builder admin'
export const MODULE_FORMAT_BUILDER = 'format builder'
export const MODULE_LOCATIONS = 'locations'
export const MODULE_WEEK_ADMIN = 'week admin'
export const MODULE_CHASSIS = 'chassis'
export const MODULE_GENSET = 'genset'
export const MODULE_INCIDENTS = 'incidents'
export const MODULE_SETTINGS = 'settings'
export const MODULE_WEEK_SUMMARY = 'week summary'
export const MODULE_PAYMENTS = 'payments'
export const MODULE_COMPANIES = 'companies'
export const MODULE_REPORT_WEEK_SUMMARY = 'report week summary'
export const MODULE_REPORT_GENERATOR = 'report generator'
export const MODULE_GASSUPPLIER = 'gas supplier'
export const MODULE_FUEL_UNIT_TYPE = 'fuel unit types'
export const MODULE_FUEL_TYPE = 'fuel types'
export const MODULE_FUEL_PRICE = 'fuel Price'
export const MODULE_FUEL_ORDERS = 'fuel orders'
export const MODULE_FUEL_ORDER_SETTINGS = 'fuel order Settings'
export const MODULE_DEPOTS = 'depots'
export const MODULE_OTHER_ASSETS = 'other assets'
export const MODULE_EQUIPMENT_TYPE = 'equipment type'
export const MODULE_EQUIPMENT_SIZE = 'equipment size'
export const MODULE_PARTS_SECTIONS = 'parts sections'
export const MODULE_DAMAGE_TYPES = 'damage types'
export const MODULE_MATERIAL_TYPES = 'material types'
export const MODULE_REPAIR_TYPES = 'repair types'
export const MODULE_CHECKLIST_BUILDER = 'check list builder'
export const MODULE_GATES = 'gates'
export const MODULE_EQUIPMENT_REQUEST = 'equipment request'
export const MODULE_REPAIR_STATUS = 'repair status'
export const MODULE_ITEM_TYPES = 'item types'
export const MODULE_RENTAL_PLAN = 'rental plan'
export const MODULE_CONTAINER = 'container'
export const MODULE_TIRES = 'tires'
export const MODULE_DEPOTSTATEMENT = 'depot statement'
export const MODULE_FUEL_ORDER_RECONCILIATION = 'fuel order reconciliation'
export const MODULE_SUBDIVISION_FUEL_STATEMENT = 'subdivision fuel statement'
export const MODULE_SUPPLIER_FUEL_STATEMENT = 'supplier fuel statement'
export const MODULE_FUEL_AUDITOR = 'fuel auditor'
export const MODULE_FUEL_WEEK_SUMMARY = 'fuel week summary'
export const MODULE_FUEL_ORDER_SIGNATURE = 'fuel order signature'
export const MODULE_FUEL_ORDER_PDF_BUILDER = 'fuel order pdf builder'
export const MODULE_DEPOT_SETUP = 'depot setup'
export const MODULE_MOBILE_CARRIER = 'mobile - carrier'
export const MODULE_MOBILE_SHIPPER = 'mobile - shipper'
export const MODULE_MOBILE_OPERATIONS = 'mobile - operations'
export const MODULE_DEPOT_REPORTS = 'depot reports'

export const MODULES_ID: Record<string, number> = {
  [MODULE_CLIENTS]: 1,
  [MODULE_SUBDIVISION]: 2,
  [MODULE_TRUCKS]: 3,
  [MODULE_ADDITINAL_EQUIPMENT]: 4,
  [MODULE_ROLES]: 5,
  [MODULE_USERS]: 6,
  [MODULE_INVOICE]: 7,
  [MODULE_STATEMENTS]: 8,
  [MODULE_DRIVERS]: 9,
  [MODULE_INVENTORYASSIGNMENTS]: 10,
  [MODULE_RATE_BUILDER]: 11,
  [MODULE_RATE_ROUTES]: 12,
  [MODULE_WORK_ORDERS]: 13,
  [MODULE_TRIP]: 14,
  [MODULE_TRIP_AUDITOR]: 15,
  [MODULE_FUEL_ORDERS]: 16,
  [MODULE_RESET_MODULE]: 17,
  [MODULE_ATTRIBUTES]: 19,
  [MODULE_RATE_BUILDER_ADMIN]: 20,
  [MODULE_FORMAT_BUILDER]: 21,
  [MODULE_LOCATIONS]: 22,
  [MODULE_WEEK_ADMIN]: 23,
  [MODULE_CHASSIS]: 24,
  [MODULE_GENSET]: 25,
  [MODULE_INCIDENTS]: 27,
  [MODULE_SETTINGS]: 28,
  [MODULE_WEEK_SUMMARY]: 29,
  [MODULE_PAYMENTS]: 30,
  [MODULE_COMPANIES]: 31,
  [MODULE_REPORT_WEEK_SUMMARY]: 32,
  [MODULE_REPORT_GENERATOR]: 33,
  [MODULE_GASSUPPLIER]: 34,
  [MODULE_FUEL_ORDER_SETTINGS]: 37,
  [MODULE_FUEL_PRICE]: 41,
  [MODULE_FUEL_TYPE]: 35,
  [MODULE_FUEL_UNIT_TYPE]: 42,
  [MODULE_OTHER_ASSETS]: 44,
  [MODULE_DEPOTS]: 51,
  [MODULE_EQUIPMENT_TYPE]: 52,
  [MODULE_EQUIPMENT_SIZE]: 46,
  [MODULE_PARTS_SECTIONS]: 47,
  [MODULE_DAMAGE_TYPES]: 48,
  [MODULE_MATERIAL_TYPES]: 49,
  [MODULE_REPAIR_TYPES]: 50,
  [MODULE_CHECKLIST_BUILDER]: 53,
  [MODULE_GATES]: 54,
  [MODULE_EQUIPMENT_REQUEST]: 55,
  [MODULE_REPAIR_STATUS]: 56,
  [MODULE_ITEM_TYPES]: 57,
  [MODULE_RENTAL_PLAN]: 61,
  [MODULE_CONTAINER]: 58,
  [MODULE_TIRES]: 59,
  [MODULE_DEPOTSTATEMENT]: 60,
  [MODULE_FUEL_ORDER_RECONCILIATION]: 62,
  [MODULE_SUBDIVISION_FUEL_STATEMENT]: 63,
  [MODULE_SUPPLIER_FUEL_STATEMENT]: 65,
  [MODULE_FUEL_AUDITOR]: 66,
  [MODULE_FUEL_WEEK_SUMMARY]: 67,
  [MODULE_FUEL_ORDER_SIGNATURE]: 68,
  [MODULE_FUEL_ORDER_PDF_BUILDER]: 69,
  [MODULE_DEPOT_SETUP]: 70,
  [MODULE_MOBILE_CARRIER]: 71,
  [MODULE_MOBILE_SHIPPER]: 72,
  [MODULE_MOBILE_OPERATIONS]: 73,
  [MODULE_DEPOT_REPORTS]: 74
}

export const getModuleIdByName = (name: string | number): number => {
  return typeof name === 'number' ? name : MODULES_ID[name]
}

