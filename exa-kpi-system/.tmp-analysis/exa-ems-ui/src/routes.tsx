import React, { LazyExoticComponent, FC, ReactNode } from 'react'
import { Translation } from 'react-i18next'
import { isPaymentV2Enabled } from './modules/Payments/featureFlags'
import {
  MODULE_WORK_ORDERS,
  MODULE_TRIP,
  MODULE_TRIP_AUDITOR,
  MODULE_TRUCKS,
  MODULE_DRIVERS,
  MODULE_CLIENTS,
  MODULE_SUBDIVISION,
  MODULE_RATE_ROUTES,
  MODULE_RATE_BUILDER,
  MODULE_OTHER_ASSETS,
  MODULE_USERS,
  MODULE_ROLES,
  MODULE_ATTRIBUTES,
  MODULE_RATE_BUILDER_ADMIN,
  MODULE_FORMAT_BUILDER,
  MODULE_LOCATIONS,
  MODULE_WEEK_ADMIN,
  MODULE_COMPANIES,
  MODULE_INVENTORYASSIGNMENTS,
  MODULE_CHASSIS,
  MODULE_GENSET,
  MODULE_INVOICE,
  MODULE_PAYMENTS,
  MODULE_INCIDENTS,
  MODULE_REPORT_WEEK_SUMMARY,
  MODULE_REPORT_GENERATOR,
  MODULE_DAMAGE_TYPES,
  MODULE_DEPOTS,
  MODULE_CHECKLIST_BUILDER,
  MODULE_MATERIAL_TYPES,
  MODULE_ITEM_TYPES,
  MODULE_RENTAL_PLAN,
  MODULE_REPAIR_STATUS,
  MODULE_FUEL_TYPE,
  MODULE_FUEL_UNIT_TYPE,
  MODULE_FUEL_ORDER_SETTINGS,
  MODULE_FUEL_ORDER_SIGNATURE,
  MODULE_GASSUPPLIER,
  MODULE_FUEL_PRICE,
  MODULE_FUEL_ORDERS,
  MODULE_FUEL_AUDITOR,
  MODULE_FUEL_ORDER_RECONCILIATION,
  MODULE_SUBDIVISION_FUEL_STATEMENT,
  MODULE_SUPPLIER_FUEL_STATEMENT,
  MODULE_FUEL_WEEK_SUMMARY,
  MODULE_GATES,
  MODULE_DEPOTSTATEMENT,
  MODULE_RESET_MODULE,
  MODULE_TIRES,
  MODULE_DEPOT_REPORTS,
} from './constants/modules'

export type Route = {
  element?: LazyExoticComponent<FC>
  exact?: boolean
  name?: ReactNode
  path?: string
  routes?: Route[]
  module?: string  // Module reference for permission checks
}

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))

// Work Orders
const WorkOrdersListPage = React.lazy(() => import('./modules/WorkOrders/pages/WorkOrdersListPage'))
const WorkOrderFormPage = React.lazy(() => import('./modules/WorkOrders/pages/WorkOrderFormPage'))

// Trips
const TripsListPage = React.lazy(() => import('./modules/Trips/pages/TripsListPage'))
const TripFormPage = React.lazy(() => import('./modules/Trips/pages/TripFormPage'))
const TripAuditorListPage = React.lazy(() => import('./modules/Trips/pages/TripAuditorListPage'))

// Payments
const PaymentsListPage = React.lazy(() => import('./modules/Payments/pages/PaymentsListPage'))
const PaymentWizardPage = React.lazy(() => import('./modules/Payments/pages/PaymentWizardPage'))
const ChargeConfigListPage = React.lazy(() => import('./modules/Payments/pages/ChargeConfigListPage'))
const ChargeConfigFormPage = React.lazy(() => import('./modules/Payments/pages/ChargeConfigFormPage'))
const InstallmentsPage = React.lazy(() => import('./modules/Payments/pages/InstallmentsPage'))
const PaymentReportPage = React.lazy(() => import('./modules/Payments/pages/PaymentReportPage'))
const MigrationDashboardPage = React.lazy(() => import('./modules/Payments/pages/MigrationDashboardPage'))

// Other Charges
const OtherChargesListPage = React.lazy(() => import('./modules/OtherCharges/pages/OtherChargesListPage'))
const OtherChargesFormPage = React.lazy(() => import('./modules/OtherCharges/pages/OtherChargesFormPage'))

// Attributes
const AttributesListPage = React.lazy(() => import('./modules/Attributes/pages/AttributesListPage'))
const AttributeFormPage = React.lazy(() => import('./modules/Attributes/pages/AttributeFormPage'))

// Rate Plans
const RatePlansListPage = React.lazy(() => import('./modules/RatePlans/pages/RatePlansListPage'))
const RatePlanFormPage = React.lazy(() => import('./modules/RatePlans/pages/RatePlanFormPage'))

// Rate Builder
const RateBuilderPage = React.lazy(() => import('./modules/RateBuilder/pages/RateBuilderPage'))

// Format Builder
const FormatBuilderListPage = React.lazy(() => import('./modules/FormatBuilder/pages/FormatBuilderListPage'))
const FormatBuilderFormPage = React.lazy(() => import('./modules/FormatBuilder/pages/FormatBuilderFormPage'))

// Location Items
const LocationItemsPage = React.lazy(() => import('./modules/LocationItems/pages/LocationItemsPage'))

// AI Agent
const AgentChatPage = React.lazy(() => import('./modules/Agent/AgentChatPage'))
const ApprovalsPage = React.lazy(() => import('./modules/Agent/ApprovalsPage'))

// Equipments
const EquipmentsPage = React.lazy(() => import('./modules/Assets/Equipments/pages/EquipmentsPage'))
const EquipmentFormPage = React.lazy(() => import('./modules/Assets/Equipments/pages/EquipmentFormPage'))

// Locations
const LocationsListPage = React.lazy(() => import('./modules/Locations/pages/LocationsListPage'))
const LocationFormPage = React.lazy(() => import('./modules/Locations/pages/LocationFormPage'))

// Weeks
const WeeksListPage = React.lazy(() => import('./modules/Weeks/pages/WeeksListPage'))
const WeekFormPage = React.lazy(() => import('./modules/Weeks/pages/WeekFormPage'))

// Client Statements
const ClientStatementsListPage = React.lazy(() => import('./modules/Invoices/pages/ClientStatementsListPage'))
const ClientStatementFormPage = React.lazy(() => import('./modules/Invoices/pages/ClientStatementFormPage'))

// Subdivision Statements
const SubdivisionStatementsListPage = React.lazy(() => import('./modules/SubdivisionStatements/pages/SubdivisionStatementsListPage'))
const SubdivisionStatementFormPage = React.lazy(() => import('./modules/SubdivisionStatements/pages/SubdivisionStatementFormPage'))

// Incidents
const IncidentsListPage = React.lazy(() => import('./modules/Incidents/pages/IncidentsListPage'))
const IncidentFormPage = React.lazy(() => import('./modules/Incidents/pages/IncidentFormPage'))

// Companies
const CompaniesListPage = React.lazy(() => import('./modules/Companies/pages/CompaniesListPage'))
const CompanyFormPage = React.lazy(() => import('./modules/Companies/pages/CompanyFormPage'))

// Users
const UsersListPage = React.lazy(() => import('./modules/Users/pages/UsersListPage'))
const UserFormPage = React.lazy(() => import('./modules/Users/pages/UserFormPage'))

// Assets - Trucks
const TrucksListPage = React.lazy(() => import('./modules/Assets/Trucks/pages/TrucksListPage'))
const TruckFormPage = React.lazy(() => import('./modules/Assets/Trucks/pages/TruckFormPage'))
const DriversListPage = React.lazy(() => import('./modules/Assets/Drivers/pages/DriversListPage'))
const DriverFormPage = React.lazy(() => import('./modules/Assets/Drivers/pages/DriverFormPage'))
const ClientsListPage = React.lazy(() => import('./modules/Assets/Clients/pages/ClientsListPage'))
const ClientFormPage = React.lazy(() => import('./modules/Assets/Clients/pages/ClientFormPage'))
const AddDepotSetupPage = React.lazy(
  () => import('./modules/Assets/Clients/pages/AddDepotEditPage'),
)
const AddSizeChargesPage = React.lazy(
  () => import('./modules/Assets/Clients/pages/AddSizeChargesPage'),
)
const SubdivisionsListPage = React.lazy(() => import('./modules/Assets/Subdivisions/pages/SubdivisionsListPage'))
const SubdivisionFormPage = React.lazy(() => import('./modules/Assets/Subdivisions/pages/SubdivisionFormPage'))
const RateRoutesListPage = React.lazy(() => import('./modules/Assets/RateRoutes/pages/RateRoutesListPage'))
const OtherAssetsListPage = React.lazy(() => import('./modules/Assets/OtherAssets/pages/OtherAssetsListPage'))
const OtherAssetFormPage = React.lazy(() => import('./modules/Assets/OtherAssets/pages/OtherAssetFormPage'))
const InventoryAssignmentsListPage = React.lazy(
  () => import('./modules/InventoryAssignments/pages/InventoryAssignmentsListPage'),
)

// Roles
const RolesListPage = React.lazy(() => import('./modules/Roles/pages/RolesListPage'))
const RoleFormPage = React.lazy(() => import('./modules/Roles/pages/RoleFormPage'))

// Profile
const ProfilePage = React.lazy(() => import('./modules/Profile/pages/ProfilePage'))

// Analytics & Reports
const WeeklyAnalyticsPage = React.lazy(() => import('./modules/WeeklyAnalytics/pages/WeeklyAnalyticsPage'))
const ReportBuilderPage = React.lazy(() => import('./modules/ReportBuilder/pages/ReportBuilderPage'))

//Depot 

const PartsAndSectionsListPage = React.lazy(() => import('./modules/PartsAndSections/pages/PartsAndSectionsListPage'))
const PartsAndSectionsEditPage = React.lazy(() => import('./modules/PartsAndSections/pages/PartsAndSectionsEditPage'))

//Damage types
const DamageTypesListPage = React.lazy(() => import('./modules/DamageTypes/pages/DamageTypesListPage'))
const DamageTypesEditPage = React.lazy(() => import('./modules/DamageTypes/pages/DamageTypesEditPage'))

//Material types
const MaterialTypesListPage = React.lazy(() => import('./modules/MaterialTypes/pages/MaterialTypesListPage'))
const MaterialTypesEditPage = React.lazy(() => import('./modules/MaterialTypes/pages/MaterialTypesEditPage'))

//Depots
const DepotsListPage = React.lazy(() => import('./modules/Depots/pages/DepotsListPage'))
const DepotsEditPage = React.lazy(() => import('./modules/Depots/pages/DepotsEditPage'))

//Repair Types
const RepairTypesListPage = React.lazy(() => import('./modules/RepairTypes/pages/RepairTypesListPage'))
const RepairTypesEditPage = React.lazy(() => import('./modules/RepairTypes/pages/RepairTypesEditPage'))

// Repair Status
const RepairStatusListPage = React.lazy(() => import('./modules/RepairStatus/pages/RepairStatusListPage'))
const RepairStatusEditPage = React.lazy(() => import('./modules/RepairStatus/pages/RepairStatusEditPage'))

//Equipment Size
const EquipmentSizeListPage = React.lazy(() => import('./modules/EquipmentSize/pages/EquipmentSizeListPage'))
const EquipmentSizeEditPage = React.lazy(() => import('./modules/EquipmentSize/pages/EquipmentSizeEditPage'))

//Item Types
const ItemTypesListPage = React.lazy(() => import('./modules/ItemTypes/pages/ItemTypesListPage'))
const ItemTypesEditPage = React.lazy(() => import('./modules/ItemTypes/pages/ItemTypesEditPage'))

//Checklist Builder
const ChecklistBuilderListPage = React.lazy(() => import('./modules/ChecklistBuilder/pages/ChecklistBuilderListPage'))
const ChecklistBuilderEditPage = React.lazy(() => import('./modules/ChecklistBuilder/pages/ChecklistBuilderEditPage'))

//rental plan
const RentalPlanListPage = React.lazy(() => import('./modules/RentalPlan/pages/RentalPlanListPage'))
const RentalPlanEditPage = React.lazy(() => import('./modules/RentalPlan/pages/RentalPlanEditPage'))

//Equipmet Request
const EquipmentRequestListPage = React.lazy(() => import('./modules/EquipmentRequest/pages/EquipmentRequestListPage'))
const EquipmentRequestEditPage = React.lazy(() => import('./modules/EquipmentRequest/pages/EquipmentRequestEditPage'))

// Fuel - Fuel Types
const FuelTypeListPage = React.lazy(() => import('./modules/Fuel/FuelType/pages/FuelTypeListPage'))
const FuelTypeEditPage = React.lazy(() => import('./modules/Fuel/FuelType/pages/FuelTypeEditPage'))

// Fuel - Fuel Unit Types
const FuelUnitTypeListPage = React.lazy(() => import('./modules/Fuel/FuelUnitType/pages/FuelUnitTypeListPage'))
const FuelUnitTypeEditPage = React.lazy(() => import('./modules/Fuel/FuelUnitType/pages/FuelUnitTypeEditPage'))

// Fuel - Fuel Order Settings
const FuelOrderSettingsListPage = React.lazy(() => import('./modules/Fuel/FuelOrderSettings/pages/FuelOrderSettingsListPage'))
const FuelOrderSettingsEditPage = React.lazy(() => import('./modules/Fuel/FuelOrderSettings/pages/FuelOrderSettingsEditPage'))

// Fuel - Fuel Order Signature
const FuelOrderSignatureListPage = React.lazy(() => import('./modules/Fuel/FuelOrderSignature/pages/FuelOrderSignatureListPage'))
const FuelOrderPdfConfigListPage = React.lazy(() => import('./modules/Fuel/FuelOrderPdfConfig/pages/FuelOrderPdfConfigListPage'))
const FuelOrderPdfConfigEditPage = React.lazy(() => import('./modules/Fuel/FuelOrderPdfConfig/pages/FuelOrderPdfConfigEditPage'))

// Fuel - Gas Supplier
const GasSupplierListPage = React.lazy(() => import('./modules/Fuel/GasSupplier/pages/GasSupplierListPage'))
const GasSupplierEditPage = React.lazy(() => import('./modules/Fuel/GasSupplier/pages/GasSupplierEditPage'))
const GasStoreEditPage = React.lazy(() => import('./modules/Fuel/GasSupplier/pages/GasStoreEditPage'))

// Fuel - Fuel Price
const FuelPriceListPage = React.lazy(() => import('./modules/Fuel/FuelPrice/pages/FuelPriceListPage'))
const FuelPriceEditPage = React.lazy(() => import('./modules/Fuel/FuelPrice/pages/FuelPriceEditPage'))

// Fuel - Fuel Order
const FuelOrderListPage = React.lazy(() => import('./modules/Fuel/FuelOrder/pages/FuelOrderListPage'))
const FuelOrderEditPage = React.lazy(() => import('./modules/Fuel/FuelOrder/pages/FuelOrderEditPage'))

// Fuel - Fuel Auditor
const FuelAuditorListPage = React.lazy(() => import('./modules/Fuel/FuelAuditor/pages/FuelAuditorListPage'))
const FuelAuditorViewPage = React.lazy(() => import('./modules/Fuel/FuelAuditor/pages/FuelAuditorViewPage'))

// Fuel - Fuel Order Reconciliation
const ReconciliationListPage = React.lazy(() => import('./modules/Fuel/FuelOrderReconciliation/pages/ReconciliationListPage'))
const ReconciliationUploadPage = React.lazy(() => import('./modules/Fuel/FuelOrderReconciliation/pages/ReconciliationUploadPage'))
const ReconciliationReviewPage = React.lazy(() => import('./modules/Fuel/FuelOrderReconciliation/pages/ReconciliationReviewPage'))

// Fuel - Subdivision Fuel Statement
const SubdivisionFuelStatementListPage = React.lazy(() => import('./modules/Fuel/SubdivisionFuelStatement/pages/SubdivisionFuelStatementListPage'))
const SubdivisionFuelStatementEditPage = React.lazy(() => import('./modules/Fuel/SubdivisionFuelStatement/pages/SubdivisionFuelStatementEditPage'))

// Fuel - Gas Station Fuel Statement
const GasStationFuelStatementListPage = React.lazy(() => import('./modules/Fuel/GasStationFuelStatement/pages/GasStationFuelStatementListPage'))
const GasStationFuelStatementEditPage = React.lazy(() => import('./modules/Fuel/GasStationFuelStatement/pages/GasStationFuelStatementEditPage'))

// Fuel - Fuel Week Summary
const FuelWeekSummaryPage = React.lazy(() => import('./modules/Fuel/FuelWeekSummary/pages/FuelWeekSummaryPage'))

// Gates
const GatesListPage = React.lazy(() => import('./modules/Gates/pages/GatesListPage'))
const GatesEditPage = React.lazy(() => import('./modules/Gates/pages/GatesEditPage'))

// Depot Statements
const DepotStatementListPage = React.lazy(() => import('./modules/DepotStatement/pages/DepotStatementListPage'))
const DepotStatementFormPage = React.lazy(() => import('./modules/DepotStatement/pages/DepotStatementFormPage'))

// Depot Reports
const DepotReportPage = React.lazy(() => import('./modules/DepotReports/pages/depotReportPage'))

// Reset Module
const ResetListPage = React.lazy(() => import('./modules/Reset/pages/ResetListPage'))
const ResetEditPage = React.lazy(() => import('./modules/Reset/pages/ResetEditPage'))

// Tires Assignment
const TiresAssignmentListPage = React.lazy(() => import('./modules/TiresAssigment/pages/TiresAssignmentListPage'))
const TiresAssignmentEditPage = React.lazy(() => import('./modules/TiresAssigment/pages/TiresAssignmentEditPage'))

const routes: Route[] = [
  { path: '/', exact: true, name: <Translation>{(t) => t('home')}</Translation> },
  {
    path: '/dashboard',
    name: <Translation>{(t) => t('dashboard')}</Translation>,
    element: Dashboard,
  },
  // Operations
  {
    path: '/operations',
    name: 'Operations',
    element: WorkOrdersListPage,
    exact: true,
    module: MODULE_WORK_ORDERS,
  },
  {
    path: '/operations/workorders',
    name: 'Work Orders',
    element: WorkOrdersListPage,
    exact: true,
    module: MODULE_WORK_ORDERS,
  },
  {
    path: '/operations/workorders/order/:id',
    name: 'Work Order',
    element: WorkOrderFormPage,
    exact: true,
    module: MODULE_WORK_ORDERS,
  },
  {
    path: '/operations/trips',
    name: 'Trips',
    element: TripsListPage,
    exact: true,
    module: MODULE_TRIP,
  },
  {
    path: '/operations/trips/:id',
    name: 'Trip Details',
    element: TripFormPage,
    exact: true,
    module: MODULE_TRIP,
  },
  {
    path: '/operations/trip-auditor',
    name: 'Trip Auditor',
    element: TripAuditorListPage,
    exact: true,
    module: MODULE_TRIP_AUDITOR,
  },
  {
    path: '/operations/trip-auditor/:id',
    name: 'Trip Auditor Details',
    element: TripFormPage,
    exact: true,
    module: MODULE_TRIP_AUDITOR,
  },
  // Payment v2 routes — gated by feature flag
  ...(isPaymentV2Enabled() ? [
    {
      path: '/operations/payments',
      name: 'Payments',
      element: PaymentsListPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/operations/payments/new',
      name: 'New Payment',
      element: PaymentWizardPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/operations/payments/:id',
      name: 'Payment Details',
      element: PaymentWizardPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/operations/installments',
      name: 'Installments',
      element: InstallmentsPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/analytics/payment-reports',
      name: 'Payment Reports',
      element: PaymentReportPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/operations/migration',
      name: 'Migration Dashboard',
      element: MigrationDashboardPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/administrator/charge-configs',
      name: 'Charge Configurations',
      element: ChargeConfigListPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/administrator/charge-configs/new',
      name: 'New Charge Configuration',
      element: ChargeConfigFormPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
    {
      path: '/administrator/charge-configs/:id',
      name: 'Edit Charge Configuration',
      element: ChargeConfigFormPage,
      exact: true,
      module: MODULE_PAYMENTS,
    },
  ] as Route[] : []),
  // Administrator
  {
    path: '/assets',
    name: 'Assets',
    element: TrucksListPage,
    exact: true,
    module: MODULE_TRUCKS,
  },
  {
    path: '/assets/trucks',
    name: 'Trucks Management',
    element: TrucksListPage,
    exact: true,
    module: MODULE_TRUCKS,
  },
  {
    path: '/assets/trucks/new',
    name: 'Create Truck',
    element: TruckFormPage,
    exact: true,
    module: MODULE_TRUCKS,
  },
  {
    path: '/assets/trucks/:id',
    name: 'Edit Truck',
    element: TruckFormPage,
    exact: true,
    module: MODULE_TRUCKS,
  },
  {
    path: '/assets/clients',
    name: 'Clients Management',
    element: ClientsListPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/new',
    name: 'Create Client',
    element: ClientFormPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/:id',
    name: 'Edit Client',
    element: ClientFormPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/:clientId/depot-setup',
    name: 'Depot Setup',
    element: AddDepotSetupPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/:clientId/depot-setup/new',
    name: 'Add Depot Setup',
    element: AddDepotSetupPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/:clientId/depot-setup/:setupId',
    name: 'Edit Depot Setup',
    element: AddDepotSetupPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/:clientId/depot-setup/:setupId/size-charges/new',
    name: 'Add Size Charges',
    element: AddSizeChargesPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/clients/:clientId/depot-setup/:setupId/size-charges/:sizeId',
    name: 'Add Size Charges',
    element: AddSizeChargesPage,
    exact: true,
    module: MODULE_CLIENTS,
  },
  {
    path: '/assets/subdivisions',
    name: 'Subdivisions Management',
    element: SubdivisionsListPage,
    exact: true,
    module: MODULE_SUBDIVISION,
  },
  {
    path: '/assets/inventory',
    name: 'Inventory Assignments',
    element: InventoryAssignmentsListPage,
    exact: true,
    module: MODULE_INVENTORYASSIGNMENTS,
  },
  {
    path: '/assets/subdivisions/new',
    name: 'Create Subdivision',
    element: SubdivisionFormPage,
    exact: true,
    module: MODULE_SUBDIVISION,
  },
  {
    path: '/assets/subdivisions/:id',
    name: 'Edit Subdivision',
    element: SubdivisionFormPage,
    exact: true,
    module: MODULE_SUBDIVISION,
  },
  {
    path: '/assets/rate-routes',
    name: 'Rate Routes Management',
    element: RateRoutesListPage,
    exact: true,
    module: MODULE_RATE_ROUTES,
  },
  {
    path: '/assets/rate-routes/new',
    name: 'Create Rate Route',
    element: React.lazy(() => import('./modules/Assets/RateRoutes/pages/RateRouteFormPage')),
    exact: true,
    module: MODULE_RATE_ROUTES,
  },
  {
    path: '/assets/rate-routes/:id',
    name: 'Edit Rate Route',
    element: React.lazy(() => import('./modules/Assets/RateRoutes/pages/RateRouteFormPage')),
    exact: true,
    module: MODULE_RATE_ROUTES,
  },
  {
    path: '/operations/client-statements',
    name: 'Client Statements',
    element: ClientStatementsListPage,
    exact: true,
    module: MODULE_INVOICE,
  },
  {
    path: '/operations/client-statements/new',
    name: 'Create Client Statement',
    element: ClientStatementFormPage,
    exact: true,
    module: MODULE_INVOICE,
  },
  {
    path: '/operations/client-statements/:id',
    name: 'Edit Client Statement',
    element: ClientStatementFormPage,
    exact: true,
    module: MODULE_INVOICE,
  },
  {
    path: '/operations/subdivision-statements',
    name: 'Subdivision Statements',
    element: SubdivisionStatementsListPage,
    exact: true,
    module: MODULE_SUBDIVISION,
  },
  {
    path: '/operations/subdivision-statements/new',
    name: 'Create Subdivision Statement',
    element: SubdivisionStatementFormPage,
    exact: true,
    module: MODULE_SUBDIVISION,
  },
  {
    path: '/operations/subdivision-statements/:id',
    name: 'Edit Subdivision Statement',
    element: SubdivisionStatementFormPage,
    exact: true,
    module: MODULE_SUBDIVISION,
  },
  // Reset Module
  {
    path: '/operations/reset',
    name: 'Reset List',
    element: ResetListPage,
    exact: true,
    module: MODULE_RESET_MODULE,
  },
  {
    path: '/operations/reset/:id',
    name: 'Reset',
    element: ResetEditPage,
    exact: true,
    module: MODULE_RESET_MODULE,
  },
  {
    path: '/operations/incidents',
    name: 'Incidents',
    element: IncidentsListPage,
    exact: true,
    module: MODULE_INCIDENTS,
  },
  {
    path: '/operations/incidents/new',
    name: 'Create Incident',
    element: IncidentFormPage,
    exact: true,
    module: MODULE_INCIDENTS,
  },
  {
    path: '/operations/incidents/:id',
    name: 'Edit Incident',
    element: IncidentFormPage,
    exact: true,
    module: MODULE_INCIDENTS,
  },
  {
    path: '/assets/equipments',
    name: 'Equipments',
    element: EquipmentsPage,
    exact: true,
    module: MODULE_CHASSIS,
  },
  {
    path: '/assets/equipments/:kind',
    name: 'Equipments By Type',
    element: EquipmentsPage,
    exact: true,
    module: MODULE_CHASSIS,
  },
  {
    path: '/assets/equipments/:kind/new',
    name: 'Create Equipment',
    element: EquipmentFormPage,
    exact: true,
    module: MODULE_CHASSIS,
  },
  {
    path: '/assets/equipments/:kind/:id',
    name: 'Edit Equipment',
    element: EquipmentFormPage,
    exact: true,
    module: MODULE_CHASSIS,
  },
  {
    path: '/assets/rate-builder',
    name: 'Rate Builder',
    element: RateBuilderPage,
    exact: true,
    module: MODULE_RATE_BUILDER,
  },
  {
    path: '/assets/drivers',
    name: 'Drivers Management',
    element: DriversListPage,
    exact: true,
    module: MODULE_DRIVERS,
  },
  {
    path: '/assets/drivers/new',
    name: 'Create Driver',
    element: DriverFormPage,
    exact: true,
    module: MODULE_DRIVERS,
  },
  {
    path: '/assets/drivers/:id',
    name: 'Edit Driver',
    element: DriverFormPage,
    exact: true,
    module: MODULE_DRIVERS,
  },
  {
    path: '/assets/otherassets',
    name: 'Other Assets',
    element: OtherAssetsListPage,
    exact: true,
    module: MODULE_OTHER_ASSETS,
  },
  {
    path: '/assets/otherassets/new',
    name: 'Create Other Asset',
    element: OtherAssetFormPage,
    exact: true,
    module: MODULE_OTHER_ASSETS,
  },
  {
    path: '/assets/otherassets/:id',
    name: 'Edit Other Asset',
    element: OtherAssetFormPage,
    exact: true,
    module: MODULE_OTHER_ASSETS,
  },
  {
    path: '/modules',
    name: 'Administrator',
    element: OtherChargesListPage,
    exact: true,
  },
  {
    path: '/modules/other-charges',
    name: 'Other Charges Management',
    element: OtherChargesListPage,
    exact: true,
  },
  {
    path: '/modules/attributes',
    name: 'Attributes Management',
    element: AttributesListPage,
    exact: true,
    module: MODULE_ATTRIBUTES,
  },
  {
    path: '/modules/rateplans',
    name: 'Rate Plans',
    element: RatePlansListPage,
    exact: true,
    module: MODULE_RATE_BUILDER_ADMIN,
  },
  {
    path: '/modules/rateplans/create',
    name: 'Create Rate Plan',
    element: RatePlanFormPage,
    exact: true,
    module: MODULE_RATE_BUILDER_ADMIN,
  },
  {
    path: '/modules/rateplans/edit/:id',
    name: 'Edit Rate Plan',
    element: RatePlanFormPage,
    exact: true,
    module: MODULE_RATE_BUILDER_ADMIN,
  },
  {
    path: '/modules/formatbuilder',
    name: 'Format Builder',
    element: FormatBuilderListPage,
    exact: true,
    module: MODULE_FORMAT_BUILDER,
  },
  {
    path: '/modules/formatbuilder/create',
    name: 'Create Format',
    element: FormatBuilderFormPage,
    exact: true,
    module: MODULE_FORMAT_BUILDER,
  },
  {
    path: '/modules/formatbuilder/edit/:id',
    name: 'Edit Format',
    element: FormatBuilderFormPage,
    exact: true,
    module: MODULE_FORMAT_BUILDER,
  },
  {
    path: '/modules/agent',
    name: 'Nabi AI Assistant',
    element: AgentChatPage,
    exact: true,
  },
  {
    path: '/modules/agent/approvals',
    name: 'Nabi Approvals',
    element: ApprovalsPage,
    exact: true,
  },
  {
    path: '/modules/locationitems',
    name: 'Location Items',
    element: LocationItemsPage,
    exact: true,
    module: MODULE_LOCATIONS,
  },
  {
    path: '/modules/locationitems/:type/create',
    name: 'Create Location Item',
    element: React.lazy(() => import('./modules/LocationItems/pages/LocationItemFormPage')),
    exact: true,
    module: MODULE_LOCATIONS,
  },
  {
    path: '/modules/locationitems/:type/edit/:id',
    name: 'Edit Location Item',
    element: React.lazy(() => import('./modules/LocationItems/pages/LocationItemFormPage')),
    exact: true,
    module: MODULE_LOCATIONS,
  },
  {
    path: '/modules/locations',
    name: 'Locations',
    element: LocationsListPage,
    exact: true,
    module: MODULE_LOCATIONS,
  },
  {
    path: '/modules/locations/create',
    name: 'Create Location',
    element: LocationFormPage,
    exact: true,
    module: MODULE_LOCATIONS,
  },
  {
    path: '/modules/locations/edit/:id',
    name: 'Edit Location',
    element: LocationFormPage,
    exact: true,
    module: MODULE_LOCATIONS,
  },
  {
    path: '/modules/weeks',
    name: 'Weeks',
    element: WeeksListPage,
    exact: true,
    module: MODULE_WEEK_ADMIN,
  },
  {
    path: '/modules/weeks/create',
    name: 'Create Week',
    element: WeekFormPage,
    exact: true,
    module: MODULE_WEEK_ADMIN,
  },
  {
    path: '/modules/weeks/edit/:id',
    name: 'Edit Week',
    element: WeekFormPage,
    exact: true,
    module: MODULE_WEEK_ADMIN,
  },
  {
    path: '/modules/companies',
    name: 'Companies',
    element: CompaniesListPage,
    exact: true,
    module: MODULE_COMPANIES,
  },
  {
    path: '/modules/companies/create',
    name: 'Create Company',
    element: CompanyFormPage,
    exact: true,
    module: MODULE_COMPANIES,
  },
  {
    path: '/modules/companies/edit/:id',
    name: 'Edit Company',
    element: CompanyFormPage,
    exact: true,
    module: MODULE_COMPANIES,
  },
  {
    path: '/modules/attributes/create',
    name: 'Create Attribute',
    element: AttributeFormPage,
    exact: true,
    module: MODULE_ATTRIBUTES,
  },
  {
    path: '/modules/attributes/edit/:id',
    name: 'Edit Attribute',
    element: AttributeFormPage,
    exact: true,
    module: MODULE_ATTRIBUTES,
  },
  {
    path: '/modules/other-charges/create',
    name: 'Create Charge',
    element: OtherChargesFormPage,
    exact: true,
  },
  {
    path: '/modules/other-charges/edit/:id',
    name: 'Edit Charge',
    element: OtherChargesFormPage,
    exact: true,
  },
  // Users
  {
    path: '/modules/users',
    name: 'Users Management',
    element: UsersListPage,
    exact: true,
    module: MODULE_USERS,
  },
  {
    path: '/modules/users/create',
    name: 'Create User',
    element: UserFormPage,
    exact: true,
    module: MODULE_USERS,
  },
  {
    path: '/modules/users/edit/:id',
    name: 'Edit User',
    element: UserFormPage,
    exact: true,
    module: MODULE_USERS,
  },
  {
    path: '/modules/roles',
    name: 'Roles Management',
    element: RolesListPage,
    exact: true,
    module: MODULE_ROLES,
  },
  {
    path: '/modules/roles/create',
    name: 'Create Role',
    element: RoleFormPage,
    exact: true,
    module: MODULE_ROLES,
  },
  {
    path: '/modules/roles/edit/:id',
    name: 'Edit Role',
    element: RoleFormPage,
    exact: true,
    module: MODULE_ROLES,
  },
  // Profile
  {
    path: '/profile',
    name: <Translation>{(t) => t('profile')}</Translation>,
    element: ProfilePage,
    exact: true,
  },
  // Analytics & Reports
  {
    path: '/analytics/weekly',
    name: 'Weekly Analytics',
    element: WeeklyAnalyticsPage,
    exact: true,
    module: MODULE_REPORT_WEEK_SUMMARY,
  },
  {
    path: '/analytics/report-builder',
    name: 'Custom Report Builder',
    element: ReportBuilderPage,
    exact: true,
    module: MODULE_REPORT_GENERATOR,
  },
  // Depot
  {
    path: '/depot/parts-and-sections',
    name: 'Parts & Sections',
    element: PartsAndSectionsListPage,
    exact: true
  },
  {
    path: '/depot/parts-and-sections/:id',
    name: 'Edit Parts & Sections',
    element: PartsAndSectionsEditPage,
    exact: true
  },
  {
    path: '/depot/damage-types',
    name: 'Damage Types',
    element: DamageTypesListPage,
    exact: true,
    module: MODULE_DAMAGE_TYPES
  },
  {
    path: '/depot/damage-types/:id',
    name: 'Edit Damage Type',
    element: DamageTypesEditPage,
    exact: true,
  },
  {
    path: '/depot/material-types',
    name: 'Material Types',
    element: MaterialTypesListPage,
    exact: true,
  },
  {
    path: '/depot/material-types/:id',
    name: 'Edit Damage Type',
    element: MaterialTypesEditPage,
    exact: true,
  },
  {
    path: '/depot/depots',
    name: 'Depots',
    element: DepotsListPage,
    exact: true,
  },
  {
    path: '/depot/depots/:id',
    name: 'Edit Depots',
    element: DepotsEditPage,
    exact: true,
  },
  {
    path: '/depot/repair-status',
    name: 'Repair Status',
    element: RepairStatusListPage,
    exact: true,
  },
  {
    path: '/depot/repair-status/:id',
    name: 'Edit Repair Status',
    element: RepairStatusEditPage,
    exact: true,
  },
  {
    path: '/depot/repair-types',
    name: 'Repair Types',
    element: RepairTypesListPage,
    exact: true,
  },
  {
    path: '/depot/repair-types/:id',
    name: 'Edit Repair Types',
    element: RepairTypesEditPage,
    exact: true,
  },
  {
    path: '/depot/equipment-size',
    name: 'Equipment Size',
    element: EquipmentSizeListPage,
    exact: true,
  },
  {
    path: '/depot/equipment-size/:id',
    name: 'Edit Equipment Size',
    element: EquipmentSizeEditPage,
    exact: true,
  },
  {
    path: '/depot/item-types',
    name: 'Item Types',
    element: ItemTypesListPage,
    exact: true,
  },
  {
    path: '/depot/item-types/:id',
    name: 'Edit Item Types',
    element: ItemTypesEditPage,
    exact: true,
  },

  {
    path: '/depot/checklist-builder',
    name: 'Checklist Builder',
    element: ChecklistBuilderListPage,
    exact: true,
    module: MODULE_CHECKLIST_BUILDER
  },
  {
    path: '/depot/checklist-builder/:id',
    name: 'Edit Checklist Builder',
    element: ChecklistBuilderEditPage,
    exact: true
  },
  {
    path: '/depot/rental-plan',
    name: 'Rental Plan',
    element: RentalPlanListPage,
    exact: true,
    module: MODULE_RENTAL_PLAN
  },
  // Fuel Settings
  {
    path: '/fuel/settings/fuel-types',
    name: 'Fuel Types',
    element: FuelTypeListPage,
    exact: true,
    module: MODULE_FUEL_TYPE,
  },
  {
    path: '/fuel/settings/fuel-types/:id',
    name: 'Edit Fuel Type',
    element: FuelTypeEditPage,
    exact: true,
    module: MODULE_FUEL_TYPE,
  },
  {
    path: '/fuel/settings/fuel-unit-types',
    name: 'Fuel Unit Types',
    element: FuelUnitTypeListPage,
    exact: true,
    module: MODULE_FUEL_UNIT_TYPE,
  },
  {
    path: '/fuel/settings/fuel-unit-types/:id',
    name: 'Edit Fuel Unit Type',
    element: FuelUnitTypeEditPage,
    exact: true,
    module: MODULE_FUEL_UNIT_TYPE,
  },
  {
    path: '/fuel/settings/fuel-order-settings',
    name: 'Fuel Order Settings',
    element: FuelOrderSettingsListPage,
    exact: true,
    module: MODULE_FUEL_ORDER_SETTINGS,
  },
  {
    path: '/fuel/settings/fuel-order-settings/:id',
    name: 'Edit Fuel Order Setting',
    element: FuelOrderSettingsEditPage,
    exact: true,
    module: MODULE_FUEL_ORDER_SETTINGS,
  },
  {
    path: '/fuel/settings/fuel-order-signature',
    name: 'Fuel Order Signature',
    element: FuelOrderSignatureListPage,
    exact: true,
    module: MODULE_FUEL_ORDER_SIGNATURE,
  },
  {
    path: '/fuel/settings/pdf-builder',
    name: 'PDF Builder',
    element: FuelOrderPdfConfigListPage,
    exact: true,
    module: MODULE_FORMAT_BUILDER,
  },
  {
    path: '/fuel/settings/pdf-builder/:id',
    name: 'PDF Config',
    element: FuelOrderPdfConfigEditPage,
    exact: true,
    module: MODULE_FORMAT_BUILDER,
  },
  {
    path: '/fuel/gas-supplier',
    name: 'Gas Suppliers',
    element: GasSupplierListPage,
    exact: true,
    module: MODULE_GASSUPPLIER,
  },
  {
    path: '/fuel/gas-supplier/new',
    name: 'New Gas Supplier',
    element: GasSupplierEditPage,
    exact: true,
    module: MODULE_GASSUPPLIER,
  },
  {
    path: '/fuel/gas-supplier/:id',
    name: 'Edit Gas Supplier',
    element: GasSupplierEditPage,
    exact: true,
    module: MODULE_GASSUPPLIER,
  },
  {
    path: '/fuel/gas-supplier/:parentId/new',
    name: 'New Gas Store',
    element: GasStoreEditPage,
    exact: true,
    module: MODULE_GASSUPPLIER,
  },
  {
    path: '/fuel/gas-supplier/:parentId/:storeId',
    name: 'Edit Gas Store',
    element: GasStoreEditPage,
    exact: true,
    module: MODULE_GASSUPPLIER,
  },
  {
    path: '/fuel/fuel-price',
    name: 'Fuel Prices',
    element: FuelPriceListPage,
    exact: true,
    module: MODULE_FUEL_PRICE,
  },
  {
    path: '/fuel/fuel-price/:id',
    name: 'Edit Fuel Price',
    element: FuelPriceEditPage,
    exact: true,
    module: MODULE_FUEL_PRICE,
  },
  // Fuel Orders
  {
    path: '/fuel/fuelorder',
    name: 'Fuel Orders',
    element: FuelOrderListPage,
    exact: true,
    module: MODULE_FUEL_ORDERS,
  },
  {
    path: '/fuel/fuelorder/new',
    name: 'New Fuel Order',
    element: FuelOrderEditPage,
    exact: true,
    module: MODULE_FUEL_ORDERS,
  },
  {
    path: '/fuel/fuelorder/:id',
    name: 'Edit Fuel Order',
    element: FuelOrderEditPage,
    exact: true,
    module: MODULE_FUEL_ORDERS,
  },
  // Fuel Auditor
  {
    path: '/fuel/fuelauditor',
    name: 'Fuel Auditor',
    element: FuelAuditorListPage,
    exact: true,
    module: MODULE_FUEL_AUDITOR,
  },
  {
    path: '/fuel/fuelauditor/:id',
    name: 'Fuel Auditor View',
    element: FuelAuditorViewPage,
    exact: true,
    module: MODULE_FUEL_AUDITOR,
  },
  // Fuel Order Reconciliation
  {
    path: '/fuel/fuelorderreconciliation',
    name: 'Fuel Order Reconciliation',
    element: ReconciliationListPage,
    exact: true,
    module: MODULE_FUEL_ORDER_RECONCILIATION,
  },
  {
    path: '/fuel/fuelorderreconciliation/upload',
    name: 'Upload Reconciliation',
    element: ReconciliationUploadPage,
    exact: true,
    module: MODULE_FUEL_ORDER_RECONCILIATION,
  },
  {
    path: '/fuel/fuelorderreconciliation/review/:uploadSessionId',
    name: 'Review Reconciliation',
    element: ReconciliationReviewPage,
    exact: true,
    module: MODULE_FUEL_ORDER_RECONCILIATION,
  },
  // Subdivision Fuel Statement
  {
    path: '/fuel/subdivision-fuel-statement',
    name: 'Subdivision Fuel Statement',
    element: SubdivisionFuelStatementListPage,
    exact: true,
    module: MODULE_SUBDIVISION_FUEL_STATEMENT,
  },
  {
    path: '/fuel/subdivision-fuel-statement/:fuelStatementId',
    name: 'Edit Subdivision Fuel Statement',
    element: SubdivisionFuelStatementEditPage,
    exact: true,
    module: MODULE_SUBDIVISION_FUEL_STATEMENT,
  },
  // Gas Station Fuel Statement
  {
    path: '/fuel/gas-station-fuel-statement',
    name: 'Gas Station Fuel Statement',
    element: GasStationFuelStatementListPage,
    exact: true,
    module: MODULE_SUPPLIER_FUEL_STATEMENT,
  },
  {
    path: '/fuel/gas-station-fuel-statement/:fuelStatementId',
    name: 'Edit Gas Station Fuel Statement',
    element: GasStationFuelStatementEditPage,
    exact: true,
    module: MODULE_SUPPLIER_FUEL_STATEMENT,
  },
  // Fuel Week Summary
  {
    path: '/fuel/fuel-order-summary',
    name: 'Fuel Week Summary',
    element: FuelWeekSummaryPage,
    exact: true,
    module: MODULE_FUEL_WEEK_SUMMARY,
  },
  // Tires Assignment
  {
    path: '/mr/tires',
    name: 'Tires',
    element: TiresAssignmentListPage,
    exact: true,
    module: MODULE_TIRES,
  },
  {
    path: '/mr/tires/:id',
    name: 'Tires',
    element: TiresAssignmentEditPage,
    exact: true,
    module: MODULE_TIRES,
  },
  // Depot
  {
    path: '/depot/rental-plan/:id',
    name: 'Edit Rental Plan',
    element: RentalPlanEditPage,
    exact: true,
    module: MODULE_RENTAL_PLAN
  },
  {
    path: '/depot/rental-plan/:id',
    name: 'Edit Rental Plan',
    element: RentalPlanEditPage,
    exact: true,
    module: MODULE_RENTAL_PLAN
  },
  {
    path: '/depot-main/equipment-request',
    name: 'Equipment Requests Overview',
    element: EquipmentRequestListPage,
    exact: true
  },
  {
    path: '/depot-main/equipment-request/:id',
    name: 'Edit Equipment Request',
    element: EquipmentRequestEditPage,
    exact: true
  },
  {
    path: '/depot-main/gate-in',
    name: 'Gate In',
    element: GatesListPage,
    exact: true
  },
  {
    path: '/depot-main/gate-out',
    name: 'Gate Out',
    element: GatesListPage,
    exact: true
  },
  {
    path: '/depot-main/gates',
    name: 'Gates',
    element: GatesListPage,
    exact: true
  },
  {
    path: '/depot-main/gates/:gateId/:gateType',
    name: 'Gates',
    element: GatesEditPage,
    exact: true
  },
  {
    path: '/depot-main/depot-statement',
    name: 'Depot Statements',
    element: DepotStatementListPage,
    module: MODULE_DEPOTSTATEMENT,
    exact: true
  },
  {
    path: '/depot-main/depot-statement/new',
    name: 'New Depot Statement',
    element: DepotStatementFormPage,
    module: MODULE_DEPOTSTATEMENT,
    exact: true,
  },
  {
    path: '/depot-main/depot-statement/:id/:type',
    name: 'Edit Depot Statement',
    element: DepotStatementFormPage,
    module: MODULE_DEPOTSTATEMENT,
    exact: true
  },
  {
    path: '/depot-main/depot-reports',
    name: 'Depot Reports',
    element: DepotReportPage,
    module: MODULE_DEPOT_REPORTS,
    exact: true
  }
]

export default routes
