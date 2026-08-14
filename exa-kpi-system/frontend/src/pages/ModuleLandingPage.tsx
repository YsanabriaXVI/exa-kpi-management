import { ArrowRight, BarChart3, CalendarCheck2, FileChartColumn, FolderKanban, Network, TrendingUp, UsersRound } from "lucide-react";
import "./module-landing.css";

type ModuleKey = "kpi-management" | "kpi-definition" | "kpi-config" | "pool-kpis" | "scorecards" | "monitoring-results" | "reports" | "roles-users";
type ModuleConfig = {
  eyebrow: string; title: string; description: string; icon: typeof TrendingUp; color: string;
  outcomes: string[];
  steps: { number: string; title: string; description: string }[];
  details: { title: string; description: string }[];
  guidance: string;
};

const modules: Record<ModuleKey, ModuleConfig> = {
  "kpi-management": {
    eyebrow: "Foundation module", title: "KPI Management", icon: TrendingUp, color: "blue",
    description: "Define the indicators your organization measures and configure how every KPI is calculated, evaluated and displayed.",
    outcomes: ["Consistent KPI definitions", "Standard evaluation rules", "Reusable configurations"],
    steps: [
      { number: "01", title: "Define", description: "Create the business definition, ownership and measurement intent." },
      { number: "02", title: "Configure", description: "Set goals, units, frequency and traffic-light thresholds." },
      { number: "03", title: "Publish", description: "Make approved KPI configurations available to KPI Pools." },
    ],
    details: [
      { title: "Business definitions", description: "Centralizes the name, description, category, purpose and organizational meaning of every indicator." },
      { title: "Measurement configuration", description: "Stores goals, units, calculation rules, input frequency and traffic-light ranges used for evaluation." },
      { title: "Governance and reuse", description: "Separates the stable KPI definition from configurations that may change between periods or contexts." },
    ],
    guidance: "Use this module before creating KPI Pools. A KPI should have a clear business definition and at least one approved configuration before it becomes available for reuse.",
  },
  "kpi-definition": {
    eyebrow: "KPI Management submodule", title: "KPI Definition", icon: TrendingUp, color: "definition",
    description: "Build the business catalog that explains what each KPI means, why it matters and who is responsible for its definition.",
    outcomes: ["Single business meaning", "Reusable definition records", "Clear ownership and purpose"],
    steps: [
      { number: "01", title: "Describe", description: "Give the KPI a clear name, code, description and business purpose." },
      { number: "02", title: "Classify", description: "Assign its category and the organizational context where it applies." },
      { number: "03", title: "Maintain", description: "Review the definition and keep its lifecycle state aligned with business use." },
    ],
    details: [
      { title: "Definition identity", description: "Maintains the unique code and name used to recognize the KPI throughout the system." },
      { title: "Business context", description: "Explains the objective, category and interpretation without tying the KPI to a specific calculation period." },
      { title: "Definition lifecycle", description: "Distinguishes records that are active, being prepared or no longer available for new configurations." },
    ],
    guidance: "Create the definition before configuring measurement rules. Keep it stable and business-oriented; goals, units, formulas and thresholds belong in KPI Config.",
  },
  "kpi-config": {
    eyebrow: "KPI Management submodule", title: "KPI Config", icon: BarChart3, color: "config",
    description: "Transform a KPI Definition into an executable measurement rule with goals, units, frequency, source and evaluation thresholds.",
    outcomes: ["Measurable KPI rules", "Consistent traffic lights", "Period-specific reuse"],
    steps: [
      { number: "01", title: "Select a definition", description: "Start from an approved KPI Definition to preserve its business meaning." },
      { number: "02", title: "Set measurement rules", description: "Define goal, unit, source, direction, frequency and calculation behavior." },
      { number: "03", title: "Configure evaluation", description: "Set the green, yellow and red ranges used to interpret performance." },
    ],
    details: [
      { title: "Measurement parameters", description: "Controls the target, unit, data source, input frequency and expected evaluation behavior." },
      { title: "Traffic-light thresholds", description: "Converts numeric results into consistent green, yellow or red performance states." },
      { title: "Configuration traceability", description: "Keeps each executable rule linked to its original definition and visible wherever it is reused." },
    ],
    guidance: "Create a new configuration when measurement rules change while the KPI's business meaning remains the same. Review ranges carefully before adding it to a KPI Pool.",
  },
  "pool-kpis": {
    eyebrow: "Organization module", title: "KPI Pools", icon: FolderKanban, color: "cyan",
    description: "Group approved KPI configurations into reusable pools for specific companies, departments, periods and operational scopes.",
    outcomes: ["Reusable KPI collections", "Controlled availability", "Clear organizational scope"],
    steps: [
      { number: "01", title: "Create the Pool", description: "Define its identity, companies, validity period and scope." },
      { number: "02", title: "Manage KPIs", description: "Select which configured indicators belong to the Pool." },
      { number: "03", title: "Use in ScoreCards", description: "Choose the Pool as the source when composing a ScoreCard." },
    ],
    details: [
      { title: "Organizational scope", description: "Defines which companies and departments can consume the indicators grouped in the Pool." },
      { title: "Validity period", description: "Controls the year and months during which the collection is available for ScoreCard composition." },
      { title: "KPI availability", description: "Distinguishes configurations that are available, already included or unavailable for the selected context." },
    ],
    guidance: "Use a Pool when several ScoreCards need a controlled, reusable catalog. Curating the Pool prevents unrelated KPI configurations from entering later compositions.",
  },
  scorecards: {
    eyebrow: "Composition module", title: "ScoreCards", icon: Network, color: "violet",
    description: "Build weighted performance models by combining KPIs from a Pool with contributions from other linked ScoreCards.",
    outcomes: ["100% weighted composition", "Department-level assignment", "Linked performance models"],
    steps: [
      { number: "01", title: "Create", description: "Define the ScoreCard period, Pool source and organizational scope." },
      { number: "02", title: "Assign", description: "Select KPIs and linked ScoreCards, then distribute exactly 100% weight." },
      { number: "03", title: "Monitor", description: "Use the completed ScoreCard to capture and evaluate results." },
    ],
    details: [
      { title: "Evaluation scope", description: "Connects the ScoreCard to companies, departments, collaborators, period and input frequency." },
      { title: "Weighted composition", description: "Combines Pool KPIs with Linked ScoreCards until their total contribution reaches exactly 100%." },
      { title: "Linked performance", description: "Allows another ScoreCard to contribute without duplicating each of its individual KPI configurations." },
    ],
    guidance: "Use a ScoreCard after its KPI Pool is ready. Assignment is complete only when every selected component has a meaningful weight and the total equals 100%.",
  },
  "monitoring-results": {
    eyebrow: "Execution module", title: "Monitoring Results", icon: CalendarCheck2, color: "green",
    description: "Capture periodic KPI results, follow attached ScoreCards and control the operational close of each measurement period.",
    outcomes: ["Timely result entry", "Period progress visibility", "Controlled closing process"],
    steps: [
      { number: "01", title: "Prepare", description: "Review the input schedule and ScoreCards attached to the period." },
      { number: "02", title: "Capture", description: "Enter KPI results and supporting information as they become available." },
      { number: "03", title: "Close", description: "Validate completeness and formally close the evaluation period." },
    ],
    details: [
      { title: "Expected inputs", description: "Determines which results are due according to ScoreCard duration and configured input frequency." },
      { title: "Evidence and progress", description: "Tracks captured values, pending submissions and operational completeness during the active period." },
      { title: "Period control", description: "Preserves a clear boundary between open evaluations and results that have been formally finalized." },
    ],
    guidance: "Use this module during the active measurement cycle. Review pending inputs regularly and close a period only after every required result has been validated.",
  },
  reports: {
    eyebrow: "Insight module", title: "Reports & Analysis", icon: FileChartColumn, color: "orange",
    description: "Explore ScoreCard performance, compare historical results and analyze the behavior of individual KPIs over time.",
    outcomes: ["Current performance visibility", "Historical comparison", "Decision-ready analysis"],
    steps: [
      { number: "01", title: "Review", description: "Start with the latest consolidated ScoreCard results." },
      { number: "02", title: "Compare", description: "Use history to identify changes, trends and recurring gaps." },
      { number: "03", title: "Analyze", description: "Drill into KPIs or ScoreCards to understand performance drivers." },
    ],
    details: [
      { title: "Latest performance", description: "Presents the newest consolidated state so users can identify priorities and deviations quickly." },
      { title: "Historical behavior", description: "Compares periods to reveal trends, recurring gaps and evidence of sustained improvement." },
      { title: "Analysis levels", description: "Supports investigation at individual KPI level and at weighted ScoreCard composition level." },
    ],
    guidance: "Use reports after monitoring data has been captured. Start with the latest result, compare it with history and then inspect the KPI or contribution driving the change.",
  },
  "roles-users": {
    eyebrow: "Administration module", title: "Roles & Users", icon: UsersRound, color: "slate",
    description: "Control who can access the KPI System and prepare role-based permissions for each business responsibility.",
    outcomes: ["Clear user ownership", "Role-based access", "Safer system administration"],
    steps: [
      { number: "01", title: "Register users", description: "Maintain the people who require access to the platform." },
      { number: "02", title: "Define roles", description: "Group permissions according to business responsibilities." },
      { number: "03", title: "Assign access", description: "Connect users to the appropriate roles and organizational scope." },
    ],
    details: [
      { title: "User identity", description: "Maintains the people who access the platform and their basic organizational information." },
      { title: "Business roles", description: "Groups responsibilities such as definition, configuration, monitoring, review and administration." },
      { title: "Access boundaries", description: "Prepares permissions that limit actions and visibility according to each assigned role." },
    ],
    guidance: "Use this module whenever responsibilities change or a person joins or leaves the KPI process. Access should follow the minimum permissions required for each role.",
  },
};

export function ModuleLandingPage({ moduleKey }: { moduleKey: ModuleKey }) {
  const config = modules[moduleKey];
  const Icon = config.icon;
  return <main className={`module-landing module-tone-${config.color}`}>
    <section className="module-landing-hero">
      <div className="module-landing-icon"><Icon size={30} /></div>
      <div className="module-landing-copy"><span>{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></div>
    </section>

    <section className="module-introduction">
      <header><span>About this module</span><h2>Purpose and information managed</h2></header>
      <div className="module-introduction-copy">
        <p className="module-introduction-lead">{config.guidance}</p>
        {config.details.map((item) => <p key={item.title}><strong>{item.title}.</strong> {item.description}</p>)}
      </div>
      <footer>{config.outcomes.map((outcome) => <span key={outcome}>{outcome}</span>)}</footer>
    </section>

    <section className="module-landing-section">
      <header><div><BarChart3 size={19} /><span><strong>How this module works</strong><small>Recommended sequence for the user</small></span></div></header>
      <div className="module-flow">{config.steps.map((step, index) => <article key={step.number}><span>{step.number}</span><div><h2>{step.title}</h2><p>{step.description}</p></div>{index < config.steps.length - 1 && <ArrowRight size={18} />}</article>)}</div>
    </section>
  </main>;
}
