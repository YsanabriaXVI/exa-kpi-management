import { useId, useState, type SelectHTMLAttributes } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type {
  EvaluationScope,
  EntityEvaluationMode,
  SubjectSelection,
  GoalAssignment,
  GroupGoal,
  PeriodScope,
  SubjectGoal,
  SubjectType,
} from "./kpi-config.types";
import { ConfigMultiSelect } from "./ConfigMultiSelect";
import type { ReactNode } from "react";

type Unit = { id: string; symbol: string; name?: string; label: string };
type Subject = {
  id: string;
  subjectType: SubjectType;
  code: string;
  name: string;
};
type Props = {
  showGoalErrors?: boolean;
  subjectTypes?: Array<{code: string; name: string}>;
  periodScope: PeriodScope;
  setPeriodScope: (value: PeriodScope) => void;
  evaluationScope: EvaluationScope;
  setEvaluationScope: (value: EvaluationScope) => void;
  entityEvaluationMode?: EntityEvaluationMode;
  setEntityEvaluationMode?: (value: EntityEvaluationMode) => void;
  contributorSubjects?: SubjectSelection[];
  setContributorSubjects?: (value: SubjectSelection[]) => void;
  goalAssignment: GoalAssignment;
  setGoalAssignment: (value: GoalAssignment) => void;
  goal: string;
  setGoal: (value: string) => void;
  goalUnit: string;
  setGoalUnit: (value: string) => void;
  resultUnit: string;
  setResultUnit: (value: string) => void;
  subjectType: SubjectType | "";
  setSubjectType: (value: SubjectType | "") => void;
  subjectGoals: SubjectGoal[];
  setSubjectGoals: (value: SubjectGoal[]) => void;
  subjectGoalDrafts: Record<string, string>;
  setSubjectGoalDrafts: (value: Record<string, string>) => void;
  defaultGoal: string;
  setDefaultGoal: (value: string) => void;
  groupGoal: GroupGoal | null;
  setGroupGoal: (value: GroupGoal | null) => void;
  inputFrequencyCode: string;
  setInputFrequencyCode: (value: string) => void;
  dataSource: string;
  setDataSource: (value: string) => void;
  units: Unit[];
  subjects: Subject[];
  frequencies: Array<{ code: string; name: string }>;
  dataSources: Array<{ id: string; name: string }>;
  resultUnitError?: string;
  resultCalculationSetup?: ReactNode;
};

const referenceHelp = (scope: PeriodScope, frequency: string) => {
  if (scope === "CURRENT_PERIOD")
    return "The current Result will be evaluated directly against its Goal.";
  const examples: Record<string, [string, string, string]> = {
    MONTHLY: ["Sep 2026", "Sep 2025", "Aug 2026"],
    QUARTERLY: ["Q3 2026", "Q3 2025", "Q2 2026"],
    SEMIANNUAL: ["H2 2026", "H2 2025", "H1 2026"],
    ANNUAL: ["2026", "2025", "2025"],
  };
  const [current, previousYear, previous] =
    examples[frequency] ?? examples.MONTHLY!;
  return `Example: ${current} → ${scope === "SAME_PERIOD_PREVIOUS_YEAR" ? previousYear : previous}`;
};
const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/(^|[_\s-])\w/g, (character) => character.toUpperCase())
    .replace(/_/g, " ");
const formatNumericText = (value: string | number) => {
  const raw = String(value).replace(/,/g, "");
  if (!raw) return "";
  const [integer, decimal] = raw.split(".");
  const sign = integer?.startsWith("-") ? "-" : "";
  const digits = (integer ?? "").replace("-", "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${grouped}${raw.includes(".") ? `.${decimal ?? ""}` : ""}`;
};

function FormattedNumberInput({
  value,
  onValueChange,
  ...props
}: Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & { value: string; onValueChange: (value: string) => void }) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={formatNumericText(value)}
      onChange={(event) => {
        const raw = event.target.value.replace(/,/g, "");
        if (/^-?\d*(\.\d*)?$/.test(raw)) onValueChange(raw);
      }}
    />
  );
}

export function KpiSemanticSetup(props: Props) {
  const contributing = props.evaluationScope === "BY_SUBJECT" && props.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL";
  const individual = props.evaluationScope === "BY_SUBJECT" && !contributing;
  const selectedEntities = contributing ? props.contributorSubjects ?? [] : props.subjectGoals;
  const sameGoal = individual && props.goalAssignment === "SAME_GOAL_FOR_ALL";
  const [resultDefinitionOpen, setResultDefinitionOpen] = useState(true);
  const [applyToAll, setApplyToAll] = useState(false);
  const historical = props.periodScope !== "CURRENT_PERIOD";
  const [defaultGoalUnit, setDefaultGoalUnit] = useState(props.goalUnit || (historical ? "%" : props.resultUnit));
  const historicalPercentageTarget = historical && props.goalUnit === "%";
  const availableTypes = props.subjectTypes ? props.subjectTypes.map(type => type.code) : [
    ...new Map(
      props.subjects.map((item) => [
        item.subjectType.trim().toUpperCase(),
        item.subjectType,
      ]),
    ).values(),
  ].sort((left, right) => titleCase(left).localeCompare(titleCase(right)));
  const entities = props.subjects.filter(
    (item) => item.subjectType === props.subjectType,
  );
  const unitName = (symbol: string) => symbol === "%" ? "%" : props.units.find(unit => unit.symbol === symbol)?.name || symbol;
  const goalUnit = props.goalUnit || (historical ? "%" : "unit");
  const applyGoalToAll = (value: string, unit = historical ? "%" : defaultGoalUnit) => {
    if (!value.trim() || !Number.isFinite(Number(value))) return;
    props.setSubjectGoalDrafts(
      Object.fromEntries(
        props.subjectGoals.map((item) => [item.subjectExternalId, value]),
      ),
    );
    props.setSubjectGoals(
      props.subjectGoals.map((item) => ({ ...item, goal: Number(value), ...(unit ? { goalUnit: unit, ...(!historical ? { resultUnit: unit } : {}) } : {}) })),
    );
  };
  const individualTotal = props.subjectGoals.reduce((total, item) => {
    const value = props.subjectGoalDrafts[item.subjectExternalId];
    return (
      total +
      (value?.trim() && Number.isFinite(Number(value)) ? Number(value) : 0)
    );
  }, 0);
  const configuredGoals = props.subjectGoals.filter((item) => {
    const value = props.subjectGoalDrafts[item.subjectExternalId];
    return Boolean(value?.trim()) && Number.isFinite(Number(value)) && Boolean(item.goalUnit) && (!historical || Boolean(item.resultUnit));
  }).length;
  const missingGoals = props.subjectGoals.filter((item) => {
    const value = props.subjectGoalDrafts[item.subjectExternalId];
    return !value?.trim() || !Number.isFinite(Number(value));
  });
  const hasResultPreview =
    !individual
      ? Boolean(props.goal.trim() && props.resultUnit)
      : props.subjectGoals.length > 0;
  const setEntityUnit = (id: string, field: "goalUnit" | "resultUnit", value: string) => {
    props.setSubjectGoals(props.subjectGoals.map(row => row.subjectExternalId === id
      ? {...row, [field]: value, ...(!historical && field === "goalUnit" ? {resultUnit: value} : {})} : row));
  };

  return (
    <>
      <section className="config-card semantic-step goal-scope-card">
        <div className="config-section-heading">
          <span className="step-number">2</span>
          <div>
            <h2>Goal Scope</h2>
            <p>How should this KPI be evaluated?</p>
          </div>
        </div>
        <div className="goal-scope-browser">
          <div
            className="goal-scope-options"
            role="radiogroup"
            aria-label="Goal Scope"
          >
            <label
              className={props.evaluationScope === "OVERALL" ? "active" : ""}
            >
              <input
                type="radio"
                name="goal-scope"
                checked={props.evaluationScope === "OVERALL"}
                onChange={() => props.setEvaluationScope("OVERALL")}
              />
              <strong>Overall</strong>
            </label>
            <label
              className={props.evaluationScope === "BY_SUBJECT" ? "active" : ""}
            >
              <input
                type="radio"
                name="goal-scope"
                checked={props.evaluationScope === "BY_SUBJECT"}
                onChange={() => props.setEvaluationScope("BY_SUBJECT")}
              />
              <strong>By Entity</strong>
            </label>
          </div>
          <div className="goal-scope-description">
            <strong>
              {props.evaluationScope === "OVERALL"
                ? "One Goal and one Result for the KPI."
                : contributing ? "Entity Results are summed into one official KPI Result and evaluated once." : "One Goal/Target and one Result for each entity."}
            </strong>
            <small>
              {contributing ? "Each entity supplies an amount in the same unit. SUM produces one official KPI Result." : props.evaluationScope === "OVERALL"
                ? "Ejemplo: Ventas totales — Meta: $50,000 → Resultado oficial: $57,300. El KPI completo se evalúa una sola vez."
                : "Ejemplo: Entidad A — Meta: $80,000 → Resultado: $83,500 · Entidad B — Meta: $60,000 → Resultado: $58,200. Cada entidad se evalúa por separado."}
            </small>
          </div>
        </div>
        {props.evaluationScope === "BY_SUBJECT" && <fieldset className="config-choice-fieldset">
          <legend>How should entities participate?</legend>
          <p>Contributors are summed into one official Result. Use additive counts or quantities, such as incidents, units or USD. For percentages, ratios, unit costs or durations, evaluate each entity individually.</p>
          <div className="goal-scope-options" role="radiogroup" aria-label="Entity participation">
            <label className={contributing ? "active" : ""}><input type="radio" name="entity-participation" checked={contributing} onChange={() => props.setEntityEvaluationMode?.("CONTRIBUTE_TO_OVERALL")}/><strong>Contribute to one KPI result</strong></label>
            <label className={individual ? "active" : ""}><input type="radio" name="entity-participation" checked={individual} onChange={() => props.setEntityEvaluationMode?.("INDIVIDUAL")}/><strong>Evaluate individually</strong></label>
          </div>
        </fieldset>}
      </section>

      <section className="config-card semantic-step goal-setup-v2-card">
        <div className="config-section-heading">
          <span className="step-number">3</span>
          <div>
            <h2>Goal Setup</h2>
            <p>{historical ? individual ? "Set a target change (%) for each entity against its own historical Result." : contributing ? "Set one target change (%) for the combined Result against its historical total." : "Set a target change (%) for the overall Result against its historical reference." : "Define the period reference and official expectation."}</p>
          </div>
        </div>
        <div className="semantic-goal-order overall-goal-controls">
          <label>
            <span>Evaluation Reference</span>
            <SetupSelect
              value={props.periodScope}
              onChange={(e) => {
                const next = e.target.value as PeriodScope;
                props.setPeriodScope(next);
                if (!individual) props.setGoalUnit(next === "CURRENT_PERIOD" ? props.resultUnit : "%");
                setDefaultGoalUnit(next === "CURRENT_PERIOD" ? props.resultUnit : "%");
                props.setSubjectGoals(props.subjectGoals.map(row => next === "CURRENT_PERIOD"
                  ? {...row, goalUnit: row.resultUnit || "", resultUnit: row.resultUnit || ""}
                  : {...row, goalUnit: "%", resultUnit: row.resultUnit || (row.goalUnit !== "%" ? row.goalUnit : "") || ""}));
              }}
            >
              <option value="" disabled>
                Select evaluation reference
              </option>
              <option value="CURRENT_PERIOD">Current Period</option>
              <option value="SAME_PERIOD_PREVIOUS_YEAR">
                Same Period Previous Year
              </option>
              <option value="PREVIOUS_PERIOD">Previous Period</option>
            </SetupSelect>
            <small>
              {referenceHelp(props.periodScope, props.inputFrequencyCode)}
            </small>
          </label>
          {!individual && <label>
            <span>Goal Measurement Unit</span>
            <SetupSelect
              data-goal-invalid={!props.goalUnit}
              value={props.goalUnit}
              onChange={(e) => props.setGoalUnit(e.target.value)}
            >
              <option value="" disabled>
                Select Goal measurement unit
              </option>
              {props.units.filter(unit => !historical || unit.symbol === "%").map((unit) => (
                <option key={unit.id} value={unit.symbol}>
                  {unit.label}
                </option>
              ))}
            </SetupSelect>
            <small>
              {historical
                ? "Historical targets use % change. Capture the actual Result in its original unit."
                : "Unit used by the Goal."}
            </small>
          </label>}
          <label>
            <span>Data Source</span>
            <SetupSelect
              value={props.dataSource}
              onChange={(e) => props.setDataSource(e.target.value)}
            >
              <option value="" disabled>
                Select data source
              </option>
              {props.dataSources.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </SetupSelect>
            <small>Where the official Result will come from.</small>
          </label>
        </div>
        {!individual && (
          <div className="semantic-goal-fields">
            <label className="overall-goal-value">
              <span>{contributing ? historical ? "Global Target Change" : "Global Goal" : historical ? "Target Change" : "Goal"}</span>
              <div className="goal-input-with-prefix">
                <FormattedNumberInput
                  data-goal-invalid={!props.goal.trim() || !Number.isFinite(Number(props.goal))}
                  aria-invalid={props.showGoalErrors && (!props.goal.trim() || !Number.isFinite(Number(props.goal)))}
                  value={props.goal}
                  onValueChange={props.setGoal}
                  placeholder="Insert a Goal"
                />
                <strong>{unitName(props.goalUnit) || "Unit"}</strong>
              </div>
            </label>
          </div>
        )}
        {props.evaluationScope === "BY_SUBJECT" && (
          <div className="entity-goal-configuration">
            {individual && <div className="entity-goal-configuration-heading"><div>
              <h3>Entity Goal Configuration</h3>
              <p>{historical ? "Each entity has its own historical reference and target change (%)." : "Define a Goal for each entity. Each Result is evaluated separately."}</p>
            </div></div>}
            {contributing && <p>Enter one Result per entity in the official Result unit. Their sum is the only official KPI Result.</p>}
            <div className="by-entity-section subjects-section">
              <div className="by-entity-section-heading">
                <strong>Subjects</strong>
              </div>
              <div className="semantic-subject-picker">
                <label>
                  <span>Subject Type</span>
                  <SetupSelect
                    value={props.subjectType}
                    onChange={(event) => {
                      props.setSubjectType(
                        event.target.value as SubjectType | "",
                      );
                      props.setSubjectGoals([]);
                      props.setContributorSubjects?.([]);
                      props.setSubjectGoalDrafts({});
                      setApplyToAll(false);
                    }}
                  >
                    <option value="" disabled>
                      Select subject type
                    </option>
                    {availableTypes.map((type) => (
                      <option key={type.toUpperCase()} value={type}>
                        {props.subjectTypes?.find(item => item.code === type)?.name ?? titleCase(type)}
                      </option>
                    ))}
                  </SetupSelect>
                  <small>Category used to group this KPI's entities.</small>
                </label>
                <div className="entity-multiselect-field">
                  <div className="entity-field-label">
                    <span>Entities</span>
                    {props.subjectType && (
                      <small>{selectedEntities.length} selected</small>
                    )}
                  </div>
                  {props.subjectType ? (
                    <ConfigMultiSelect
                      label="Select entities"
                      options={entities.map((entity) => ({
                        value: entity.id,
                        label: entity.name,
                        description: entity.code,
                      }))}
                      selected={selectedEntities.map(
                        (item) => item.subjectExternalId,
                      )}
                      searchable
                      searchPlaceholder="Search entities..."
                      emptyText="No entities found."
                      showClearOption={false}
                      onChange={(selectedIds) => {
                        if (contributing) {
                          props.setContributorSubjects?.(selectedIds.map(id => {
                            const entity = entities.find(item => item.id === id)!;
                            return {subjectExternalId:entity.id,subjectCode:entity.code,subjectLabel:entity.name};
                          }));
                          return;
                        }
                        const selectedSet = new Set(selectedIds);
                        const nextGoals = selectedIds.map((id) => {
                          const existing = props.subjectGoals.find(
                            (item) => item.subjectExternalId === id,
                          );
                          const entity = entities.find(
                            (item) => item.id === id,
                          )!;
                          return (
                            existing ?? {
                              subjectExternalId: entity.id,
                              subjectCode: entity.code,
                              subjectLabel: entity.name,
                              goal: sameGoal ? Number(props.goal || 0) : 0,
                              goalUnit: historical ? "%" : defaultGoalUnit,
                              resultUnit: historical ? (props.resultUnit !== "%" ? props.resultUnit : "") : defaultGoalUnit,
                            }
                          );
                        });
                        const nextDrafts = Object.fromEntries(
                          Object.entries(props.subjectGoalDrafts).filter(
                            ([id]) => selectedSet.has(id),
                          ),
                        );
                        selectedIds.forEach((id) => {
                          if (!(id in nextDrafts)) nextDrafts[id] = sameGoal ? props.goal : "";
                        });
                        props.setSubjectGoals(nextGoals);
                        props.setSubjectGoalDrafts(nextDrafts);
                      }}
                    />
                  ) : (
                    <span className="entity-subject-empty-badge">
                      No Subject type has been selected
                    </span>
                  )}
                </div>
              </div>
            </div>
            {individual && <div className="different-goals-panel by-entity-section entity-goals-section">
              <div className="by-entity-section-heading">
                <strong>Entity Goals</strong>
                <small>
                  All entity goals are measured in: <b>{unitName(goalUnit)}</b>
                </small>
              </div>
              {!sameGoal && <div className="quick-fill entity-quick-fill">
                <span>Quick fill</span>
                <div>
                  <label className="quick-fill-field">
                  <span>Goal</span>
                  <FormattedNumberInput
                    value={props.defaultGoal}
                    onValueChange={(value) => {
                      props.setDefaultGoal(value);
                      if (applyToAll) applyGoalToAll(value);
                    }}
                    placeholder="Insert a Goal"
                  />
                  </label>
                  <label className="quick-fill-field">
                    <span>Default Goal Unit</span>
                    <SetupSelect value={historical ? "%" : defaultGoalUnit} onChange={event => {
                      setDefaultGoalUnit(event.target.value);
                      if (applyToAll) applyGoalToAll(props.defaultGoal, event.target.value);
                    }}>
                      <option value="">Select unit</option>
                      {props.units.filter(unit => !historical || unit.symbol === "%").map(unit => <option key={unit.id} value={unit.symbol}>{unit.label}</option>)}
                    </SetupSelect>
                  </label>
                  <label
                    className={`quick-fill-checkbox ${!props.subjectGoals.length || !props.defaultGoal.trim() || !Number.isFinite(Number(props.defaultGoal)) ? "disabled" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      disabled={
                        !props.subjectGoals.length ||
                        !props.defaultGoal.trim() ||
                        !Number.isFinite(Number(props.defaultGoal))
                      }
                      onChange={(event) => {
                        setApplyToAll(event.target.checked);
                        if (event.target.checked)
                          applyGoalToAll(props.defaultGoal);
                      }}
                    />
                    <span>Apply to all</span>
                  </label>
                </div>
              </div>}
              <div className={`subject-goal-table compact ${historical ? "entity-historical-units" : ""}`}>
                <div className="subject-goal-row head">
                  <span>Entity</span>
                  <span>{historical ? "Target Change" : "Goal"}</span>
                  <span>{historical ? "Target Unit" : "Goal Unit"}</span>
                  {historical && <span>Result Unit</span>}
                </div>
                {props.subjectGoals.map((subject) => (
                  <div
                    className="subject-goal-row"
                    key={subject.subjectExternalId}
                  >
                    <strong>{subject.subjectLabel}</strong>
                    <FormattedNumberInput
                      data-goal-invalid={!props.subjectGoalDrafts[subject.subjectExternalId]?.trim() || !Number.isFinite(Number(props.subjectGoalDrafts[subject.subjectExternalId]))}
                      aria-invalid={props.showGoalErrors && (!props.subjectGoalDrafts[subject.subjectExternalId]?.trim() || !Number.isFinite(Number(props.subjectGoalDrafts[subject.subjectExternalId])))}
                      disabled={sameGoal}
                      aria-label={`Goal for ${subject.subjectLabel}`}
                      value={
                        props.subjectGoalDrafts[subject.subjectExternalId] ?? ""
                      }
                      placeholder="Insert a Goal"
                      onValueChange={(value) => {
                        setApplyToAll(false);
                        props.setSubjectGoalDrafts({
                          ...props.subjectGoalDrafts,
                          [subject.subjectExternalId]: value,
                        });
                        props.setSubjectGoals(
                          props.subjectGoals.map((item) =>
                            item.subjectExternalId ===
                              subject.subjectExternalId && value !== ""
                              ? { ...item, goal: Number(value) }
                              : item,
                          ),
                        );
                      }}
                    />
                    <SetupSelect data-goal-invalid={!subject.goalUnit} aria-label={`${historical ? "Target" : "Goal"} Unit for ${subject.subjectLabel}`} value={subject.goalUnit ?? ""} onChange={event => setEntityUnit(subject.subjectExternalId, "goalUnit", event.target.value)}>
                      <option value="">Select unit</option>
                      {props.units.filter(unit => !historical || unit.symbol === "%").map(unit => <option key={unit.id} value={unit.symbol}>{unit.label}</option>)}
                    </SetupSelect>
                    {historical && <SetupSelect data-goal-invalid={!subject.resultUnit} aria-label={`Result Unit for ${subject.subjectLabel}`} value={subject.resultUnit ?? ""} onChange={event => setEntityUnit(subject.subjectExternalId, "resultUnit", event.target.value)}>
                      <option value="">Select unit</option>
                      {props.units.filter(unit => unit.symbol !== "%").map(unit => <option key={unit.id} value={unit.symbol}>{unit.label}</option>)}
                    </SetupSelect>}
                  </div>
                ))}
              </div>
              <div
                className={`entity-goals-completion ${configuredGoals === props.subjectGoals.length && props.subjectGoals.length ? "complete" : ""}`}
              >
                <span>
                  {configuredGoals} / {props.subjectGoals.length} goals
                  configured
                </span>
                <strong>
                  {configuredGoals === props.subjectGoals.length &&
                  props.subjectGoals.length
                    ? "✓ Complete"
                    : "Incomplete"}
                </strong>
              </div>
            </div>}
          </div>
        )}
      </section>

      <section className="config-card semantic-step result-definition-card">
        <div className="config-section-heading result-definition-heading">
          <span className="step-number">4</span>
          <div>
            <div className="result-definition-title-row">
              <h2>Result Definition</h2>
              <button
                type="button"
                className="result-definition-toggle"
                aria-expanded={resultDefinitionOpen}
                onClick={() => setResultDefinitionOpen((open) => !open)}
              >
                {resultDefinitionOpen ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )}
                {resultDefinitionOpen ? "Collapse" : "Expand"}
              </button>
            </div>
            <p>
              {!individual
                ? "Select the official Result unit and review the Result structure."
                : "Review the Result structure derived from Goal Setup."}
            </p>
          </div>
        </div>
        {!contributing && props.resultCalculationSetup}
        {!individual && (
          <div className="config-fields-grid official-result-unit-field">
            <label
              className={props.resultUnitError ? "has-field-error" : undefined}
            >
              <span>Official Result Unit</span>
              <SetupSelect
                data-goal-invalid={!props.resultUnit}
                value={props.resultUnit}
                aria-invalid={Boolean(props.resultUnitError)}
                onChange={(e) => props.setResultUnit(e.target.value)}
              >
                <option value="" disabled>
                  Select official Result unit
                </option>
                {props.units.map((unit) => (
                  <option key={unit.id} value={unit.symbol}>
                    {unit.label}
                  </option>
                ))}
              </SetupSelect>
              <small>
                {historicalPercentageTarget
                  ? "Select the unit of the actual measured Result. The percentage is only the target change."
                  : "The unit of the Result captured later in Monitoring."}
              </small>
              {props.resultUnitError && (
                <span className="field-error" role="alert">
                  {props.resultUnitError}
                </span>
              )}
            </label>
          </div>
        )}
        <div
          className={`result-definition-collapsible ${resultDefinitionOpen ? "open" : "collapsed"}`}
          aria-hidden={!resultDefinitionOpen}
        >
          <div>
            <div className="result-structure-preview">
              <div className="result-structure-heading">
                <h3>Result Structure Preview</h3>
                <span>
                  {historicalPercentageTarget
                    ? "Result Unit Required"
                    : "Read-only"}
                </span>
              </div>
              {!hasResultPreview ? (
                <div className="result-preview-empty">
                  <Search size={25} />
                  <strong>No Preview Available</strong>
                  <span>
                    Complete the required Goal configuration to preview the
                    Result structure.
                  </span>
                </div>
              ) : (
                <>
                  {individual && (
                    <div className="result-structure-summary">
                      {!individual && props.groupGoal && (
                        <div className="result-summary-badge group-goal-badge">
                          <span>Group Goal</span>
                          <strong>
                            {formatNumericText(props.groupGoal.value)}{" "}
                            <em>{unitName(props.groupGoal.unit)}</em>
                          </strong>
                        </div>
                      )}
                      <div className="result-summary-badge expected-entity-results-badge">
                        <span>Expected Entity Results</span>
                        <strong>{props.subjectGoals.length}</strong>
                      </div>
                    </div>
                  )}
                  {!individual ? (
                    <div className="overall-result-structure">
                      <p>
                        <span>Scope</span>
                        <strong>{contributing ? "By Entity / Contribute to one KPI result" : "Overall"}</strong>
                      </p>
                      <p>
                        <span>{contributing ? `Contributor inputs: ${selectedEntities.length} / Official Results` : "Expected Results"}</span>
                        <strong>1</strong>
                      </p>
                      <p>
                        <span>{contributing ? "Global Goal / Target" : "Goal / Target"}</span>
                        <strong>
                          {historical && Number(props.goal) > 0 ? "+" : ""}
                          {formatNumericText(props.goal) || "—"} {unitName(goalUnit)}
                        </strong>
                      </p>
                      <p>
                        <span>Official Result Unit</span>
                        <strong>{unitName(props.resultUnit) || "Not selected"}</strong>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="result-evaluation-block">
                        <h4>Individual Evaluations</h4>
                        <div className="monitoring-preview-table result-structure-table">
                          <div className="monitoring-preview-row head">
                            <span>Entity</span>
                            <span>Goal / Target</span>
                            <span>
                              Result Unit
                            </span>
                          </div>
                          {props.subjectGoals.map((subject) => {
                            const subjectGoal =
                              props.subjectGoalDrafts[
                                subject.subjectExternalId
                              ];
                            return (
                              <div
                                className="monitoring-preview-row"
                                key={subject.subjectExternalId}
                              >
                                <strong>{subject.subjectLabel}</strong>
                                <span>
                                  {historical && Number(subjectGoal) > 0
                                    ? "+"
                                    : ""}
                                  {formatNumericText(subjectGoal || "") || "—"}
                                  {` ${unitName(subject.goalUnit || "")}`}
                                </span>
                                <SetupSelect
                                  aria-label={`Individual Result Unit for ${subject.subjectLabel}`}
                                  value={subject.resultUnit || (!historical ? subject.goalUnit : "") || ""}
                                  onChange={event => setEntityUnit(subject.subjectExternalId, historical ? "resultUnit" : "goalUnit", event.target.value)}
                                >
                                  <option value="">Select unit</option>
                                  {props.units.filter(unit => !historical || unit.symbol !== "%").map(unit => (
                                    <option key={unit.id} value={unit.symbol}>{unit.label}</option>
                                  ))}
                                </SetupSelect>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                      {missingGoals.length > 0 && (
                        <div className="monitoring-preview-warning">
                          ⚠{" "}
                          {missingGoals
                            .map((item) => item.subjectLabel)
                            .join(", ")}{" "}
                          {missingGoals.length === 1 ? "is" : "are"} missing a
                          Goal.
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function SetupSelect({ children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const messageId = useId();
  const pending = props.value === "" && !props.disabled;
  return <>
    <select {...props}
      className={[className, pending ? "config-select-pending" : "config-select-selected"].filter(Boolean).join(" ")}
      aria-invalid={pending || props["aria-invalid"]}
      aria-describedby={[props["aria-describedby"], pending ? messageId : undefined].filter(Boolean).join(" ") || undefined}
    >{children}</select>
    {pending && <small id={messageId} className="config-select-required">Select an option.</small>}
  </>;
}
