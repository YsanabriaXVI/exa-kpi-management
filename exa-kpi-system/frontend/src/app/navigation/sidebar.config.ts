import {
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  FolderKanban,
  LogOut,
  LucideIcon,
  Network,
  Settings2,
  TrendingUp,
  UsersRound,
} from "lucide-react";

export type NavigationItem = {
  id: string;
  label: string;
  path: string;
  moduleName: string;
  icon?: LucideIcon;
  children?: NavigationItem[];
};

export const sessionItems: NavigationItem[] = [
  {
    id: "notifications",
    label: "Notifications",
    path: "/app/notifications",
    moduleName: "Session",
    icon: Bell,
  },
  {
    id: "logout",
    label: "Log Out",
    path: "/app/logout",
    moduleName: "Session",
    icon: LogOut,
  },
];

export const navigationItems: NavigationItem[] = [
  {
    id: "kpi-management",
    label: "KPI Management",
    path: "/app/kpi-management",
    moduleName: "KPI Management",
    icon: TrendingUp,
    children: [
      {
        id: "kpi-definition-overview",
        label: "KPI Definition Overview",
        path: "/app/kpi-management/definition/overview",
        moduleName: "KPI Management",
        icon: FileText,
      },
      {
        id: "kpi-config-overview",
        label: "KPI Config Overview",
        path: "/app/kpi-management/config/overview",
        moduleName: "KPI Management",
        icon: Settings2,
      },
      {
        id: "set-kpi-config",
        label: "Set KPI Config",
        path: "/app/kpi-management/config/set",
        moduleName: "KPI Management",
        icon: Settings2,
      },
    ],
  },
  {
    id: "pool-kpis",
    label: "Pool KPIs",
    path: "/app/pool-kpis",
    moduleName: "Pool KPIs",
    icon: FolderKanban,
    children: [
      {
        id: "kpi-pool-overview",
        label: "KPI Pool Overview",
        path: "/app/pool-kpis/overview",
        moduleName: "Pool KPIs",
      },
      {
        id: "create-pool-info",
        label: "Create Pool Info",
        path: "/app/pool-kpis/create-pool-info",
        moduleName: "Pool KPIs",
      },
    ],
  },
  {
    id: "scorecards",
    label: "Scorecards",
    path: "/app/scorecards",
    moduleName: "Scorecards",
    icon: Network,
    children: [
      {
        id: "scorecard-overview",
        label: "Scorecard Overview",
        path: "/app/scorecards/overview",
        moduleName: "Scorecards",
      },
      {
        id: "create-scorecard-info",
        label: "Create Scorecard Info",
        path: "/app/scorecards/create-scorecard-info",
        moduleName: "Scorecards",
      },
      {
        id: "scorecard-assignment",
        label: "Scorecard Assignment",
        path: "/app/scorecards/assignment",
        moduleName: "Scorecards",
      },
    ],
  },
  {
    id: "monitoring-results",
    label: "Monitoring Results",
    path: "/app/monitoring-results",
    moduleName: "Monitoring Results",
    icon: CalendarDays,
    children: [
      {
        id: "monitoring-overview",
        label: "Monitoring Overview",
        path: "/app/monitoring-results/overview",
        moduleName: "Monitoring Results",
      },
      {
        id: "attached-scorecards",
        label: "Attached Scorecards",
        path: "/app/monitoring-results/attached-scorecards",
        moduleName: "Monitoring Results",
      },
      {
        id: "pool-input-schedule",
        label: "Pool Input Schedule",
        path: "/app/monitoring-results/pool-input-schedule",
        moduleName: "Monitoring Results",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    path: "/app/reports",
    moduleName: "Reports",
    icon: BarChart3,
    children: [
      {
        id: "latest-scorecard-results",
        label: "Latest ScoreCard Results",
        path: "/app/reports/latest-scorecard-results",
        moduleName: "Reports",
      },
      {
        id: "scorecard-results-history",
        label: "ScoreCard Results History",
        path: "/app/reports/scorecard-results-history",
        moduleName: "Reports",
      },
      {
        id: "analysis",
        label: "Analysis",
        path: "/app/reports/analysis",
        moduleName: "Reports",
        children: [
          {
            id: "kpi-analysis",
            label: "KPI Analysis",
            path: "/app/reports/analysis/kpi-analysis",
            moduleName: "Reports",
          },
          {
            id: "scorecard-analysis",
            label: "Scorecard Analysis",
            path: "/app/reports/analysis/scorecard-analysis",
            moduleName: "Reports",
          },
        ],
      },
    ],
  },
  {
    id: "roles-users",
    label: "Roles/Users",
    path: "/app/roles-users",
    moduleName: "Roles/Users",
    icon: UsersRound,
    children: [
      {
        id: "all-users",
        label: "All Users",
        path: "/app/roles-users/users",
        moduleName: "Roles/Users",
      },
      {
        id: "roles-permissions",
        label: "Roles & Permissions",
        path: "/app/roles-users/roles",
        moduleName: "Roles/Users",
      },
      {
        id: "user-action-log",
        label: "User Action Log",
        path: "/app/roles-users/audit-log",
        moduleName: "Roles/Users",
      },
    ],
  },
];

function flattenItems(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenItems(item.children) : []),
  ]);
}

export const flatNavigationItems = [
  ...flattenItems(navigationItems),
  ...sessionItems,
];

export { ChevronDown };
