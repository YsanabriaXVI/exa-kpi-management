/**
 * Redux Store Configuration
 * Modern Redux Toolkit setup with TypeScript
 */

import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { baseApi } from './services/api/baseApi'
import authReducer from './store/slices/authSlice'
import workordersReducer from './modules/WorkOrders/store/workordersSlice'
import otherChargesReducer from './modules/OtherCharges/store/otherChargesSlice'
import usersReducer from './modules/Users/store/usersSlice'
import rolesReducer from './modules/Roles/store/rolesSlice'
import attributesReducer from './modules/Attributes/store/attributesSlice'
import ratePlansReducer from './modules/RatePlans/store/ratePlansSlice'
import formatBuilderReducer from './modules/FormatBuilder/store/formatBuilderSlice'
import locationItemsReducer from './modules/LocationItems/store/locationItemsSlice'
import locationsReducer from './modules/Locations/store/locationsSlice'
import weeksReducer from './modules/Weeks/store/weeksSlice'
import companiesReducer from './modules/Companies/store/companiesSlice'
import tripsReducer from './modules/Trips/store/tripsSlice'
import trucksReducer from './modules/Assets/Trucks/store/trucks.slice'
import driversReducer from './modules/Assets/Drivers/store/drivers.slice'
import clientsReducer from './modules/Assets/Clients/store/clients.slice'
import subdivisionsReducer from './modules/Assets/Subdivisions/store/subdivisions.slice'
import rateRoutesReducer from './modules/Assets/RateRoutes/store/rateRoutes.slice'
import ratebuilderReducer from './modules/RateBuilder/store/ratebuilderSlice'
import otherAssetsReducer from './modules/Assets/OtherAssets/store/otherAssets.slice'
import partsAndSectionsReducer from './modules/PartsAndSections/store/partsAndSectionsSlice';
import checklistBuilderReducer from './modules/ChecklistBuilder/store/checklistBuilderSlice';
import inventoryAssignmentsReducer from './modules/InventoryAssignments/store/inventoryAssignments.slice'
import equipmentsReducer from './modules/Assets/Equipments/store/equipments.slice'
import damageTypesReducer from './modules/DamageTypes/store/damageTypes.slice'
import invoicesReducer from './modules/Invoices/store/invoices.slice'
import subdivisionStatementsReducer from './modules/SubdivisionStatements/store/subdivisionStatements.slice'
import incidentsReducer from './modules/Incidents/store/incidents.slice'
import weeklyAnalyticsReducer from './modules/WeeklyAnalytics/store/weeklyAnalyticsSlice'
import reportBuilderReducer from './modules/ReportBuilder/store/reportBuilderSlice'
import materialTypesReducer from './modules/MaterialTypes/store/materialTypes.slice'
import depotsReducer from './modules/Depots/store/depots.slice'
import repairTypesReducer from './modules/RepairTypes/store/repairTypes.slice'
import equipmentSizeReducer from './modules/EquipmentSize/store/equipmentSize.slice'
import itemTypesReducer from './modules/ItemTypes/store/itemTypes.slice'
import repairStatusReducer from './modules/RepairStatus/store/repairStatus.slice'
import depotSetupJobsReducer from './modules/Assets/Clients/store/jobs.slice'
import equipmentRequestReducer from './modules/EquipmentRequest/store/equipmentRequest.slice'
import fuelTypesReducer from './modules/Fuel/FuelType/store/fuelType.slice'
import fuelUnitTypesReducer from './modules/Fuel/FuelUnitType/store/fuelUnitType.slice'
import fuelOrderSettingsReducer from './modules/Fuel/FuelOrderSettings/store/fuelOrderSettings.slice'
import fuelOrderSignatureReducer from './modules/Fuel/FuelOrderSignature/store/fuelOrderSignature.slice'
import gasSupplierReducer from './modules/Fuel/GasSupplier/store/gasSupplier.slice'
import fuelPriceReducer from './modules/Fuel/FuelPrice/store/fuelPrice.slice'
import fuelOrderReducer from './modules/Fuel/FuelOrder/store/fuelOrder.slice'
import fuelAuditorReducer from './modules/Fuel/FuelAuditor/store/fuelAuditor.slice'
import fuelOrderReconciliationReducer from './modules/Fuel/FuelOrderReconciliation/store/fuelOrderReconciliation.slice'
import subdivisionFuelStatementReducer from './modules/Fuel/SubdivisionFuelStatement/store/subdivisionFuelStatement.slice'
import gasStationFuelStatementReducer from './modules/Fuel/GasStationFuelStatement/store/gasStationFuelStatement.slice'
import fuelWeekSummaryReducer from './modules/Fuel/FuelWeekSummary/store/fuelWeekSummary.slice'
import fuelOrderPdfConfigReducer from './modules/Fuel/FuelOrderPdfConfig/store/fuelOrderPdfConfig.slice'
import gatesReducer from './modules/Gates/store/gates.slice'
import rentalPlanReducer from './modules/RentalPlan/store/rentalPlan.slice'
import depotStatementReducer from './modules/DepotStatement/store/global.slice'
import storageStatementReducer from './modules/DepotStatement/store/storageStatement.slice'
import rentalStatementReducer from './modules/DepotStatement/store/rentalStatement.slice'
import resetReducer from './modules/Reset/store/reset.slice'
import tiresAssignmentReducer from './modules/TiresAssigment/store/tiresAssignment.slice'
import depotReportsReducer from './modules/DepotReports/store/reports.slice'

// UI State slice (sidebar, theme, etc.)
export interface UIState {
  asideShow: boolean
  sidebarShow: boolean
  theme: string
  sidebarUnfoldable: boolean
}

const initialUIState: UIState = {
  asideShow: false,
  sidebarShow: true,
  theme: 'light',
  sidebarUnfoldable: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: initialUIState,
  reducers: {
    set: (state, action: PayloadAction<Partial<UIState>>) => {
      return { ...state, ...action.payload }
    },
    toggleSidebar: (state) => {
      state.sidebarShow = !state.sidebarShow
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light'
    },
  },
})

export const { set, toggleSidebar, toggleTheme } = uiSlice.actions

// Configure store
const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    auth: authReducer,
    workorders: workordersReducer,
    otherCharges: otherChargesReducer,
    users: usersReducer,
    roles: rolesReducer,
    attributes: attributesReducer,
    rateplans: ratePlansReducer,
    formatbuilder: formatBuilderReducer,
    locationitems: locationItemsReducer,
    locations: locationsReducer,
    weeks: weeksReducer,
    companies: companiesReducer,
    trips: tripsReducer,
    trucks: trucksReducer,
    drivers: driversReducer,
    clients: clientsReducer,
    subdivisions: subdivisionsReducer,
    rateroutes: rateRoutesReducer,
    ratebuilder: ratebuilderReducer,
    otherAssets: otherAssetsReducer,
    partsAndSections: partsAndSectionsReducer,
    checklistBuilder: checklistBuilderReducer,
    inventoryAssignments: inventoryAssignmentsReducer,
    equipments: equipmentsReducer,
    damageTypes: damageTypesReducer,
    invoices: invoicesReducer,
    subdivisionStatements: subdivisionStatementsReducer,
    incidents: incidentsReducer,
    weeklyAnalytics: weeklyAnalyticsReducer,
    reportBuilder: reportBuilderReducer,
    materialTypes: materialTypesReducer,
    depots: depotsReducer,
    repairTypes: repairTypesReducer,
    equipmentSize: equipmentSizeReducer,
    itemTypes: itemTypesReducer,
    jobs: depotSetupJobsReducer,
    equipmentRequest: equipmentRequestReducer,
    repairStatus: repairStatusReducer,
    fuelTypes: fuelTypesReducer,
    fuelUnitTypes: fuelUnitTypesReducer,
    fuelOrderSettings: fuelOrderSettingsReducer,
    fuelOrderSignature: fuelOrderSignatureReducer,
    gasSupplier: gasSupplierReducer,
    fuelPrice: fuelPriceReducer,
    fuelOrder: fuelOrderReducer,
    fuelAuditor: fuelAuditorReducer,
    fuelOrderReconciliation: fuelOrderReconciliationReducer,
    subdivisionFuelStatement: subdivisionFuelStatementReducer,
    gasStationFuelStatement: gasStationFuelStatementReducer,
    fuelWeekSummary: fuelWeekSummaryReducer,
    fuelOrderPdfConfig: fuelOrderPdfConfigReducer,
    rentalPlan: rentalPlanReducer,
    gates: gatesReducer,
    depotStatement: depotStatementReducer,
    depotReports: depotReportsReducer,
    storageDepotStatement: storageStatementReducer,
    rentalDepotStatement: rentalStatementReducer,
    reset: resetReducer,
    tiresAssignment: tiresAssignmentReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable for now, can be enabled with proper serialization
    }).concat(baseApi.middleware),
})

// Export types
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export type State = UIState // Backward compatibility

export default store
