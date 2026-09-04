import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import type {
  EvaluationScope,
  GoalAssignment,
  GroupGoal,
  PeriodScope,
  SubjectGoal,
  SubjectType,
} from "./kpi-config.types";
import { ConfigMultiSelect } from "./ConfigMultiSelect";

type Unit = { id: string; symbol: string; label: string };
type Subject = {
  id: string;
  subjectType: SubjectType;
  code: string;
  name: string;
};
type Props = {
  periodScope: PeriodScope;
  setPeriodScope: (value: PeriodScope) => void;
  evaluationScope: EvaluationScope;
  setEvaluationScope: (value: EvaluationScope) => void;
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
  const [groupGoalOpen, setGroupGoalOpen] = useState(false);
  const [resultDefinitionOpen, setResultDefinitionOpen] = useState(true);
  const [applyToAll, setApplyToAll] = useState(false);
  const [groupGoalDraft, setGroupGoalDraft] = useState({
    value: "",
    unit: "",
    label: "",
  });
  const historical = props.periodScope !== "CURRENT_PERIOD";
  const historicalPercentageTarget = historical && props.goalUnit === "%";
  const availableTypes = [
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
  const goalUnit = props.goalUnit || (historical ? "%" : "unit");
  const applyGoalToAll = (value: string) => {
    if (!value.trim() || !Number.isFinite(Number(value))) return;
    props.setSubjectGoalDrafts(
      Object.fromEntries(
        props.subjectGoals.map((item) => [item.subjectExternalId, value]),
      ),
    );
    props.setSubjectGoals(
      props.subjectGoals.map((item) => ({ ...item, goal: Number(value) })),
    );
  };
  const openGroupGoal = () => {
    setGroupGoalDraft({
      value: props.groupGoal ? String(props.groupGoal.value) : "",
      unit: props.groupGoal?.unit || props.goalUnit || props.resultUnit,
      label: props.groupGoal?.label ?? "",
    });
    setGroupGoalOpen(true);
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
    return Boolean(value?.trim()) && Number.isFinite(Number(value));
  }).length;
  const missingGoals = props.subjectGoals.filter((item) => {
    const value = props.subjectGoalDrafts[item.subjectExternalId];
    return !value?.trim() || !Number.isFinite(Number(value));
  });
  const hasResultPreview =
    props.evaluationScope === "OVERALL"
      ? Boolean(props.goal.trim() && props.resultUnit)
      : props.subjectGoals.length > 0;
  useEffect(() => {
    if (
      props.evaluationScope === "BY_SUBJECT" &&
      goalUnit &&
      !historicalPercentageTarget &&
      props.resultUnit !== goalUnit
    )
      props.setResultUnit(goalUnit);
  }, [
    goalUnit,
    historicalPercentageTarget,
    props.evaluationScope,
    props.resultUnit,
    props.setResultUnit,
  ]);

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
                : "One Goal/Target and one Result for each entity."}
            </strong>
            <small>
              {props.evaluationScope === "OVERALL"
                ? "Ejemplo: Ventas totales — Meta: $50,000 → Resultado oficial: $57,300. El KPI completo se evalúa una sola vez."
                : "Ejemplo: Entidad A — Meta: $80,000 → Resultado: $83,500 · Entidad B — Meta: $60,000 → Resultado: $58,200. Cada entidad se evalúa por separado."}
            </small>
          </div>
        </div>
      </section>

      <section className="config-card semantic-step goal-setup-v2-card">
        <div className="config-section-heading">
          <span className="step-number">3</span>
          <div>
            <h2>Goal Setup</h2>
            <p>Define the period reference and official expectation.</p>
          </div>
        </div>
        <div className="semantic-goal-order overall-goal-controls">
          <label>
            <span>Evaluation Reference</span>
            <select
              value={props.periodScope}
              onChange={(e) =>
                props.setPeriodScope(e.target.value as PeriodScope)
              }
            >
              <option value="" disabled>
                Select evaluation reference
              </option>
              <option value="CURRENT_PERIOD">Current Period</option>
              <option value="SAME_PERIOD_PREVIOUS_YEAR">
                Same Period Previous Year
              </option>
              <option value="PREVIOUS_PERIOD">Previous Period</option>
            </select>
            <small>
              {referenceHelp(props.periodScope, props.inputFrequencyCode)}
            </small>
          </label>
          <label>
            <span>Goal Measurement Unit</span>
            <select
              value={props.goalUnit}
              onChange={(e) => props.setGoalUnit(e.target.value)}
            >
              <option value="" disabled>
                Select Goal measurement unit
              </option>
              {props.units.map((unit) => (
                <option key={unit.id} value={unit.symbol}>
                  {unit.label}
                </option>
              ))}
            </select>
            <small>
              {historical
                ? "Use % for a relative change or another unit for an absolute change."
                : "Unit used by the Goal."}
            </small>
          </label>
          <label>
            <span>Data Source</span>
            <select
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
            </select>
            <small>Where the official Result will come from.</small>
          </label>
        </div>
        {props.evaluationScope === "OVERALL" && (
          <div className="semantic-goal-fields">
            <label className="overall-goal-value">
              <span>{historical ? "Target Change" : "Goal"}</span>
              <div className="goal-input-with-prefix">
                <FormattedNumberInput
                  value={props.goal}
                  onValueChange={props.setGoal}
                  placeholder="Insert a Goal"
                />
                <strong>{props.goalUnit || "Unit"}</strong>
              </div>
            </label>
          </div>
        )}
        {props.evaluationScope === "BY_SUBJECT" && (
          <div className="entity-goal-configuration">
            <div className="entity-goal-configuration-heading">
              <div>
                <h3>Entity Goal Configuration</h3>
                <p>
                  Define the subjects, individual entity goals, and optional
                  group goal.
                </p>
              </div>
              {props.groupGoal && (
                <div className="header-group-goal-value">
                  <span>Group Goal</span>
                  <strong>
                    <b>{formatNumericText(props.groupGoal.value)}</b>
                    <em>{props.groupGoal.unit}</em>
                  </strong>
                </div>
              )}
              <div className="header-group-goal">
                <div className="header-group-goal-control">
                  <label>
                    <input
                      type="checkbox"
                      checked={groupGoalOpen || props.groupGoal !== null}
                      onChange={(event) => {
                        if (event.target.checked) openGroupGoal();
                        else {
                          setGroupGoalOpen(false);
                          props.setGroupGoal(null);
                        }
                      }}
                    />
                    <span>Group Goal</span>
                  </label>
                  {props.groupGoal && !groupGoalOpen && (
                    <button type="button" onClick={openGroupGoal}>
                      Edit
                    </button>
                  )}
                </div>
                {groupGoalOpen && (
                  <div className="group-goal-mini-menu">
                    <label>
                      <span>Group Goal</span>
                      <FormattedNumberInput
                        value={groupGoalDraft.value}
                        onValueChange={(value) =>
                          setGroupGoalDraft({ ...groupGoalDraft, value })
                        }
                        placeholder="Insert a Goal"
                      />
                    </label>
                    <label>
                      <span>Measurement Unit</span>
                      <select
                        value={groupGoalDraft.unit}
                        onChange={(event) =>
                          setGroupGoalDraft({
                            ...groupGoalDraft,
                            unit: event.target.value,
                          })
                        }
                      >
                        <option value="">Select unit</option>
                        {props.units.map((unit) => (
                          <option key={unit.id} value={unit.symbol}>
                            {unit.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className="button primary"
                      disabled={
                        !groupGoalDraft.value ||
                        !Number.isFinite(Number(groupGoalDraft.value)) ||
                        !groupGoalDraft.unit
                      }
                      onClick={() => {
                        props.setGroupGoal({
                          value: Number(groupGoalDraft.value),
                          unit: groupGoalDraft.unit,
                          label: "Group Goal",
                        });
                        setGroupGoalOpen(false);
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="by-entity-section subjects-section">
              <div className="by-entity-section-heading">
                <strong>Subjects</strong>
              </div>
              <div className="semantic-subject-picker">
                <label>
                  <span>Subject Type</span>
                  <select
                    value={props.subjectType}
                    onChange={(event) => {
                      props.setSubjectType(
                        event.target.value as SubjectType | "",
                      );
                      props.setSubjectGoals([]);
                      props.setSubjectGoalDrafts({});
                      setApplyToAll(false);
                    }}
                  >
                    <option value="" disabled>
                      Select subject type
                    </option>
                    {availableTypes.map((type) => (
                      <option key={type.toUpperCase()} value={type}>
                        {titleCase(type)}
                      </option>
                    ))}
                  </select>
                  <small>Category used to group this KPI's entities.</small>
                </label>
                <div className="entity-multiselect-field">
                  <div className="entity-field-label">
                    <span>Entities</span>
                    {props.subjectType && (
                      <small>{props.subjectGoals.length} selected</small>
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
                      selected={props.subjectGoals.map(
                        (item) => item.subjectExternalId,
                      )}
                      searchable
                      searchPlaceholder="Search entities..."
                      emptyText="No entities found."
                      showClearOption={false}
                      onChange={(selectedIds) => {
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
                              goal: 0,
                            }
                          );
                        });
                        const nextDrafts = Object.fromEntries(
                          Object.entries(props.subjectGoalDrafts).filter(
                            ([id]) => selectedSet.has(id),
                          ),
                        );
                        selectedIds.forEach((id) => {
                          if (!(id in nextDrafts)) nextDrafts[id] = "";
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
            <div className="different-goals-panel by-entity-section entity-goals-section">
              <div className="by-entity-section-heading">
                <strong>Entity Goals</strong>
                <small>
                  All entity goals are measured in: <b>{goalUnit}</b>
                </small>
              </div>
              <div className="quick-fill">
                <span>Quick fill</span>
                <div>
                  <FormattedNumberInput
                    value={props.defaultGoal}
                    onValueChange={(value) => {
                      props.setDefaultGoal(value);
                      if (applyToAll) applyGoalToAll(value);
                    }}
                    placeholder="Insert a Goal"
                  />
                  <strong>{goalUnit}</strong>
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
              </div>
              <div className="subject-goal-table compact">
                <div className="subject-goal-row head">
                  <span>Entity</span>
                  <span>{historical ? "Target Change" : "Goal"}</span>
                  <span>Goal Measurement Unit</span>
                </div>
                {props.subjectGoals.map((subject) => (
                  <div
                    className="subject-goal-row"
                    key={subject.subjectExternalId}
                  >
                    <strong>{subject.subjectLabel}</strong>
                    <FormattedNumberInput
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
                    <span>{goalUnit}</span>
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
            </div>
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
              {props.evaluationScope === "OVERALL"
                ? "Select the official Result unit and review the Result structure."
                : "Review the Result structure derived from Goal Setup."}
            </p>
          </div>
        </div>
        {(props.evaluationScope === "OVERALL" ||
          historicalPercentageTarget) && (
          <div className="config-fields-grid official-result-unit-field">
            <label
              className={props.resultUnitError ? "has-field-error" : undefined}
            >
              <span>Official Result Unit</span>
              <select
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
              </select>
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
                  {props.evaluationScope === "BY_SUBJECT" && (
                    <div className="result-structure-summary">
                      {props.groupGoal && (
                        <div className="result-summary-badge group-goal-badge">
                          <span>Group Goal</span>
                          <strong>
                            {formatNumericText(props.groupGoal.value)}{" "}
                            <em>{props.groupGoal.unit}</em>
                          </strong>
                        </div>
                      )}
                      <div className="result-summary-badge">
                        <span>Expected Entity Results</span>
                        <strong>{props.subjectGoals.length}</strong>
                      </div>
                    </div>
                  )}
                  {props.evaluationScope === "OVERALL" ? (
                    <div className="overall-result-structure">
                      <p>
                        <span>Scope</span>
                        <strong>Overall</strong>
                      </p>
                      <p>
                        <span>Expected Results</span>
                        <strong>1</strong>
                      </p>
                      <p>
                        <span>Goal / Target</span>
                        <strong>
                          {historical && Number(props.goal) > 0 ? "+" : ""}
                          {formatNumericText(props.goal) || "—"} {goalUnit}
                        </strong>
                      </p>
                      <p>
                        <span>Official Result Unit</span>
                        <strong>{props.resultUnit || "Not selected"}</strong>
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
                              {historicalPercentageTarget
                                ? "Result Unit"
                                : "Goal Unit"}
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
                                  {` ${goalUnit}`}
                                </span>
                                {historicalPercentageTarget ? (
                                  <select
                                    aria-label={`Result Unit for ${subject.subjectLabel}`}
                                    aria-invalid={Boolean(
                                      props.resultUnitError,
                                    )}
                                    value={props.resultUnit}
                                    onChange={(event) =>
                                      props.setResultUnit(event.target.value)
                                    }
                                  >
                                    <option value="" disabled>
                                      Select unit
                                    </option>
                                    {props.units.map((unit) => (
                                      <option key={unit.id} value={unit.symbol}>
                                        {unit.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <strong>{goalUnit}</strong>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {historicalPercentageTarget && (
                          <small className="entity-unit-consistency-note">
                            One Official Result Unit applies to every entity in
                            this KPI.
                          </small>
                        )}
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
