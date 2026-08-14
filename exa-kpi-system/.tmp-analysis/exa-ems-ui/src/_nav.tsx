import React, { ElementType, JSX } from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilBell,
  cilCalculator,
  cilCalendar,
  cilChatBubble,
  cilChartPie,
  cilShieldAlt,
  cilCog,
  cilCursor,
  cilDollar,
  cilDrop,
  cilEnvelopeOpen,
  cilGrid,
  cilLayers,
  cilList,
  cilLocationPin,
  cilMap,
  cilNotes,
  cilPencil,
  cilPeople,
  cilHome,
  cilPuzzle,
  cilBuilding,
  cilSpeedometer,
  cilSpreadsheet,
  cilTruck,
  cilFindInPage,
  cilStorage,
  cilLibrary,
  cilWarning,
  cilDescription,
  cilCreditCard,
  cilInbox,
  cilPaint,
  cilPaintBucket,
  cilTablet,
  cilWallet,
  cilSync,
  cilAlbum,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react-pro'
import { Translation } from 'react-i18next'
import {
  MODULE_WORK_ORDERS,
  MODULE_TRIP,
  MODULE_TRIP_AUDITOR,
  MODULE_TRUCKS,
  MODULE_DRIVERS,
  MODULE_CLIENTS,
  MODULE_SUBDIVISION,
  MODULE_SUPPLIER_FUEL_STATEMENT,
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
  MODULE_PARTS_SECTIONS,
  MODULE_INVENTORYASSIGNMENTS,
  MODULE_CHASSIS,
  MODULE_INVOICE,
  MODULE_PAYMENTS,
  MODULE_INCIDENTS,
  MODULE_REPORT_WEEK_SUMMARY,
  MODULE_REPORT_GENERATOR,
  MODULE_DAMAGE_TYPES,
  MODULE_CHECKLIST_BUILDER,
  MODULE_MATERIAL_TYPES,
  MODULE_DEPOTS,
  MODULE_REPAIR_TYPES,
  MODULE_RENTAL_PLAN,
  MODULE_EQUIPMENT_SIZE,
  MODULE_ITEM_TYPES,
  MODULE_REPAIR_STATUS,
  MODULE_EQUIPMENT_REQUEST,
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
  MODULE_FUEL_WEEK_SUMMARY,
  MODULE_GATES,
  MODULE_DEPOTSTATEMENT,
  MODULE_RESET_MODULE,
  MODULE_TIRES,
  MODULE_DEPOT_REPORTS
} from './constants/modules'
import { isPaymentV2Enabled } from './modules/Payments/featureFlags'

export type Badge = {
  color: string
  text: string
}

export type NavItem = {
  badge?: Badge
  component: string | ElementType
  href?: string
  icon?: string | JSX.Element
  items?: NavItem[]
  name: string | JSX.Element
  to?: string
  module?: string  // Module reference for permission checks
  visibleToEmails?: string[]  // Restrict to specific user emails (beta features)
}

const _nav: NavItem[] = [
  {
    component: CNavItem,
    name: <Translation>{(t) => t('dashboard')}</Translation>,
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Operations',
  },
  {
    component: CNavGroup,
    name: 'Operations',
    to: '/operations',
    icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Work Orders',
        to: '/operations/workorders',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        module: MODULE_WORK_ORDERS,
      },
      {
        component: CNavItem,
        name: 'Trips',
        to: '/operations/trips',
        icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
        module: MODULE_TRIP,
      },
      {
        component: CNavItem,
        name: 'Trip Auditor',
        to: '/operations/trip-auditor',
        icon: <CIcon icon={cilFindInPage} customClassName="nav-icon" />,
        module: MODULE_TRIP_AUDITOR,
      },
      {
        component: CNavItem,
        name: 'Client Statement',
        to: '/operations/client-statements',
        icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
        module: MODULE_INVOICE,
      },
      {
        component: CNavItem,
        name: 'Subdivision Statement',
        to: '/operations/subdivision-statements',
        icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
        module: MODULE_SUBDIVISION,
      },
      // Payment v2 nav items — gated by feature flag
      ...(isPaymentV2Enabled() ? [
        {
          component: CNavItem,
          name: 'Payments',
          to: '/operations/payments',
          icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
          module: MODULE_PAYMENTS,
        },
        {
          component: CNavItem,
          name: 'Installments',
          to: '/operations/installments',
          icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
          module: MODULE_PAYMENTS,
        },
      ] as NavItem[] : []),
      {
        component: CNavItem,
        name: 'Reset',
        to: '/operations/reset',
        icon: <CIcon icon={cilSync} customClassName="nav-icon" />,
        module: MODULE_RESET_MODULE,
      },
      {
        component: CNavItem,
        name: 'Incidents',
        to: '/operations/incidents',
        icon: <CIcon icon={cilWarning} customClassName="nav-icon" />,
        module: MODULE_INCIDENTS,
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Assets',
  },
  {
    component: CNavGroup,
    name: 'Assets',
    to: '/assets',
    icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Trucks',
        to: '/assets/trucks',
        icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
        module: MODULE_TRUCKS,
      },
      {
        component: CNavItem,
        name: 'Drivers',
        to: '/assets/drivers',
        icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
        module: MODULE_DRIVERS,
      },
      {
        component: CNavItem,
        name: 'Clients',
        to: '/assets/clients',
        icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
        module: MODULE_CLIENTS,
      },
      {
        component: CNavItem,
        name: 'Subdivisions',
        to: '/assets/subdivisions',
        icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
        module: MODULE_SUBDIVISION,
      },
      {
        component: CNavItem,
        name: 'Inventory Assignments',
        to: '/assets/inventory',
        icon: <CIcon icon={cilStorage} customClassName="nav-icon" />,
        module: MODULE_INVENTORYASSIGNMENTS,
      },
      {
        component: CNavItem,
        name: 'Rate Builder',
        to: '/assets/rate-builder',
        icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
        module: MODULE_RATE_BUILDER,
      },
      {
        component: CNavItem,
        name: 'Rate Routes',
        to: '/assets/rate-routes',
        icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
        module: MODULE_RATE_ROUTES,
      },
      {
        component: CNavItem,
        name: 'Equipments',
        to: '/assets/equipments',
        icon: <CIcon icon={cilCog} customClassName="nav-icon" />,
        module: MODULE_CHASSIS,
      },
      {
        component: CNavItem,
        name: 'Other Assets',
        to: '/assets/otherassets',
        icon: <CIcon icon={cilGrid} customClassName="nav-icon" />,
        module: MODULE_OTHER_ASSETS,
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Depot',
  },
  {
    component: CNavGroup,
    name: 'Depot',
    to: '/depot',
    icon: <CIcon icon={cilStorage} customClassName="nav-icon" />,
    items: [
      {
        component: CNavGroup,
        name: 'Gates',
        to: '/depot-main/gates',
        icon: <CIcon icon={cilTablet} customClassName="nav-icon" />,
        module: MODULE_GATES,
        items: [
          {
            component: CNavItem,
            name: 'Gate IN',
            to: '/depot-main/gate-in',
            icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
            module: MODULE_GATES
          },
          {
            component: CNavItem,
            name: 'Gate OUT',
            to: '/depot-main/gate-out',
            icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
            module: MODULE_GATES
          },
          {
            component: CNavItem,
            name: 'Gate IN/OUT',
            to: '/depot-main/gates',
            icon: <CIcon icon={cilLayers} customClassName="nav-icon" />,
            module: MODULE_GATES
          }
        ]
      },
      {
        component: CNavItem,
        name: 'Equipment Request',
        to: '/depot-main/equipment-request',
        icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
        module: MODULE_EQUIPMENT_REQUEST,
      },
            {
        component: CNavItem,
        name: 'Depot Reports',
        to: '/depot-main/depot-reports',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        module: MODULE_DEPOT_REPORTS,
      },
      {
        component: CNavGroup,
        name: 'Financial',
        icon: <CIcon icon={cilWallet} customClassName="nav-icon" />,
        items:[
          {
            component: CNavItem,
            name: 'Depot Statements',
            to: '/depot-main/depot-statement',
            icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
            module: MODULE_DEPOTSTATEMENT,
          },
        ]
      },
      {
        component: CNavGroup,
        name: 'Settings',
        icon: <CIcon icon={cilCog} customClassName="nav-icon" />,
        items:[
          {
            component: CNavItem,
            name: 'Parts & Sections',
            to: '/depot/parts-and-sections',
            icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
            module: MODULE_PARTS_SECTIONS,
          },
          {
            component: CNavItem,
            name: 'Checklist Builder',
            to: '/depot/checklist-builder',
            icon: <CIcon icon={cilList} customClassName="nav-icon" />,
            module: MODULE_CHECKLIST_BUILDER,
          },
          {
            component: CNavItem,
            name: 'Rental Plan',
            to: '/depot/rental-plan',
            icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
            module: MODULE_RENTAL_PLAN,
          },
          {
            component: CNavItem,
            name: 'Damage Types',
            to: '/depot/damage-types',
            icon: <CIcon icon={cilWarning} customClassName="nav-icon" />,
            module: MODULE_DAMAGE_TYPES,
          },
          {
            component: CNavItem,
            name: 'Material Type',
            to: '/depot/material-types',
            icon: <CIcon icon={cilInbox} customClassName="nav-icon" />,
            module: MODULE_MATERIAL_TYPES,
          },
          {
            component: CNavItem,
            name: 'Depots',
            to: '/depot/depots',
            icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
            module: MODULE_DEPOTS,
          },
          {
            component: CNavItem,
            name: 'Repair Types',
            to: '/depot/repair-types',
            icon: <CIcon icon={cilPaint} customClassName="nav-icon" />,
            module: MODULE_REPAIR_TYPES,
          },
          {
            component: CNavItem,
            name: 'Repair Status',
            to: '/depot/repair-status',
            icon: <CIcon icon={cilPaintBucket} customClassName="nav-icon" />,
            module: MODULE_REPAIR_STATUS,
          },
          {
            component: CNavItem,
            name: 'Equipment Size',
            to: '/depot/equipment-size',
            icon: <CIcon icon={cilTruck} customClassName="nav-icon" />,
            module: MODULE_EQUIPMENT_SIZE,
          },
          {
            component: CNavItem,
            name: 'Item Types',
            to: '/depot/item-types',
            icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
            module: MODULE_ITEM_TYPES,
          }
        ]
      }
    ],
  },
  {
    component: CNavTitle,
    name: 'Fuel',
  },
  {
    component: CNavGroup,
    name: 'Fuel',
    to: '/fuel',
    icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Gas Supplier',
        to: '/fuel/gas-supplier',
        icon: <CIcon icon={cilHome} customClassName="nav-icon" />,
        module: MODULE_GASSUPPLIER,
      },
      {
        component: CNavItem,
        name: 'Fuel Price',
        to: '/fuel/fuel-price',
        icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
        module: MODULE_FUEL_PRICE,
      },
      {
        component: CNavItem,
        name: 'Fuel Orders',
        to: '/fuel/fuelorder',
        icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
        module: MODULE_FUEL_ORDERS,
      },
      {
        component: CNavItem,
        name: 'Fuel Auditor',
        to: '/fuel/fuelauditor',
        icon: <CIcon icon={cilFindInPage} customClassName="nav-icon" />,
        module: MODULE_FUEL_AUDITOR,
      },
      {
        component: CNavItem,
        name: 'Reconciliation',
        to: '/fuel/fuelorderreconciliation',
        icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
        module: MODULE_FUEL_ORDER_RECONCILIATION,
      },
      {
        component: CNavItem,
        name: 'Subdivision Statement',
        to: '/fuel/subdivision-fuel-statement',
        icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
        module: MODULE_SUBDIVISION_FUEL_STATEMENT,
      },
      {
        component: CNavItem,
        name: 'Gas Station Statement',
        to: '/fuel/gas-station-fuel-statement',
        icon: <CIcon icon={cilLibrary} customClassName="nav-icon" />,
        module: MODULE_SUPPLIER_FUEL_STATEMENT,
      },
      {
        component: CNavItem,
        name: 'Fuel Week Summary',
        to: '/fuel/fuel-order-summary',
        icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
        module: MODULE_FUEL_WEEK_SUMMARY,
      },
      {
        component: CNavGroup,
        name: 'Settings',
        icon: <CIcon icon={cilCog} customClassName="nav-icon" />,
        items: [
          {
            component: CNavItem,
            name: 'Fuel Types',
            to: '/fuel/settings/fuel-types',
            icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
            module: MODULE_FUEL_TYPE,
          },
          {
            component: CNavItem,
            name: 'Fuel Unit Types',
            to: '/fuel/settings/fuel-unit-types',
            icon: <CIcon icon={cilDrop} customClassName="nav-icon" />,
            module: MODULE_FUEL_UNIT_TYPE,
          },
          {
            component: CNavItem,
            name: 'Fuel Order Settings',
            to: '/fuel/settings/fuel-order-settings',
            icon: <CIcon icon={cilCog} customClassName="nav-icon" />,
            module: MODULE_FUEL_ORDER_SETTINGS,
          },
          {
            component: CNavItem,
            name: 'Fuel Order Signature',
            to: '/fuel/settings/fuel-order-signature',
            icon: <CIcon icon={cilPencil} customClassName="nav-icon" />,
            module: MODULE_FUEL_ORDER_SIGNATURE,
          },
          {
            component: CNavItem,
            name: 'PDF Builder',
            to: '/fuel/settings/pdf-builder',
            icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
            module: MODULE_FORMAT_BUILDER,
          },
        ],
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'M&R',
  },
  {
    component: CNavGroup,
    name: 'M&R',
    to: '/mr',
    icon: <CIcon icon={cilPaint} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Tires',
        to: '/mr/tires',
        icon: <CIcon icon={cilAlbum} customClassName="nav-icon" />,
        module: MODULE_TIRES,
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'Administrator',
  },
  {
    component: CNavGroup,
    name: 'Administrator',
    to: '/administrator',
    icon: <CIcon icon={cilCog} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Users',
        to: '/modules/users',
        icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
        module: MODULE_USERS,
      },
      {
        component: CNavItem,
        name: 'Roles',
        to: '/modules/roles',
        icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
        module: MODULE_ROLES,
      },
      {
        component: CNavItem,
        name: 'Attributes',
        to: '/modules/attributes',
        icon: <CIcon icon={cilList} customClassName="nav-icon" />,
        module: MODULE_ATTRIBUTES,
      },
      {
        component: CNavItem,
        name: 'Rate Plans',
        to: '/modules/rateplans',
        icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
        module: MODULE_RATE_BUILDER_ADMIN,
      },
      ...(isPaymentV2Enabled() ? [{
        component: CNavItem,
        name: 'Charge Configs',
        to: '/administrator/charge-configs',
        icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
        module: MODULE_PAYMENTS,
      }] as NavItem[] : []),
      {
        component: CNavItem,
        name: 'Format Builder',
        to: '/modules/formatbuilder',
        icon: <CIcon icon={cilSpreadsheet} customClassName="nav-icon" />,
        module: MODULE_FORMAT_BUILDER,
      },
      {
        component: CNavItem,
        name: 'Location Items',
        to: '/modules/locationitems',
        icon: <CIcon icon={cilMap} customClassName="nav-icon" />,
        module: MODULE_LOCATIONS,
      },
      {
        component: CNavItem,
        name: 'Locations',
        to: '/modules/locations',
        icon: <CIcon icon={cilLocationPin} customClassName="nav-icon" />,
        module: MODULE_LOCATIONS,
      },
      {
        component: CNavItem,
        name: 'Weeks',
        to: '/modules/weeks',
        icon: <CIcon icon={cilCalendar} customClassName="nav-icon" />,
        module: MODULE_WEEK_ADMIN,
      },
      {
        component: CNavItem,
        name: 'Companies',
        to: '/modules/companies',
        icon: <CIcon icon={cilBuilding} customClassName="nav-icon" />,
        module: MODULE_COMPANIES,
      },
    ],
  },
  {
    component: CNavTitle,
    name: 'AI Assistant',
    visibleToEmails: ['vantuyl45@gmail.com'],
  },
  {
    component: CNavItem,
    name: 'Nabi Chat',
    to: '/modules/agent',
    icon: <CIcon icon={cilChatBubble} customClassName="nav-icon" />,
    visibleToEmails: ['vantuyl45@gmail.com'],
  },
  {
    component: CNavItem,
    name: 'Approvals',
    to: '/modules/agent/approvals',
    icon: <CIcon icon={cilShieldAlt} customClassName="nav-icon" />,
    visibleToEmails: ['vantuyl45@gmail.com'],
  },
  {
    component: CNavTitle,
    name: 'Analytics & Reports',
  },
  {
    component: CNavGroup,
    name: 'Analytics & Reports',
    to: '/analytics',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
    items: [
      {
        component: CNavItem,
        name: 'Report Builder',
        to: '/analytics/report-builder',
        icon: <CIcon icon={cilDescription} customClassName="nav-icon" />,
        module: MODULE_REPORT_GENERATOR,
      },
      {
        component: CNavItem,
        name: 'Weekly Analytics',
        to: '/analytics/weekly',
        icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
        module: MODULE_REPORT_WEEK_SUMMARY,
      },
      ...(isPaymentV2Enabled() ? [{
        component: CNavItem,
        name: 'Payment Reports',
        to: '/analytics/payment-reports',
        icon: <CIcon icon={cilCreditCard} customClassName="nav-icon" />,
        module: MODULE_PAYMENTS,
      }] as NavItem[] : []),
    ],
  },

  // Commented out for now - New Modules section
  // {
  //   component: CNavTitle,
  //   name: 'New Modules',
  // },
  // {
  //   component: CNavGroup,
  //   name: 'New Modules',
  //   to: '/modules',
  //   icon: <CIcon icon={cilPuzzle} customClassName="nav-icon" />,
  //   items: [
  //     {
  //       component: CNavItem,
  //       name: 'Other Charges',
  //       to: '/modules/other-charges',
  //       icon: <CIcon icon={cilDollar} customClassName="nav-icon" />,
  //       badge: {
  //         color: 'success',
  //         text: 'NEW',
  //       },
  //     },
  //   ],
  // },
]

export default _nav