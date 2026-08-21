import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./app/layout/AppLayout";
import { ModulePage } from "./pages/ModulePage";
import { flatNavigationItems } from "./app/navigation/sidebar.config";
import { KpiDefinitionOverview } from "./features/kpi-definition/KpiDefinitionOverview";
import { KpiDefinitionDetail } from "./features/kpi-definition/KpiDefinitionDetail";
import { KpiConfigOverview } from "./features/kpi-config/KpiConfigOverview";
import { SetKpiConfigPage } from "./features/kpi-config/SetKpiConfigPage";
import { KpiConfigDetail } from "./features/kpi-config/KpiConfigDetail";
import { KpiPoolOverview } from "./features/kpi-pool/KpiPoolOverview";
import { KpiPoolInfo } from "./features/kpi-pool/KpiPoolInfo";
import { KpiPoolDetail } from "./features/kpi-pool/KpiPoolDetail";
import { ManagePoolKpis } from "./features/kpi-pool/ManagePoolKpis";
import { PoolPeriodSchedule } from "./features/kpi-pool/PoolPeriodSchedule";
import { ScorecardOverview } from "./features/scorecards/ScorecardOverview";
import { CreateScorecardInfo } from "./features/scorecards/CreateScorecardInfo";
import { ScorecardDetail } from "./features/scorecards/ScorecardDetail";
import { ScorecardAssignment } from "./features/scorecards/ScorecardAssignment";
import { SelectAssignmentItems } from "./features/scorecards/SelectAssignmentItems";
import { ModuleLandingPage } from "./pages/ModuleLandingPage";
import { MonitoringOverview } from "./features/monitoring-results/MonitoringOverview";
import { PoolInputSchedule } from "./features/monitoring-results/PoolInputSchedule";
import { MonitoringResultsDetail } from "./features/monitoring-results/MonitoringResultsDetail";
import { AttachedScorecards } from "./features/monitoring-results/AttachedScorecards";
import { ResultEntry } from "./features/monitoring-results/ResultEntry";
import { LatestScorecardResults } from "./features/reports/LatestScorecardResults";
import { ReportsAnalysis } from "./features/reports/ReportsAnalysis";
import { ScorecardResultDetail } from "./features/reports/ScorecardResultDetail";
import { ScorecardResultsHistory } from "./features/reports/ScorecardResultsHistory";
import { KpiAnalysis } from "./features/reports/KpiAnalysis";
import { ScorecardAnalysis } from "./features/reports/ScorecardAnalysis";
import { rolesUsersRoutes } from "./features/roles-users/roles-users.routes";

const customPaths = new Set([
  "/app/kpi-management",
  "/app/pool-kpis",
  "/app/scorecards",
  "/app/monitoring-results",
  "/app/monitoring-results/overview",
  "/app/monitoring-results/pool-input-schedule",
  "/app/monitoring-results/detail",
  "/app/monitoring-results/attached-scorecards",
  "/app/monitoring-results/result-entry",
  "/app/monitoring-results/close-period",
  "/app/reports",
  "/app/reports/latest-scorecard-results",
  "/app/reports/analysis",
  "/app/reports/scorecard-result-detail",
  "/app/reports/scorecard-results-history",
  "/app/reports/analysis/kpi-analysis",
  "/app/reports/analysis/scorecard-analysis",
  "/app/roles-users",
  "/app/kpi-management/definition",
  "/app/kpi-management/config",
  "/app/kpi-management/definition/overview",
  "/app/kpi-management/config/overview",
  "/app/kpi-management/config/set",
  "/app/kpi-management/config/detail-record",
  "/app/pool-kpis/overview",
  "/app/pool-kpis/create-pool-info",
  "/app/pool-kpis/detail",
  "/app/pool-kpis/manage-kpis",
  "/app/pool-kpis/period-schedule",
  "/app/scorecards/overview",
  "/app/scorecards/create-scorecard-info",
  "/app/scorecards/detail",
  "/app/scorecards/assignment",
  "/app/scorecards/assignment/select-kpis-from-pool",
  "/app/scorecards/assignment/select-linked-scorecards",
]);

const moduleRoutes = flatNavigationItems
  .filter((item) => !customPaths.has(item.path))
  .map((item) => ({
  path: item.path.replace(/^\/app\/?/, ""),
  element: <ModulePage title={item.label} moduleName={item.moduleName} />,
  }));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/app/kpi-management" replace />,
  },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/app/kpi-management" replace />,
      },
      {
        path: "kpi-management/definition",
        element: <Navigate to="/app/kpi-management/definition/overview" replace />,
      },
      {
        path: "kpi-management/config",
        element: <Navigate to="/app/kpi-management/config/overview" replace />,
      },
      {
        path: "kpi-management/definition/overview",
        element: <KpiDefinitionOverview />,
      },
      {
        path: "kpi-management/definition/detail",
        element: <KpiDefinitionDetail />,
      },
      {
        path: "kpi-management/definition/detail/:definitionId",
        element: <KpiDefinitionDetail />,
      },
      {
        path: "kpi-management/config/overview",
        element: <KpiConfigOverview />,
      },
      {
        path: "kpi-management/config/set",
        element: <SetKpiConfigPage />,
      },
      {
        path: "kpi-management/config/detail-record",
        element: <KpiConfigDetail />,
      },
      {
        path: "kpi-management",
        element: <ModuleLandingPage moduleKey="kpi-management" />,
      },
      {
        path: "pool-kpis",
        element: <ModuleLandingPage moduleKey="pool-kpis" />,
      },
      {
        path: "pool-kpis/overview",
        element: <KpiPoolOverview />,
      },
      {
        path: "pool-kpis/create-pool-info",
        element: <KpiPoolInfo />,
      },
      {
        path: "pool-kpis/detail",
        element: <KpiPoolDetail />,
      },
      {
        path: "pool-kpis/detail/:poolId",
        element: <KpiPoolDetail />,
      },
      {
        path: "pool-kpis/manage-kpis",
        element: <ManagePoolKpis />,
      },
      {
        path: "pool-kpis/period-schedule",
        element: <PoolPeriodSchedule />,
      },
      {
        path: "scorecards",
        element: <ModuleLandingPage moduleKey="scorecards" />,
      },
      {
        path: "scorecards/overview",
        element: <ScorecardOverview />,
      },
      {
        path: "scorecards/create-scorecard-info",
        element: <CreateScorecardInfo />,
      },
      {
        path: "scorecards/detail",
        element: <ScorecardDetail />,
      },
      {
        path: "scorecards/assignment",
        element: <ScorecardAssignment />,
      },
      {
        path: "scorecards/assignment/select-kpis-from-pool",
        element: <SelectAssignmentItems type="kpis" />,
      },
      {
        path: "scorecards/assignment/select-linked-scorecards",
        element: <SelectAssignmentItems type="linked" />,
      },
      {
        path: "monitoring-results",
        element: <ModuleLandingPage moduleKey="monitoring-results" />,
      },
      {
        path: "monitoring-results/overview",
        element: <MonitoringOverview />,
      },
      {
        path: "monitoring-results/pool-input-schedule",
        element: <PoolInputSchedule />,
      },
      {
        path: "monitoring-results/detail",
        element: <MonitoringResultsDetail />,
      },
      {
        path: "monitoring-results/attached-scorecards",
        element: <AttachedScorecards />,
      },
      {
        path: "monitoring-results/result-entry",
        element: <ResultEntry />,
      },
      {
        path: "monitoring-results/close-period",
        element: <Navigate to="/app/monitoring-results/result-entry?poolId=1&period=Jun%202026&step=5" replace />,
      },
      {
        path: "reports",
        element: <ModuleLandingPage moduleKey="reports" />,
      },
      {
        path: "reports/latest-scorecard-results",
        element: <LatestScorecardResults />,
      },
      {
        path: "reports/analysis",
        element: <ReportsAnalysis />,
      },
      {
        path: "reports/scorecard-result-detail",
        element: <ScorecardResultDetail />,
      },
      {
        path: "reports/scorecard-results-history",
        element: <ScorecardResultsHistory />,
      },
      {
        path: "reports/analysis/kpi-analysis",
        element: <KpiAnalysis />,
      },
      {
        path: "reports/analysis/scorecard-analysis",
        element: <ScorecardAnalysis />,
      },
      ...rolesUsersRoutes,
      ...moduleRoutes,
    ],
  },
]);
