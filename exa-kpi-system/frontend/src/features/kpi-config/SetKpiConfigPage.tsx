import { isSingleResultConfig } from "./single-result-model";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useMonitoringProfile } from "./MonitoringProfile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Database,
  CalendarDays,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  kpiDefinitionKeys,
  kpiDefinitionService,
} from "../kpi-definition/kpi-definition.service";
import { ApiError } from "../../api/http-client";
import type { LegacyKpiDefinitionOption } from "../kpi-definition/kpi-definition.types";
import { catalogManagementService } from "./catalog-management.service";
import { kpiConfigService } from "./kpi-config.service";
import { TrafficLightEditor } from "./TrafficLightEditor";
import { KpiSemanticSetup } from "./KpiSemanticSetup";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import type {
  GoalMode,
  EvaluationScope,
  EntityEvaluationMode,
  SubjectSelection,
  GoalType,
  GoalAssignment,
  GroupGoal,
  CalculationTemplate,
  ResultMethod,
  MeasurementInput,
  KpiConfigRecord,
  PeriodScope,
  SubjectGoal,
  SubjectType,
  TargetKind,
  TrafficLightRanges,
} from "./kpi-config.types";
import {
  goalPresentationForPeriodScope,
  normalizeMeasurementUnitOptions,
  resolvedPoolPeriodWorkflowStatus,
  requiresQuantitativeResultUnit,
  selectedGlobalEffectiveFrom,
} from "./kpi-config.setup";
import "./kpi-config.css";

const defaultRanges: TrafficLightRanges = {
  redFrom: 0,
  redTo: 64,
  yellowFrom: 65,
  yellowTo: 79,
  greenFrom: 80,
  greenTo: 100,
};

const formatImpactPeriod = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
const formatImpactStatus = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase();
const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const subjectTypeOptions: Array<{
  value: SubjectType;
  label: string;
  available: boolean;
}> = [
  { value: "FLEET", label: "By Target per Fleet", available: true },
  { value: "EMPLOYEE", label: "By Collaborator", available: true },
  { value: "CUSTOMER", label: "By Customer", available: true },
  { value: "LOCATION", label: "By Location", available: true },
  { value: "DEPARTMENT", label: "By Department", available: true },
  { value: "COMPANY", label: "By Company", available: true },
  {
    value: "OPERATION",
    label: "By Operation (Import / Export)",
    available: true,
  },
  { value: "PROJECT", label: "By Project", available: true },
  { value: "ASSET", label: "By Asset / Equipment", available: true },
];

export function SetKpiConfigPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const definitionSearchRef = useRef<HTMLDivElement>(null);
  const measurementUnitRef = useRef<HTMLSelectElement>(null);
  const initializedEditRef = useRef<number | null>(null);
  const openedFromDefinitionOverview =
    searchParams.get("from") === "definition-overview";
  const requestedDefinitionId = searchParams.get("kpiDefinitionId") ?? "";
  const requestedConfigId = Number(searchParams.get("kpiConfigId"));
  const isEditing = Number.isFinite(requestedConfigId) && requestedConfigId > 0;
  const editMode =
    searchParams.get("mode") === "POOL_PERIOD_EDIT"
      ? "POOL_PERIOD_EDIT"
      : isEditing
        ? "GLOBAL_EDIT"
        : "CREATE";
  const requestedPoolId = Number(searchParams.get("poolId"));
  const requestedInputPeriodId = searchParams.get("inputPeriodId") ?? "";
  const requestedPeriod = searchParams.get("period") ?? "";
  const requestedPeriodLabel = /^\d{4}-\d{2}/.test(requestedPeriod)
    ? new Date(
        `${requestedPeriod.slice(0, 7)}-01T00:00:00Z`,
      ).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : requestedPeriod || "Current period";
  const definitionLocked = Boolean(requestedDefinitionId) || isEditing;
  const storedDefinitionId =
    window.localStorage.getItem("exa:kpi-config-selected-draft") ?? "";
  const initialDefinitionId =
    requestedDefinitionId ||
    (!openedFromDefinitionOverview ? storedDefinitionId : "");
  const [searchTerm, setSearchTerm] = useState(() =>
    definitionLocked
      ? ""
      : (window.localStorage.getItem("exa:kpi-config-search-draft") ?? ""),
  );
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selected, setSelected] = useState<LegacyKpiDefinitionOption | null>(
    null,
  );
  const [lastSelectedDefinitionId, setLastSelectedDefinitionId] = useState<
    string | null
  >(() => {
    const stored = window.localStorage.getItem("exa:last-kpi-definition");
    return stored || null;
  });
  const [goal, setGoal] = useState("");
  const [configurationName,setConfigurationName] = useState("");
  const [customConfigurationName,setCustomConfigurationName] = useState(false);
  const [showGoalErrors, setShowGoalErrors] = useState(false);
  const [periodScope, setPeriodScope] = useState<PeriodScope>("CURRENT_PERIOD");
  const [inputFrequencyCode, setInputFrequencyCode] = useState("");
  const [entityEvaluationMode, setEntityEvaluationMode] = useState<EntityEvaluationMode>("INDIVIDUAL");
  const [contributorSubjects, setContributorSubjects] = useState<SubjectSelection[]>([]);
  const [goalMode, setGoalMode] = useState<GoalMode>("SINGLE");
  const [evaluationScope, setEvaluationScope] =
    useState<EvaluationScope>("OVERALL");
  const [goalType, setGoalType] = useState<GoalType>("SINGLE_VALUE");
  const [goalAssignment, setGoalAssignment] =
    useState<GoalAssignment>("DIFFERENT_GOAL_PER_SUBJECT");
  const [goalUnit, setGoalUnit] = useState("");
  const [resultMethod, setResultMethod] = useState<ResultMethod>("DIRECT");
  const [measurementInputs, setMeasurementInputs] = useState<
    MeasurementInput[]
  >([]);
  const [confirmedCalculationPattern, setConfirmedCalculationPattern] =
    useState("DIRECT");
  const [calculationTemplate, setCalculationTemplate] =
    useState<CalculationTemplate | null>(null);
  const [structuredGoal, setStructuredGoal] = useState<
    "" | "RANGE" | "BY_SUBJECT"
  >("");
  const [targetKind, setTargetKind] = useState<TargetKind>("ABSOLUTE_TARGET");
  const [rangeMinGoal, setRangeMinGoal] = useState("");
  const [rangeMaxGoal, setRangeMaxGoal] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType | "">("");
  const contributing = evaluationScope === "BY_SUBJECT" && entityEvaluationMode === "CONTRIBUTE_TO_OVERALL";
  const individual = evaluationScope === "BY_SUBJECT" && !contributing;
  const [subjectGoals, setSubjectGoals] = useState<SubjectGoal[]>([]);
  const [subjectGoalDrafts, setSubjectGoalDrafts] = useState<
    Record<string, string>
  >({});
  const [defaultGoal, setDefaultGoal] = useState("");
  const [groupGoal, setGroupGoal] = useState<GroupGoal | null>(null);
  const [applyDefaultToAll, setApplyDefaultToAll] = useState(false);
  const [measurementUnit, setMeasurementUnit] = useState("");
  const measurementUnitChosenRef = useRef(false);
  const [dataSource, setDataSource] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ranges, setRanges] = useState(defaultRanges);
  const [error, setError] = useState("");
  const [lockedFieldNotice, setLockedFieldNotice] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const lockedFieldTimerRef = useRef<number | null>(null);
  const [measurementUnitToastVisible, setMeasurementUnitToastVisible] =
    useState(false);
  const measurementUnitToastTimerRef = useRef<number | null>(null);
  const [validationToast, setValidationToast] = useState("");
  const [resultUnitErrorVisible, setResultUnitErrorVisible] = useState(false);
  const [resultUnitToastVisible, setResultUnitToastVisible] = useState(false);
  const validationToastTimerRef = useRef<number | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [applyToFuturePeriods, setApplyToFuturePeriods] = useState(true);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactSaveRequested, setImpactSaveRequested] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);
  const [impactReviewed, setImpactReviewed] = useState(false);
  const [reviewedEligiblePeriods, setReviewedEligiblePeriods] = useState<
    Set<string>
  >(() => new Set());

  const clearSubjectGoalSetup = () => {
    setSubjectType("");
    setSubjectGoals([]);
    setSubjectGoalDrafts({});
    setDefaultGoal("");
    setApplyDefaultToAll(false);
  };

  const requestedDefinitionQuery = useQuery({
    queryKey: ["kpi-definitions", "detail", initialDefinitionId],
    queryFn: () => kpiDefinitionService.get(initialDefinitionId),
    enabled: !isEditing && Boolean(initialDefinitionId),
  });
  const selectedDefinitionLabel = selected
    ? `${selected.code} — ${selected.name}`
    : "";
  const searchQueryTerm = autocompleteQueryTerm(
    debouncedSearchTerm,
    selectedDefinitionLabel,
  );
  const definitionsSearchQuery = useQuery({
    queryKey: ["kpi-definitions", "search", searchQueryTerm],
    queryFn: () => kpiDefinitionService.searchActiveOptions(searchQueryTerm),
    enabled: !definitionLocked && suggestionsOpen,
    staleTime: 60 * 1000,
  });
  const editConfigQuery = useQuery({
    queryKey: ["kpi-config-detail", requestedConfigId],
    queryFn: () => kpiConfigService.getDetail(requestedConfigId),
    enabled: isEditing,
    staleTime: 30 * 1000,
  });
  const lookupsQuery = useQuery({
    queryKey: ["kpi-config-lookups"],
    queryFn: () => kpiConfigService.lookups(),
    staleTime: 5 * 60 * 1000,
    enabled: editMode !== "POOL_PERIOD_EDIT",
  });
  const subjectTypesQuery = useQuery({
    queryKey: ["catalog-subject-types"],
    queryFn: catalogManagementService.subjectTypes,
    enabled: editMode !== "POOL_PERIOD_EDIT",
  });
  const subjectLookupsQuery = useQuery({
    queryKey: ["kpi-config-subject-lookups"],
    queryFn: () => kpiPoolService.lookups(),
    staleTime: 5 * 60 * 1000,
    enabled:
      editMode !== "POOL_PERIOD_EDIT" &&
      (subjectType === "COMPANY" || subjectType === "DEPARTMENT"),
  });
  const analyzerQuery = useQuery({
    queryKey: ["kpi-definition-analysis", selected?.id, selected?.name],
    queryFn: ({ signal }) =>
      kpiDefinitionService.analyze(selected!.name, signal),
    enabled: editMode !== "POOL_PERIOD_EDIT" && Boolean(selected),
    staleTime: 5 * 60 * 1000,
  });
  const analysis = analyzerQuery.data;
  const poolEffectiveQuery = useQuery({
    queryKey: [
      "pool-effective-kpi-settings",
      requestedPoolId,
      requestedInputPeriodId,
      requestedConfigId,
    ],
    queryFn: () =>
      kpiPoolService.getEffectiveSettings(
        requestedPoolId,
        requestedInputPeriodId,
        String(requestedConfigId),
      ),
    enabled:
      editMode === "POOL_PERIOD_EDIT" &&
      requestedPoolId > 0 &&
      Boolean(requestedInputPeriodId) &&
      isEditing,
  });
  const globalImpactQuery = useQuery({
    queryKey: ["kpi-config-global-edit-impact", requestedConfigId],
    queryFn: async () => {
      const usage = (
        await kpiPoolService.getConfigurationUsage([String(requestedConfigId)])
      )[0];
      return Promise.all(
        (usage?.pools ?? []).map(async (pool) => {
          const poolClosed =
            pool.status === "INACTIVE" || pool.validTo < todayIsoDate();
          const periods = (
            await kpiPoolService.getInputPeriods(Number(pool.id))
          ).data;
          const workflowPeriods = await Promise.all(
            periods.map(async (period) => {
              if (poolClosed)
                return { ...period, workflowStatus: "CLOSED" as const };
              if (!period.poolPeriodId || period.workflowStatus === "FINALIZED")
                return period;
              try {
                const settings = await kpiPoolService.getEffectiveSettings(
                  Number(pool.id),
                  period.poolPeriodId,
                  String(requestedConfigId),
                );
                return {
                  ...period,
                  workflowStatus: resolvedPoolPeriodWorkflowStatus(
                    period.workflowStatus,
                    settings.period.status,
                    settings.editability?.reason,
                  ),
                };
              } catch {
                return period;
              }
            }),
          );
          return { pool, periods: workflowPeriods };
        }),
      );
    },
    enabled: editMode === "GLOBAL_EDIT" && isEditing,
    staleTime: 30 * 1000,
  });
  const toggleReviewedPeriod = (key: string) =>
    setReviewedEligiblePeriods((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const affectedPools = globalImpactQuery.data ?? [];
  const unassignedConfiguration = globalImpactQuery.isSuccess && affectedPools.length === 0;
  const hasAffectedPools = affectedPools.some(({ periods }) =>
    periods.some(
      (period) =>
        period.workflowStatus === "EDITABLE" ||
        period.workflowStatus === "FUTURE",
    ),
  );
  const selectedGlobalEffectiveDate = selectedGlobalEffectiveFrom(
    affectedPools.flatMap(({ pool, periods }) =>
      periods.map((period) => ({
        ...period,
        selectionKey: `${pool.id}:${period.periodKey}`,
      })),
    ),
    reviewedEligiblePeriods,
    todayIsoDate(),
  );
  const globalChangeReason = hasAffectedPools
    ? changeReason
    : "Global configuration updated with no affected Pools.";
  useEffect(() => {
    const definition = requestedDefinitionQuery.data;
    if (isEditing || !definition?.isActive || selected) return;
    const option: LegacyKpiDefinitionOption = {
      id: definition.id,
      code: definition.kpiCode,
      name: definition.kpiName,
      objective: definition.description,
      status: definition.status,
    };
    setSelected(option);
    setSearchTerm(`${option.code} — ${option.name}`);
  }, [isEditing, requestedDefinitionQuery.data, selected]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearchTerm(searchTerm),
      300,
    );
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const config = editConfigQuery.data;
    if (!isEditing || !config || initializedEditRef.current === config.id)
      return;
    const definition = {
      id: String(config.definitionId),
      code: config.definitionCode,
      name: config.definitionName,
      objective: "",
      status: "ACTIVE" as const,
    };

    initializedEditRef.current = config.id;
    setSelected(definition);
    setSearchTerm(`${definition.code} — ${definition.name}`);
    setGoal(String(config.goal));
    setConfigurationName(config.configurationName ?? "");
    setCustomConfigurationName(Boolean(config.configurationName));
    setPeriodScope(config.periodScope ?? "CURRENT_PERIOD");
    setInputFrequencyCode(config.inputFrequencyCode ?? "MONTHLY");
    setEntityEvaluationMode(config.entityEvaluationMode ?? "INDIVIDUAL");
    setContributorSubjects(config.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? config.subjects ?? [] : []);
    setGoalMode(config.goalMode ?? "SINGLE");
    setEvaluationScope(
      config.evaluationScope ??
        (config.goalMode === "BY_SUBJECT" ? "BY_SUBJECT" : "OVERALL"),
    );
    setGoalType(
      config.goalType ??
        (config.goalMode === "RANGE" ? "RANGE" : "SINGLE_VALUE"),
    );
    setGoalAssignment("DIFFERENT_GOAL_PER_SUBJECT");
    setGoalUnit(config.goalUnit ?? config.measurementUnit);
    setResultMethod(config.resultMethod ?? "DIRECT");
    setMeasurementInputs(config.measurementInputs ?? []);
    setCalculationTemplate(config.calculationTemplate ?? null);
    setConfirmedCalculationPattern("DIRECT");
    setStructuredGoal(
      config.goalMode === "RANGE" || config.goalMode === "BY_SUBJECT"
        ? config.goalMode
        : "",
    );
    setTargetKind(config.targetKind ?? "ABSOLUTE_TARGET");
    setRangeMinGoal(
      config.rangeMinGoal == null ? "" : String(config.rangeMinGoal),
    );
    setRangeMaxGoal(
      config.rangeMaxGoal == null ? "" : String(config.rangeMaxGoal),
    );
    setSubjectType(config.subjectType ?? "");
    const configuredSubjects = config.subjects?.length
      ? config.subjects.map((item) => ({
          ...item,
          goalUnit: config.subjectGoals?.find(row => row.subjectExternalId === item.subjectExternalId)?.goalUnit ?? config.goalUnit ?? config.measurementUnit,
          resultUnit: config.subjectGoals?.find(row => row.subjectExternalId === item.subjectExternalId)?.resultUnit ?? config.measurementUnit,
          goal:
            config.subjectGoals?.find(
              (subjectGoal) =>
                subjectGoal.subjectExternalId === item.subjectExternalId,
            )?.goal ?? config.goal,
        }))
      : (config.subjectGoals ?? []);
    setSubjectGoals(config.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL" ? [] : configuredSubjects);
    setGroupGoal(config.groupGoal ?? null);
    setSubjectGoalDrafts(
      Object.fromEntries(
        configuredSubjects.map((item) => [
          item.subjectExternalId,
          String(item.goal),
        ]),
      ),
    );
    setMeasurementUnit(config.measurementUnit);
    setDataSource(config.dataSource);
    setIsActive(config.isActive ?? config.status !== "INACTIVE");
    setRanges({ ...config.ranges });
    if (editMode !== "POOL_PERIOD_EDIT") {
      setPeriodScope("CURRENT_PERIOD"); setEvaluationScope("OVERALL"); setGoalMode("SINGLE");
      setGoalType("SINGLE_VALUE"); setGoalAssignment("SAME_GOAL_FOR_ALL");
      setResultMethod("DIRECT"); setMeasurementInputs([]); setCalculationTemplate(null);
      setTargetKind("ABSOLUTE_TARGET"); setSubjectType(""); setSubjectGoals([]); setContributorSubjects([]); setGroupGoal(null);
      setMeasurementUnit(config.goalUnit || config.measurementUnit);
      if (config.evaluationScope === "BY_SUBJECT" || config.periodScope !== "CURRENT_PERIOD") setGoal("");
    }
  }, [editConfigQuery.data, isEditing]);

  useEffect(() => {
    const resolved = poolEffectiveQuery.data;
    if (editMode !== "POOL_PERIOD_EDIT" || !resolved) return;
    setGoal(String(resolved.effective.goal ?? ""));
    const byCode = new Map(
      (resolved.effective.thresholds ?? []).map((item: any) => [
        item.code,
        item,
      ]),
    );
    const red: any = byCode.get("RED"),
      yellow: any = byCode.get("YELLOW"),
      green: any = byCode.get("GREEN");
    if (red && yellow && green)
      setRanges({
        redFrom: Number(red.rangeMinPercent),
        redTo: Number(red.rangeMaxPercent) - (red.includesMax ? 0 : 1),
        yellowFrom: Number(yellow.rangeMinPercent),
        yellowTo: Number(yellow.rangeMaxPercent) - (yellow.includesMax ? 0 : 1),
        greenFrom: Number(green.rangeMinPercent),
        greenTo: Number(green.rangeMaxPercent),
      });
  }, [editMode, poolEffectiveQuery.data]);

  useEffect(() => {
    if (editMode !== "CREATE" || !selected || !analysis) return;
    const unitAliases: Record<string, string[]> = {
      CONTAINERS: ["containers", "count"],
      COUNT: ["count", "units"],
      KM: ["km", "kms"],
      INCIDENTS: ["incidents", "count"],
      PERCENT: ["%"],
      USD: ["USD"],
      "USD/KM": ["USD/KM"],
    };
    if (!measurementUnitChosenRef.current && !measurementUnit && analysis.resultUnitHint && lookupsQuery.data) {
      const aliases = unitAliases[analysis.resultUnitHint.toUpperCase()] ?? [
        analysis.resultUnitHint,
      ];
      const match = lookupsQuery.data.measurementUnits.find((unit) =>
        aliases.some(
          (alias) =>
            unit.symbol.toLowerCase() === alias.toLowerCase() ||
            unit.code === alias,
        ),
      );
      if (match) setMeasurementUnit(match.symbol);
    }
    if (analysis.cadenceHint && (!inputFrequencyCode || inputFrequencyCode === "MONTHLY"))
      setInputFrequencyCode(analysis.cadenceHint);
    if (
      goalMode === "SINGLE" &&
      !goal &&
      analysis.targetHint &&
      analysis.targetHint.kind !== "RANGE_TARGET"
    ) {
      setGoal(String(analysis.targetHint.value));
    }
  }, [
    analysis,
    selected,
    editMode,
    lookupsQuery.data,
    measurementUnit,
    goal,
    goalMode,
    inputFrequencyCode,
  ]);

  useEffect(() => {
    setTargetKind(goalPresentationForPeriodScope(periodScope).targetKind);
  }, [periodScope]);

  useEffect(() => {
    const closeSuggestions = () => {
      setSuggestionsOpen(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!definitionSearchRef.current?.contains(event.target as Node)) {
        closeSuggestions();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSuggestions();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const suggestions = definitionsSearchQuery.data ?? [];
  const proposedPoolThresholds = [
    {
      code: "RED" as const,
      rangeMinPercent: ranges.redFrom,
      rangeMaxPercent: ranges.redTo,
      includesMin: true,
      includesMax: true,
    },
    {
      code: "YELLOW" as const,
      rangeMinPercent: ranges.yellowFrom,
      rangeMaxPercent: ranges.yellowTo,
      includesMin: true,
      includesMax: true,
    },
    {
      code: "GREEN" as const,
      rangeMinPercent: ranges.greenFrom,
      rangeMaxPercent: ranges.greenTo,
      includesMin: true,
      includesMax: true,
    },
  ];
  const currentPoolThresholds = (
    poolEffectiveQuery.data?.effective.thresholds ?? []
  ).map((item: any) => ({
    code: item.code,
    rangeMinPercent: Number(item.rangeMinPercent),
    rangeMaxPercent: Number(item.rangeMaxPercent) - (item.includesMax ? 0 : 1),
    includesMin: item.includesMin,
    includesMax: true,
  }));
  const poolGoalChanged =
    editMode === "POOL_PERIOD_EDIT" &&
    Number(goal) !== Number(poolEffectiveQuery.data?.effective.goal);
  const poolTrafficChanged =
    editMode === "POOL_PERIOD_EDIT" &&
    JSON.stringify(proposedPoolThresholds) !==
      JSON.stringify(currentPoolThresholds);
  const poolScopeChanged =
    editMode === "POOL_PERIOD_EDIT" && applyToFuturePeriods !== true;
  const poolGoalOverrideSupported =
    editMode !== "POOL_PERIOD_EDIT" ||
    ((poolEffectiveQuery.data?.global.goalMode ?? "SINGLE") === "SINGLE" || poolEffectiveQuery.data?.global.entityEvaluationMode === "CONTRIBUTE_TO_OVERALL");
  const poolHasChanges =
    (poolGoalOverrideSupported && poolGoalChanged) ||
    poolTrafficChanged ||
    poolScopeChanged;
  const poolSettingsFrozen =
    editMode === "POOL_PERIOD_EDIT" &&
    poolEffectiveQuery.data?.editability?.frozen === true;
  const poolOverrideFields =
    editMode === "POOL_PERIOD_EDIT"
      ? [
          ...(poolEffectiveQuery.data?.sources.GOAL === "POOL_OVERRIDE"
            ? ["GOAL" as const]
            : []),
          ...(poolEffectiveQuery.data?.sources.TRAFFIC_LIGHT_THRESHOLDS ===
          "POOL_OVERRIDE"
            ? ["TRAFFIC_LIGHT_THRESHOLDS" as const]
            : []),
        ]
      : [];
  const analyzerEvaluation =
    analysis?.behavior?.value === "GREATER_IS_BETTER"
      ? "HIGHER_IS_BETTER"
      : (analysis?.behavior?.value ?? null);
  const confirmedEvaluation =
    goalMode === "RANGE"
      ? "RANGE"
      : (analyzerEvaluation ??
        (targetKind === "UPPER_LIMIT" ||
        (targetKind === "CHANGE_TARGET" &&
          analysis?.comparison?.direction === "REDUCTION")
          ? "LOWER_IS_BETTER"
          : "HIGHER_IS_BETTER"));
  const selectedFrequencyName =
    lookupsQuery.data?.inputFrequencies.find(
      (item) => item.code === inputFrequencyCode,
    )?.name ?? inputFrequencyCode;
  const measurementUnitOptions = normalizeMeasurementUnitOptions(
    lookupsQuery.data?.measurementUnits ?? [],
  );
  const selectedMeasurementUnitName =
    measurementUnitOptions.find((item) => item.symbol === measurementUnit)
      ?.name ?? measurementUnit;
  const goalPresentation = goalPresentationForPeriodScope(periodScope);
  const suggestionParts = [
    analysis?.family.value && analysis.family.value !== "UNKNOWN"
      ? analysis.family.value.replace(/_/g, " ")
      : null,
    analysis?.cadenceHint ? selectedFrequencyName : null,
    analysis?.resultUnitHint && measurementUnit ? measurementUnit : null,
  ].filter(Boolean);
  const subjectEntities =
    subjectType === "COMPANY"
      ? (subjectLookupsQuery.data?.companies ?? [])
      : subjectType === "DEPARTMENT"
        ? (subjectLookupsQuery.data?.areas ?? [])
        : subjectType
          ? (lookupsQuery.data?.subjectCatalogs.filter(
              (item) => item.subjectType === subjectType,
            ) ?? [])
          : [];
  const subjectEntityLabel =
    subjectType === "COMPANY"
      ? "Companies"
      : subjectType === "DEPARTMENT"
        ? "Departments"
        : "Entities";
  const goalHasValue =
    goal !== "" ||
    rangeMinGoal !== "" ||
    rangeMaxGoal !== "" ||
    defaultGoal !== "" ||
    subjectGoals.length > 0;
  const hasSimpleGoalValue = goal.trim() !== "";
  const hasRangeGoalValue =
    rangeMinGoal.trim() !== "" || rangeMaxGoal.trim() !== "";
  const hasSubjectGoalValue =
    defaultGoal.trim() !== "" || subjectGoals.length > 0;
  const previousSubjectIds = new Set(
    (
      editConfigQuery.data?.subjects ??
      editConfigQuery.data?.subjectGoals ??
      []
    ).map((item) => item.subjectExternalId),
  );
  const currentSubjectIds = new Set(
    (contributing ? contributorSubjects : subjectGoals).map((item) => item.subjectExternalId),
  );
  const subjectCompositionChanged =
    goalMode === "BY_SUBJECT" &&
    (previousSubjectIds.size !== currentSubjectIds.size ||
      [...previousSubjectIds].some((id) => !currentSubjectIds.has(id)));
  const structuralChanges =
    editMode !== "GLOBAL_EDIT" || !editConfigQuery.data
      ? []
      : [
          editConfigQuery.data.goalMode !== goalMode ? "Goal Mode" : null,
          (editConfigQuery.data.entityEvaluationMode ?? "INDIVIDUAL") !== entityEvaluationMode ? "Entity participation" : null,
          (editConfigQuery.data.subjectType ?? "") !== subjectType
            ? "Subject Type"
            : null,
          subjectCompositionChanged ? "Subject composition" : null,
          editConfigQuery.data.measurementUnit !== measurementUnit
            ? "Measurement Unit"
            : null,
          editConfigQuery.data.inputFrequencyCode !== inputFrequencyCode
            ? "Frequency"
            : null,
          editConfigQuery.data.periodScope !== periodScope
            ? "Period Scope"
            : null,
          editConfigQuery.data.resultMethod !== resultMethod
            ? "Result Method"
            : null,
          (editConfigQuery.data.calculationTemplate ?? null) !==
          calculationTemplate
            ? "Calculation Template"
            : null,
        ].filter((item): item is string => Boolean(item));
  const modifiesExpectedResults =
    subjectCompositionChanged ||
    (evaluationScope === "BY_SUBJECT" && (editConfigQuery.data?.entityEvaluationMode ?? "INDIVIDUAL") !== entityEvaluationMode) ||
    (editConfigQuery.data?.goalMode !== goalMode &&
      (editConfigQuery.data?.goalMode === "BY_SUBJECT" ||
        goalMode === "BY_SUBJECT"));

  useEffect(() => {
    if (evaluationScope === "BY_SUBJECT" || !goalHasValue || measurementUnit) {
      setMeasurementUnitToastVisible(false);
      if (measurementUnitToastTimerRef.current !== null) {
        window.clearTimeout(measurementUnitToastTimerRef.current);
        measurementUnitToastTimerRef.current = null;
      }
      return;
    }

    setMeasurementUnitToastVisible(true);
    window.requestAnimationFrame(() => {
      measurementUnitRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      window.setTimeout(
        () => measurementUnitRef.current?.focus({ preventScroll: true }),
        250,
      );
    });
    if (measurementUnitToastTimerRef.current !== null) {
      window.clearTimeout(measurementUnitToastTimerRef.current);
    }
    measurementUnitToastTimerRef.current = window.setTimeout(() => {
      setMeasurementUnitToastVisible(false);
      measurementUnitToastTimerRef.current = null;
    }, 4000);

    return () => {
      if (measurementUnitToastTimerRef.current !== null) {
        window.clearTimeout(measurementUnitToastTimerRef.current);
        measurementUnitToastTimerRef.current = null;
      }
    };
  }, [goalHasValue, measurementUnit, evaluationScope]);

  const baseConfigPayload = () => ({
    definitionId: selected!.id,
    configurationName: customConfigurationName ? configurationName.trim() : "",
    goal: Number(goal || 0),
    measurementUnit: individual ? (periodScope === "CURRENT_PERIOD" ? subjectGoals[0]?.goalUnit : subjectGoals[0]?.resultUnit) ?? "" : measurementUnit,
    dataSource,
    ranges,
    isActive,
    inputFrequencyCode,
    periodScope,
    goalMode,
    evaluationScope,
    ...(evaluationScope === "BY_SUBJECT" ? { entityEvaluationMode } : {}),
    goalType,
    goalAssignment: individual ? "DIFFERENT_GOAL_PER_SUBJECT" as const : null,
    goalUnit: !individual ? goalUnit || measurementUnit : undefined,
    resultMethod,
    measurementInputs: resultMethod === "DIRECT" ? [] : measurementInputs,
    calculationTemplate: resultMethod === "DIRECT" ? null : calculationTemplate,
    targetKind,
    rangeMinGoal: goalMode === "RANGE" ? Number(rangeMinGoal) : null,
    rangeMaxGoal: goalMode === "RANGE" ? Number(rangeMaxGoal) : null,
    subjectType: evaluationScope === "BY_SUBJECT" ? subjectType || null : null,
    subjectGoals:
      individual
        ? subjectGoals.map((item) => ({
            ...item,
            goal: Number(subjectGoalDrafts[item.subjectExternalId] ?? item.goal),
            resultUnit: periodScope === "CURRENT_PERIOD" ? item.goalUnit : item.resultUnit,
          }))
        : [],
    subjects:
      evaluationScope === "BY_SUBJECT"
        ? (contributing ? contributorSubjects : subjectGoals).map(({ subjectExternalId, subjectCode, subjectLabel }) => ({ subjectExternalId, subjectCode, subjectLabel }))
        : [],
    groupGoal: null,
    resultSemantics: analysis?.resultSemantics?.value ?? null,
    evaluationTypeCode: confirmedEvaluation,
    comparisonDirection: analysis?.comparison?.direction ?? null,
    calculationPattern: resultMethod === "DIRECT" ? "DIRECT" : "DERIVED",
    ...(editMode === "GLOBAL_EDIT" && selectedGlobalEffectiveDate
      ? { effectiveFrom: selectedGlobalEffectiveDate }
      : {}),
  });

  const useDirectPercentage = () => {
    setResultMethod("DIRECT");
    setCalculationTemplate(null);
    setMeasurementInputs([]);
    setMeasurementUnit("%");
    setGoalUnit("%");
    setSubjectGoals(subjectGoals.map(row => ({ ...row, resultUnit: "%", goalUnit: "%" })));
  };
  const monitoringProfile = useMonitoringProfile(selected ? {...baseConfigPayload(), goal: isValidGoalNumber(goal) ? Number(goal) : NaN} : null, editConfigQuery.data, {
    ranges,
    showErrors: showGoalErrors,
    evaluationScope,
    onZeroTarget: () => {
      setPeriodScope("CURRENT_PERIOD");
      setGoal("0");
      setGoalUnit(measurementUnit);
      setSubjectGoals(subjectGoals.map(row => ({ ...row, goal: 0, goalUnit: row.resultUnit || row.goalUnit })));
      setSubjectGoalDrafts(Object.fromEntries(subjectGoals.map(row => [row.subjectExternalId, "0"])));
    },
    onSemanticsChange: value => {
      setResultMethod("DIRECT");
      setCalculationTemplate(null);
      setMeasurementInputs([]);
      if (value === "RATIO") useDirectPercentage();
    },
    editor: <p>Captura el porcentaje final en Monitoring: por ejemplo, 25 para 25%.
      {resultMethod === "CALCULATED_FROM_INPUTS" && <><br/><button type="button" onClick={useDirectPercentage}>Usar porcentaje directo</button><br/>Revisa la meta al cambiar de una razón a porcentaje.</>}
    </p>,
  });
  const configPayload = () => ({ ...baseConfigPayload(), ...monitoringProfile.fields });
  const saveMutation = useMutation({
    mutationFn: () => {
      if (editMode !== "POOL_PERIOD_EDIT" && !monitoringProfile.ready) throw new Error(monitoringProfile.reasons.join(" · "));
      if (editMode === "POOL_PERIOD_EDIT") {
        return kpiPoolService
          .saveConfigurationOverride(
            requestedPoolId,
            requestedInputPeriodId,
            String(requestedConfigId),
            {
              ...(poolGoalOverrideSupported &&
              (poolGoalChanged || (poolScopeChanged && !poolTrafficChanged))
                ? { goal: Number(goal) }
                : {}),
              ...(poolTrafficChanged
                ? { trafficLightThresholds: proposedPoolThresholds }
                : {}),
              applyToFuturePeriods,
              reason: changeReason,
              expectedContextVersion: poolEffectiveQuery.data!.contextVersion,
            },
          )
          .then(() => editConfigQuery.data!);
      }
      return isEditing
        ? kpiConfigService.update(
            requestedConfigId,
            { ...configPayload(), changeReason: globalChangeReason },
            { code: selected!.code, name: selected!.name },
          )
        : kpiConfigService.create(configPayload(), {
            code: selected!.code,
            name: selected!.name,
          });
    },
    onSuccess: (savedConfiguration) => {
      if (editMode === "POOL_PERIOD_EDIT") {
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["kpi-pool-composition", requestedPoolId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["pool-manage-kpis", requestedPoolId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["kpi-pool", requestedPoolId],
          }),
        ]);
        navigate(
          `/app/pool-kpis/detail/${requestedPoolId}?period=${encodeURIComponent(searchParams.get("period") ?? "")}`,
        );
        return;
      }
      window.localStorage.removeItem("exa:kpi-config-selected-draft");
      window.localStorage.removeItem("exa:kpi-config-search-draft");
      queryClient.setQueryData<KpiConfigRecord[]>(
        ["kpi-configurations"],
        (current) =>
          current
            ? [
                savedConfiguration,
                ...current.filter(
                  (configuration) => configuration.id !== savedConfiguration.id,
                ),
              ]
            : [savedConfiguration],
      );
      const createdQuery = new URLSearchParams({
        created: String(savedConfiguration.id),
        createdCode: savedConfiguration.code,
      });
      navigate(`/app/kpi-management/config/overview?${createdQuery}`);
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["kpi-configurations"],
          refetchType: "active",
        }),
        queryClient.invalidateQueries({
          queryKey: kpiDefinitionKeys.configurations(selected!.id),
          refetchType: "active",
        }),
      ]);
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof ApiError &&
          mutationError.code === "POOL_PERIOD_NOT_EDITABLE"
          ? "This period was finalized while you were editing. The settings are now read-only."
          : mutationError instanceof ApiError &&
              mutationError.code === "POOL_OVERRIDE_STALE"
            ? "These settings changed while you were editing. Reload the page before trying again."
            : mutationError instanceof ApiError
              ? configurationErrorMessage(mutationError)
              : mutationError instanceof Error
                ? mutationError.message
                : "KPI Configuration could not be saved.",
      );
    },
  });
  const resetMutation = useMutation({
    mutationFn: () =>
      kpiPoolService.resetConfigurationOverride(
        requestedPoolId,
        requestedInputPeriodId,
        String(requestedConfigId),
        {
          fields: poolOverrideFields,
          applyToFuturePeriods,
          reason: changeReason,
          expectedContextVersion: poolEffectiveQuery.data!.contextVersion,
        },
      ),
    onSuccess: async () => {
      setChangeReason("");
      await poolEffectiveQuery.refetch();
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["kpi-pool-composition", requestedPoolId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["pool-manage-kpis", requestedPoolId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["kpi-pool", requestedPoolId],
        }),
      ]);
    },
    onError: (mutationError) =>
      setError(
        mutationError instanceof ApiError &&
          mutationError.code === "POOL_PERIOD_NOT_EDITABLE"
          ? "This period was finalized while you were editing. The settings are now read-only."
          : mutationError instanceof ApiError &&
              mutationError.code === "POOL_OVERRIDE_STALE"
            ? "These settings changed while you were editing. Reload the page before trying again."
            : mutationError instanceof Error
              ? mutationError.message
              : "Pool Overrides could not be reset.",
      ),
  });

  const selectDefinition = (definition: LegacyKpiDefinitionOption) => {
    setSelected(definition);
    setLastSelectedDefinitionId(definition.id);
    window.localStorage.setItem(
      "exa:last-kpi-definition",
      String(definition.id),
    );
    const selectedLabel = `${definition.code} — ${definition.name}`;
    setSearchTerm(selectedLabel);
    if (!definitionLocked) {
      window.localStorage.setItem(
        "exa:kpi-config-selected-draft",
        String(definition.id),
      );
      window.localStorage.setItem("exa:kpi-config-search-draft", selectedLabel);
    }
    setSuggestionsOpen(false);
    setError("");
  };

  const showLockedFieldNotice = (
    field: "definition" | "unit" | "source" | "status",
  ) => {
    if (lockedFieldTimerRef.current !== null)
      window.clearTimeout(lockedFieldTimerRef.current);
    const notices = {
      definition: {
        title: "KPI Definition is read-only",
        detail:
          "A Pool override cannot change the KPI Definition linked to this Configuration.",
      },
      unit: {
        title: "Measurement Unit is read-only",
        detail:
          "Changing the measurement meaning belongs to the Global KPI Configuration.",
      },
      source: {
        title: "Data Source is read-only",
        detail:
          "Pool Period overrides currently support only Goal and Traffic Light settings.",
      },
      status: {
        title: "Configuration Status is read-only",
        detail:
          "Status is controlled by KPI Management and cannot be changed from a Pool Period override.",
      },
    };
    setLockedFieldNotice(notices[field]);
    lockedFieldTimerRef.current = window.setTimeout(() => {
      setLockedFieldNotice(null);
      lockedFieldTimerRef.current = null;
    }, 4000);
  };

  const clearConfigurationFields = () => {
    measurementUnitChosenRef.current = false;
    setGoal("");
    setConfigurationName("");
    setGoalUnit("");
    setMeasurementUnit("");
    setInputFrequencyCode("");
    setDataSource("");
    setRangeMinGoal("");
    setRangeMaxGoal("");
    clearSubjectGoalSetup();
    setContributorSubjects([]);
    setMeasurementInputs([]);
    setCalculationTemplate(null);
    setChangeReason("");
    setRanges(defaultRanges);
    setShowGoalErrors(false);
    setMeasurementUnitToastVisible(false);
    setResultUnitErrorVisible(false);
    setResultUnitToastVisible(false);
    setValidationToast("");
    setError("");
  };

  const clearDefinition = () => {
    if (definitionLocked) {
      showLockedFieldNotice("definition");
      return;
    }
    setSelected(null);
    clearConfigurationFields();
    setLastSelectedDefinitionId(null);
    window.localStorage.removeItem("exa:last-kpi-definition");
    window.localStorage.removeItem("exa:kpi-config-selected-draft");
    window.localStorage.removeItem("exa:kpi-config-search-draft");
    setSearchTerm("");
    setSuggestionsOpen(false);
    setError("");
  };

  const showValidationToast = (message: string) => {
    setMeasurementUnitToastVisible(false);
    setValidationToast(message);
    if (validationToastTimerRef.current !== null)
      window.clearTimeout(validationToastTimerRef.current);
    validationToastTimerRef.current = window.setTimeout(() => {
      setValidationToast("");
      validationToastTimerRef.current = null;
    }, 5000);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setShowGoalErrors(true);
    if (customConfigurationName && editMode !== "POOL_PERIOD_EDIT") {
      const name = configurationName.trim();
      const letters = name.replace(/[^\p{L}]/gu, "").toLocaleLowerCase();
      const defaultName = selected?.name?.trim();
      if (name && name !== defaultName && (name.length < 3 || letters.length < 2 || /^(.)\1{3,}$/u.test(letters) || /^(test|prueba|asdf|qwerty|xxx|sin nombre|n\/a)$/i.test(name))) {
        showValidationToast("Escribe un nombre descriptivo del KPI, por ejemplo el indicador y la persona o área. Evita nombres de prueba, solo números o caracteres repetidos.");
        document.getElementById("kpi-configuration-name")?.focus();
        return;
      }
    }
    const missingField = (event.currentTarget as HTMLFormElement).querySelector<HTMLElement>('[data-config-invalid="true"]');
    if (missingField && editMode !== "POOL_PERIOD_EDIT") {
      missingField.scrollIntoView({behavior: "smooth", block: "center"});
      missingField.focus({preventScroll: true});
      showValidationToast("Completa o corrige los campos marcados en rojo antes de guardar.");
      return;
    }
    const pendingGoal = (event.currentTarget as HTMLFormElement).querySelector<HTMLElement>('[data-goal-invalid="true"]');
    if (pendingGoal) {
      pendingGoal.scrollIntoView({behavior: "smooth", block: "center"});
      pendingGoal.focus({preventScroll: true});
      showValidationToast("Completa la meta y su unidad de medida en el campo marcado en rojo.");
      return;
    }
    setError("");
    setResultUnitErrorVisible(false);
    if (!selected) {
      showValidationToast("Select a KPI Definition before saving.");
      return;
    }
    if (editMode !== "POOL_PERIOD_EDIT" && !monitoringProfile.ready) {
      const message = monitoringProfile.reasons.join(" · ");
      setError(message);
      showValidationToast(message);
      (event.currentTarget as HTMLFormElement)
        .querySelector<HTMLElement>('[aria-label="Evaluation"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!inputFrequencyCode || (!individual && !measurementUnit) || !dataSource) {
      const missingFields = [
        !inputFrequencyCode && "Measurement Frequency",
        !individual && !measurementUnit && "Official Result Unit",
        !dataSource && "Data Source",
      ].filter(Boolean);
      showValidationToast(
        `Complete ${missingFields.join(", ")} before saving.`,
      );
      return;
    }
    if (!individual && goalType === "SINGLE_VALUE" && !isValidGoalNumber(goal)) {
      showValidationToast("Enter a valid numeric Goal before saving.");
      return;
    }
    if (
      goalType === "RANGE" &&
      (!isValidGoalNumber(rangeMinGoal) ||
        !isValidGoalNumber(rangeMaxGoal) ||
        Number(rangeMinGoal) > Number(rangeMaxGoal))
    ) {
      showValidationToast(
        "Range requires valid Min and Max Goals, with Min no greater than Max.",
      );
      return;
    }
    if (goalType === "RANGE" && periodScope !== "CURRENT_PERIOD") {
      showValidationToast(
        "Range is available with Current Period only. Choose another Goal option or change Evaluation Reference.",
      );
      return;
    }
    if (contributing && !contributorSubjects.length) { showValidationToast("Select at least one contributor."); return; }
    
    if (evaluationScope === "BY_SUBJECT" && !subjectType) {
      showValidationToast("Select a Subject Type before saving.");
      return;
    }
    if (
      individual &&
      (!subjectGoals.length ||
        (goalAssignment === "DIFFERENT_GOAL_PER_SUBJECT" &&
          subjectGoals.some(
            (item) =>
              !isValidGoalNumber(
                subjectGoalDrafts[item.subjectExternalId] ?? String(item.goal),
              ),
          )))
    ) {
      showValidationToast(
        "Select at least one entity and enter a valid Goal for every entity.",
      );
      return;
    }
    if (!individual && !(goalUnit || measurementUnit) && periodScope === "CURRENT_PERIOD") {
      showValidationToast("Select a Goal / Target Unit before saving.");
      return;
    }
    if (individual && subjectGoals.some(row => !row.goalUnit || (periodScope !== "CURRENT_PERIOD" && (row.goalUnit !== "%" || !row.resultUnit || row.resultUnit === "%")))) {
      showValidationToast("Select a Goal Unit for every entity and an actual Result Unit for historical targets.");
      return;
    }
    const historicalPercentageTarget = requiresQuantitativeResultUnit(
      periodScope,
      targetKind,
      goalUnit || measurementUnit,
    );
    if (
      !individual && historicalPercentageTarget &&
      (!measurementUnit || measurementUnit === "%")
    ) {
      setResultUnitErrorVisible(true);
      setResultUnitToastVisible(true);
      return;
    }
    if (
      resultMethod === "CALCULATED_FROM_INPUTS" &&
      (measurementInputs.length < 2 ||
        measurementInputs.some((item) => !item.name.trim() || !item.unit))
    ) {
      showValidationToast(
        "Calculated Result requires at least two complete Measurement Inputs.",
      );
      return;
    }
    if (resultMethod === "CALCULATED_FROM_INPUTS" && !calculationTemplate) {
      showValidationToast("Select a Calculation Template.");
      return;
    }
    if (
      resultMethod === "CALCULATED_FROM_INPUTS" &&
      (calculationTemplate === "DIVIDE" ||
        calculationTemplate === "DIFFERENCE") &&
      measurementInputs.length !== 2
    ) {
      showValidationToast(
        `${calculationTemplate} requires exactly two Inputs.`,
      );
      return;
    }
    if (periodScope === "CURRENT_PERIOD" && targetKind === "CHANGE_TARGET") {
      showValidationToast(
        "A percentage change requires a historical Evaluation Reference or a direct current-period Goal.",
      );
      return;
    }
    if (editMode === "POOL_PERIOD_EDIT" && poolSettingsFrozen) {
      showValidationToast(
        "This KPI setting is frozen because its Scorecard composition was finalized.",
      );
      return;
    }
    if (editMode === "POOL_PERIOD_EDIT" && !poolHasChanges) {
      showValidationToast(
        "Change Goal, Traffic Light or Period Scope before saving a Pool Override.",
      );
      return;
    }
    const ordered =
      ranges.redFrom === 0 &&
      ranges.redFrom <= ranges.redTo &&
      ranges.yellowFrom === ranges.redTo + 1 &&
      ranges.yellowFrom <= ranges.yellowTo &&
      ranges.greenFrom === ranges.yellowTo + 1 &&
      ranges.greenFrom <= ranges.greenTo &&
      ranges.greenTo === 100;
    if (!ordered) {
      showValidationToast(
        "Traffic Light ranges must be continuous from Red 0 through Green 100, without gaps or overlaps.",
      );
      return;
    }
    setError("");
    if (editMode !== "POOL_PERIOD_EDIT" && !monitoringProfile.ready) {
      showValidationToast("Completa y confirma las reglas de evaluacion para Monitoring antes de guardar.");
      return;
    }
    if (editMode === "CREATE") saveMutation.mutate();
    else if (editMode === "GLOBAL_EDIT") {
      if (unassignedConfiguration) { saveMutation.mutate(); return; }
      setImpactSaveRequested(true);
      setImpactModalOpen(true);
    } else setConfirmationOpen(true);
  };

  if (isEditing && editConfigQuery.isLoading) {
    return (
      <main className="kpi-config-page set-kpi-config-page">
        <div className="config-edit-loading" role="status">
          Loading KPI Configuration…
        </div>
      </main>
    );
  }

  if (
    editMode === "POOL_PERIOD_EDIT" &&
    (!isEditing || !(requestedPoolId > 0) || !requestedInputPeriodId)
  ) {
    return (
      <main className="kpi-config-page set-kpi-config-page">
        <section className="config-card config-edit-loading">
          <strong>Pool context is required</strong>
          <p>
            Open this action from KPI Pool Detail after selecting a real Input
            Period and KPI Configuration.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate("/app/pool-kpis/overview")}
          >
            Go to KPI Pools
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="kpi-config-page set-kpi-config-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/kpi-management">KPI Management</Link>
        <span>/</span>
        <Link to="/app/kpi-management/config/overview">KPI Config</Link>
        <span>/</span>
        <Link to="/app/kpi-management/config/set" aria-current="page">
          Set KPI Config
        </Link>
      </nav>

      <header className="config-page-header">
        <div>
          <h1>
            {editMode === "POOL_PERIOD_EDIT"
              ? "Edit Pool KPI Settings"
              : isEditing
                ? "Edit Global KPI Configuration"
                : "Set KPI Config"}
          </h1>
          <p>
            {editMode === "POOL_PERIOD_EDIT"
              ? "Create compatible overrides for this Pool and Input Period."
              : isEditing
                ? "Create a new effective revision of the global KPI Configuration."
                : "Select an existing KPI Definition and define how it will be measured."}
          </p>
        </div>
        {editMode !== "POOL_PERIOD_EDIT" && (
          <button
            type="button"
            className="button secondary config-catalog-button"
            onClick={() => navigate("/app/kpi-management/config/catalogs")}
          >
            <Database size={16} />
            Manage Catalogs
          </button>
        )}
      </header>

      {isEditing && (
        <div className="config-revision-notice" role="note">
          <ShieldAlert size={18} />
          <div>
            <strong>
              {editMode === "POOL_PERIOD_EDIT"
                ? "Pool period override"
                : "Period-safe global revision"}
            </strong>
            <span>
              FINALIZED Scorecard compositions and Monitoring snapshots remain
              unchanged.
            </span>
          </div>
        </div>
      )}
      {poolSettingsFrozen && (
        <div className="config-revision-notice" role="alert">
          <ShieldAlert size={18} />
          <div>
            <strong>This period is read-only.</strong>
            <span>
              Status: {poolEffectiveQuery.data?.period.status ?? "FUTURE"}.
              FINALIZED and CLOSED values remain frozen.
            </span>
          </div>
        </div>
      )}
      {editMode === "POOL_PERIOD_EDIT" && poolEffectiveQuery.data && (
        <section className="config-card effective-goal-card">
          <header>
            <div className="pool-title-with-period">
              <strong>
                {poolEffectiveQuery.data.pool.code} ·{" "}
                {poolEffectiveQuery.data.pool.name}
              </strong>
              <span
                className={`pool-period-badge status-${poolEffectiveQuery.data.period.status.toLowerCase()}`}
              >
                {requestedPeriodLabel} · {poolEffectiveQuery.data.period.status}
              </span>
            </div>
          </header>
          <div className="effective-goal-summary">
            <div>
              <span>Global Goal</span>
              <strong>
                {poolEffectiveQuery.data.global.goal ?? "—"} {measurementUnit}
              </strong>
            </div>
            <div>
              <span>Pool Override</span>
              <strong>
                {poolEffectiveQuery.data.sources.GOAL === "POOL_OVERRIDE"
                  ? `${poolEffectiveQuery.data.effective.goal} ${measurementUnit}`
                  : "—"}
              </strong>
            </div>
            <span className="effective-goal-arrow" aria-hidden="true">
              →
            </span>
            <div className="effective-goal-result">
              <span>Effective Goal</span>
              <strong>
                {poolEffectiveQuery.data.effective.goal ?? "—"}{" "}
                {measurementUnit}
              </strong>
              <small>
                {poolEffectiveQuery.data.sources.GOAL === "POOL_OVERRIDE"
                  ? "Pool Override"
                  : "Global Configuration"}
              </small>
            </div>
          </div>
        </section>
      )}

      <form noValidate className={`config-form ${showGoalErrors ? "show-goal-errors" : ""}`} onSubmit={submit}>
        <section className="config-card definition-step-card">
          <div className="config-section-heading">
            <span className="step-number">1</span>
            <div>
              <h2>
                {editMode === "POOL_PERIOD_EDIT"
                  ? "KPI Definition"
                  : "Select KPI Definition"}
              </h2>
              <p>
                {editMode === "POOL_PERIOD_EDIT"
                  ? "This Pool override remains linked to the original KPI Configuration."
                  : "Only active definitions can be configured."}
              </p>
            </div>
          </div>
          <div className="definition-search-row">
            <div className="definition-autocomplete" ref={definitionSearchRef}>
              {editMode === "POOL_PERIOD_EDIT" ? (
                <ShieldAlert size={17} />
              ) : (
                <Search size={17} />
              )}
              <input
                data-config-invalid={!selected}
                aria-invalid={showGoalErrors && !selected}
                value={searchTerm}
                readOnly={definitionLocked}
                aria-readonly={definitionLocked}
                aria-label={
                  editMode === "POOL_PERIOD_EDIT"
                    ? "KPI Definition (read-only)"
                    : "KPI Definition"
                }
                onFocus={() => {
                  if (!definitionLocked) setSuggestionsOpen(true);
                }}
                onClick={() => {
                  if (definitionLocked) showLockedFieldNotice("definition");
                }}
                onKeyDown={(event) => {
                  if (
                    selected &&
                    (event.key === "Backspace" || event.key === "Delete")
                  ) {
                    if (definitionLocked) {
                      event.preventDefault();
                      showLockedFieldNotice("definition");
                    }
                  }
                }}
                onChange={(event) => {
                  if (definitionLocked) {
                    showLockedFieldNotice("definition");
                    return;
                  }
                  const value = event.target.value;
                  setSearchTerm(value);
                  window.localStorage.setItem(
                    "exa:kpi-config-search-draft",
                    value,
                  );
                  if (selected && !isCompatibleWithSelection(value, selected)) {
                    setSelected(null);
                    clearConfigurationFields();
                    window.localStorage.removeItem(
                      "exa:kpi-config-selected-draft",
                    );
                  }
                  setSuggestionsOpen(true);
                }}
                placeholder="Search by KPI code, name or objective..."
              />
              {editMode !== "POOL_PERIOD_EDIT" &&
                (!definitionLocked || selected) && (
                  <button
                    type="button"
                    className={`definition-clear-button ${definitionLocked ? "locked" : ""}`}
                    onClick={clearDefinition}
                    aria-label={
                      definitionLocked
                        ? "KPI Definition locked"
                        : "Clear KPI Definition"
                    }
                    aria-disabled={definitionLocked}
                    title={
                      definitionLocked
                        ? "This KPI Definition cannot be removed from here"
                        : "Clear selection"
                    }
                  >
                    {definitionLocked ? (
                      <ShieldAlert size={16} />
                    ) : (
                      <X size={16} />
                    )}
                  </button>
                )}
              {suggestionsOpen &&
                !definitionLocked &&
                (!selected || searchTerm !== selectedDefinitionLabel) && (
                  <div className="definition-suggestions">
                    {definitionsSearchQuery.isFetching ||
                    debouncedSearchTerm !== searchTerm ? (
                      <div className="no-suggestions">
                        <Search size={20} />
                        <strong>Searching KPI Definitions...</strong>
                      </div>
                    ) : suggestions.length ? (
                      suggestions.map((definition) => (
                        <button
                          type="button"
                          key={definition.id}
                          onClick={() => selectDefinition(definition)}
                        >
                          <span className="suggestion-code">
                            {definition.code}
                          </span>
                          <span>
                            <strong>{definition.name}</strong>
                            <small>
                              {definition.objective}
                              {definition.id === lastSelectedDefinitionId
                                ? " · Last selected"
                                : ""}
                            </small>
                          </span>
                          {selected?.id === definition.id && (
                            <Check size={15} />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="no-suggestions">
                        <Search size={20} />
                        <strong>No matching active KPI Definitions</strong>
                        <span>Try another code, name or objective.</span>
                      </div>
                    )}
                  </div>
                )}
            </div>
            {editMode !== "POOL_PERIOD_EDIT" && (
              <button
                type="button"
                className="button new-definition-button"
                onClick={() =>
                  navigate("/app/kpi-management/definition/overview")
                }
              >
                <Plus size={15} /> KPI Definition
              </button>
            )}
          </div>
        </section>

        {isEditing && !isSingleResultConfig(editConfigQuery.data) && <p role="status">Configuracion legacy: define una sola meta y revisa las bandas para la nueva revision. Los resultados historicos se conservan.</p>}
        {editMode !== "POOL_PERIOD_EDIT" && (
          <KpiSemanticSetup
            definitionName={selected?.name ?? ""} configurationName={configurationName} setConfigurationName={setConfigurationName} customName={customConfigurationName} setCustomName={setCustomConfigurationName}
            showErrors={showGoalErrors}
            goalInvalid={monitoringProfile.goalInvalid}
            goal={goal} setGoal={setGoal}
            goalUnit={goalUnit || measurementUnit}
            setGoalUnit={value => { measurementUnitChosenRef.current = true; setGoalUnit(value); setMeasurementUnit(value); }}
            inputFrequencyCode={inputFrequencyCode} setInputFrequencyCode={setInputFrequencyCode}
            dataSource={dataSource} setDataSource={setDataSource}
            units={measurementUnitOptions}
            frequencies={lookupsQuery.data?.inputFrequencies ?? []}
            dataSources={lookupsQuery.data?.dataSources ?? []}
          />
        )}

        {editMode === "POOL_PERIOD_EDIT" ? (
          <section className="config-card pool-measurement-card">
            <div className="config-section-heading">
              <span className="step-number">2</span>
              <div>
                <h2>Measurement Setup</h2>
                <p>Only the period-specific Goal can be overridden here.</p>
              </div>
            </div>
            <div className="config-fields-grid">
              <label>
                <span>Goal</span>
                <input
                  disabled={poolSettingsFrozen || !poolGoalOverrideSupported}
                  type="text"
                  inputMode="decimal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Enter a numeric goal, e.g. +5 or -2.5"
                />
                {!poolGoalOverrideSupported && (
                  <small>
                    V1 supports Goal overrides only for Single Goal. Range and
                    Goals by Subject remain global and read-only.
                  </small>
                )}
              </label>
              <label>
                <span>Measurement Unit</span>
                <input
                  readOnly
                  value={measurementUnit}
                  onClick={() => showLockedFieldNotice("unit")}
                />
              </label>
              <label>
                <span>Data Source</span>
                <input
                  readOnly
                  value={dataSource}
                  onClick={() => showLockedFieldNotice("source")}
                />
              </label>
            </div>
          </section>
        ) : null}

        {editMode === "POOL_PERIOD_EDIT" && <section className="config-card traffic-light-card">
          <TrafficLightEditor
            value={ranges}
            onChange={setRanges}
            disabled={poolSettingsFrozen}
            stepNumber={3}
          />
        </section>}
        {editMode === "GLOBAL_EDIT" && !unassignedConfiguration && (
          <section className="config-card revision-period-card">
            <div className="config-section-heading">
              <div>
                <h2>Global revision</h2>
                <p>
                  Choose when the next global standard starts. If Pools use this
                  KPI, at least one eligible period must be selected before the
                  revision can be saved.
                </p>
              </div>
              <button
                type="button"
                className="button view-affected-pools-button"
                onClick={() => {
                  setImpactSaveRequested(false);
                  setImpactModalOpen(true);
                }}
              >
                <CalendarDays size={17} /> View affected Pools
              </button>
            </div>
            {impactReviewed && (
              <p className="impact-reviewed-note">
                <Check size={16} /> Pool and Input Period impact reviewed.
              </p>
            )}
            {modifiesExpectedResults && (
              <div className="config-warning-banner" role="alert">
                <ShieldAlert size={18} />
                <span>
                  <strong>
                    This change modifies the subjects expected for future KPI
                    Results.
                  </strong>{" "}
                  Previously FINALIZED periods keep their original subjects and
                  frozen goals.
                </span>
              </div>
            )}
          </section>
        )}
        <section className="config-card configuration-status-card">
          <div className="config-section-heading">
            <span className="step-number">
              {editMode === "POOL_PERIOD_EDIT" ? 4 : 5}
            </span>
            <div>
              <h2>Configuration Status</h2>
            </div>
          </div>
          <div
            className={`configuration-status-layout ${editMode === "POOL_PERIOD_EDIT" ? "with-period-scope" : ""}`}
          >
            {editMode === "POOL_PERIOD_EDIT" && (
              <div className="pool-override-scope-card">
                <fieldset disabled={poolSettingsFrozen}>
                  <legend>Period Scope</legend>
                  <div className="pool-scope-options">
                    <label className="pool-scope-option">
                      <input
                        type="radio"
                        name="pool-override-scope"
                        checked={!applyToFuturePeriods}
                        onChange={() => setApplyToFuturePeriods(false)}
                      />
                      <span>
                        <strong>Only this Input Period</strong>
                        <small>
                          Apply the override only to the selected period.
                        </small>
                      </span>
                    </label>
                    <label className="pool-scope-option">
                      <input
                        type="radio"
                        name="pool-override-scope"
                        checked={applyToFuturePeriods}
                        onChange={() => setApplyToFuturePeriods(true)}
                      />
                      <span>
                        <strong>This and future eligible periods</strong>
                        <small>
                          Continue the setting into later editable periods until
                          another change supersedes it.
                        </small>
                      </span>
                    </label>
                  </div>
                </fieldset>
                {poolOverrideFields.length > 0 && !poolSettingsFrozen && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={resetMutation.isPending}
                    onClick={() => {
                      setChangeReason("");
                      setResetConfirmationOpen(true);
                    }}
                  >
                    Reset to Global Configuration
                  </button>
                )}
              </div>
            )}
            {editMode !== "POOL_PERIOD_EDIT" && monitoringProfile.panel}
            <div className="configuration-status-content">
              <label className="configuration-status-toggle">
                <span>Status</span>
                <button
                  type="button"
                  className={`status-toggle ${isActive ? "active" : ""}`}
                  role="switch"
                  aria-checked={isActive}
                  aria-readonly={editMode === "POOL_PERIOD_EDIT"}
                  onClick={() =>
                    editMode === "POOL_PERIOD_EDIT"
                      ? showLockedFieldNotice("status")
                      : setIsActive((current) => !current)
                  }
                >
                  <span className="toggle-track" aria-hidden="true">
                    <i />
                  </span>
                  <strong>{isActive ? "Active" : "Inactive"}</strong>
                </button>
              </label>
              <p>
                {editMode === "POOL_PERIOD_EDIT"
                  ? "Status is inherited from the Global KPI Configuration."
                  : "Controls whether this configuration may be used when its runtime capability is supported. Executability is validated separately."}
              </p>
            </div>
          </div>
        </section>
        {editMode !== "POOL_PERIOD_EDIT" && <section className="config-card traffic-light-card">
          <TrafficLightEditor value={ranges} onChange={setRanges} disabled={poolSettingsFrozen} stepNumber={6}/>
        </section>}
        {error && <div className="config-error">{error}</div>}
        <footer className="config-form-actions">
          <button
            type="button"
            className="button secondary"
            onClick={() => navigate("/app/kpi-management/config/overview")}
          >
            <ArrowLeft size={15} /> Back to Overview
          </button>
          <div>
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            {!poolSettingsFrozen && (
              <button
                type="submit"
                className="button primary"
                disabled={
                  saveMutation.isPending ||
                  (editMode === "POOL_PERIOD_EDIT" && !poolHasChanges)
                }
              >
                {saveMutation.isPending
                  ? "Saving..."
                  : editMode === "POOL_PERIOD_EDIT"
                    ? "Save Pool Changes"
                    : editMode === "GLOBAL_EDIT"
                      ? "Save Global Changes"
                      : "Save KPI Configuration"}
              </button>
            )}
          </div>
        </footer>
      </form>
      {impactModalOpen && editMode === "GLOBAL_EDIT" && (
        <div
          className="pool-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setImpactModalOpen(false);
              setImpactSaveRequested(false);
            }
          }}
        >
          <section
            className="finalize-composition-modal global-impact-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-impact-title"
          >
            <header>
              <div>
                <h2 id="global-impact-title">
                  Pools using this KPI Configuration
                </h2>
                <p>{editConfigQuery.data?.code} · Select effective periods</p>
              </div>
              <button
                type="button"
                aria-label="Close impact modal"
                onClick={() => {
                  setImpactModalOpen(false);
                  setImpactSaveRequested(false);
                }}
              >
                <X size={18} />
              </button>
            </header>
            <p>
              Select the eligible Pool periods reviewed for this Global Edit.
              The earliest selected period becomes the effective start of the
              global revision; later eligible periods inherit it automatically.
            </p>
            <section className="global-impact-review">
              {globalImpactQuery.isLoading ? (
                <p>Loading impact…</p>
              ) : globalImpactQuery.isError ? (
                <p className="config-error">
                  Impact could not be loaded. Try again before saving.
                </p>
              ) : globalImpactQuery.data?.length ? (
                <div className="global-impact-list">
                  {globalImpactQuery.data.map(({ pool, periods }) => (
                    <article key={pool.id}>
                      <div className="global-impact-pool-heading">
                        <span>
                          <strong>
                            {pool.code} · {pool.name}
                          </strong>
                          <small
                            className={`pool-status-badge ${pool.status === "INACTIVE" || pool.validTo < todayIsoDate() ? "closed" : pool.status.toLowerCase()}`}
                          >
                            {pool.status === "INACTIVE" ||
                            pool.validTo < todayIsoDate()
                              ? "Expired / Closed"
                              : formatImpactStatus(pool.status)}
                          </small>
                        </span>
                        <span>
                          <small>Pool Duration</small>
                          <strong>
                            {periods.length
                              ? `${formatImpactPeriod(periods[0]!.start)} – ${formatImpactPeriod(periods[periods.length - 1]!.start)}`
                              : "No periods"}
                          </strong>
                        </span>
                      </div>
                      <ul>
                        {periods.map((period) => {
                          const canStartRevision =
                            period.workflowStatus === "EDITABLE" ||
                            period.workflowStatus === "FUTURE";
                          return (
                            <li key={period.periodKey}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={reviewedEligiblePeriods.has(
                                    `${pool.id}:${period.periodKey}`,
                                  )}
                                  disabled={!canStartRevision}
                                  title={
                                    canStartRevision
                                      ? "Use this period when determining the global effective date"
                                      : "A global revision cannot start in a finalized or invalid past period"
                                  }
                                  onChange={() =>
                                    toggleReviewedPeriod(
                                      `${pool.id}:${period.periodKey}`,
                                    )
                                  }
                                />
                                <span>{formatImpactPeriod(period.start)}</span>
                              </label>
                              <span
                                className={`status-badge ${period.workflowStatus.toLowerCase()}`}
                              >
                                {formatImpactStatus(period.workflowStatus)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="no-pool-impact-message">
                  This Configuration is not currently assigned to a Pool. It can
                  be modified without Pool-period impact.
                </p>
              )}
              {hasAffectedPools && selectedGlobalEffectiveDate && (
                <p className="selected-effective-period">
                  <CalendarDays size={15} />
                  <span>
                    Effective from{" "}
                    <strong>
                      {formatImpactPeriod(selectedGlobalEffectiveDate)}
                    </strong>
                    . Future eligible periods inherit this revision.
                  </span>
                </p>
              )}
              {hasAffectedPools && (
                <>
                  <label className="global-change-reason">
                    <span>Change Reason *</span>
                    <textarea
                      value={changeReason}
                      onChange={(event) => setChangeReason(event.target.value)}
                      placeholder="Explain the business reason for this revision"
                    />
                    <small>
                      Stored with the selected effective period, changed fields,
                      old/new values and author.
                    </small>
                  </label>
                  <label className="impact-check">
                    <input
                      type="checkbox"
                      checked={impactReviewed}
                      onChange={(event) =>
                        setImpactReviewed(event.target.checked)
                      }
                    />
                    <span>
                      I reviewed the affected Pools and selected periods, and I
                      understand that FINALIZED/CLOSED periods remain frozen.
                    </span>
                  </label>
                </>
              )}
            </section>
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setImpactModalOpen(false);
                  setImpactSaveRequested(false);
                }}
              >
                Close
              </button>
              <button
                type="button"
                className="button primary"
                disabled={
                  globalImpactQuery.isLoading ||
                  globalImpactQuery.isError ||
                  (hasAffectedPools && changeReason.trim().length < 3) ||
                  (hasAffectedPools &&
                    (!selectedGlobalEffectiveDate || !impactReviewed))
                }
                onClick={async () => {
                  if (impactSaveRequested && hasAffectedPools) {
                    const refreshed = await globalImpactQuery.refetch();
                    const invalidSelection = refreshed.data?.some(
                      ({ pool, periods }) =>
                        periods.some(
                          (period) =>
                            reviewedEligiblePeriods.has(
                              `${pool.id}:${period.periodKey}`,
                            ) &&
                            period.workflowStatus !== "EDITABLE" &&
                            period.workflowStatus !== "FUTURE",
                        ),
                    );
                    if (refreshed.isError || invalidSelection) {
                      showValidationToast(
                        invalidSelection
                          ? "A selected period was finalized, closed or consumed by a finalized Scorecard. Review the available periods again."
                          : "Pool and Scorecard workflow could not be verified. Try again before saving.",
                      );
                      return;
                    }
                  }
                  setImpactModalOpen(false);
                  if (impactSaveRequested) setConfirmationOpen(true);
                  setImpactSaveRequested(false);
                }}
              >
                {impactSaveRequested ? "Continue to Save" : "Impact Reviewed"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {confirmationOpen && selected && (
        <div className="pool-modal-backdrop" role="presentation">
          <section
            className={`finalize-composition-modal global-impact-modal ${editMode === "POOL_PERIOD_EDIT" ? "pool-save-confirmation-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-configuration-dialog-title"
          >
            <header>
              <div>
                <h2 id="save-configuration-dialog-title">
                  {editMode === "POOL_PERIOD_EDIT"
                    ? "Save Pool configuration changes?"
                    : structuralChanges.length
                      ? "Confirm structural global change"
                      : "Save global configuration changes?"}
                </h2>
                <p>{editConfigQuery.data?.code}</p>
              </div>
              <button
                type="button"
                aria-label="Close save confirmation"
                title="Close"
                onClick={() => setConfirmationOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            {editMode === "POOL_PERIOD_EDIT" ? (
              <div className="pool-save-context">
                <div>
                  <span>Pool</span>
                  <strong>
                    {poolEffectiveQuery.data?.pool.code} ·{" "}
                    {poolEffectiveQuery.data?.pool.name}
                  </strong>
                </div>
                <div>
                  <span>Starting period</span>
                  <strong>
                    {poolEffectiveQuery.data?.period.start
                      ? formatImpactPeriod(poolEffectiveQuery.data.period.start)
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span>Scope</span>
                  <strong>
                    {applyToFuturePeriods
                      ? "This and future eligible periods"
                      : "Only this Input Period"}
                  </strong>
                </div>
                <p>FINALIZED and CLOSED periods will not be modified.</p>
              </div>
            ) : (
              <p>{`You are creating the next global revision of ${editConfigQuery.data?.code}. Existing FINALIZED compositions and historical results will not be modified.`}</p>
            )}
            {editMode === "GLOBAL_EDIT" && structuralChanges.length > 0 && (
              <div className="config-warning-banner" role="alert">
                <ShieldAlert size={18} />
                <span>
                  <strong>Structural change:</strong>{" "}
                  {structuralChanges.join(", ")}. Step 6 must validate whether
                  this remains the same KPI runtime contract or requires a new
                  KPI Configuration.
                </span>
              </div>
            )}
            <dl className="configuration-change-summary">
              <div className="goal-change-summary">
                <dt>Goal</dt>
                <dd>
                  {editMode === "POOL_PERIOD_EDIT"
                    ? `${poolEffectiveQuery.data?.effective.goal ?? "—"} ${measurementUnit} → ${goal} ${measurementUnit}`
                    : `${editConfigQuery.data?.goal ?? "—"} ${periodScope === "CURRENT_PERIOD" ? goalUnit || measurementUnit : "%"} → ${goal} ${periodScope === "CURRENT_PERIOD" ? goalUnit || measurementUnit : "%"}`}
                </dd>
              </div>
              <div className="measurement-unit-summary">
                <dt>Measurement Unit</dt>
                <dd>
                  {selectedMeasurementUnitName || "—"}
                  {selectedMeasurementUnitName &&
                  measurementUnit &&
                  selectedMeasurementUnitName !== measurementUnit
                    ? ` (${measurementUnit})`
                    : ""}
                </dd>
              </div>
            </dl>
            {false && (
              <section className="global-impact-review">
                <h3>Pools and Input Periods using this KPI Configuration</h3>
                {globalImpactQuery.isLoading ? (
                  <p>Loading impact…</p>
                ) : globalImpactQuery.isError ? (
                  <p className="config-error">
                    Impact could not be loaded. Saving is disabled.
                  </p>
                ) : globalImpactQuery.data?.length ? (
                  <div className="global-impact-list">
                    {globalImpactQuery.data?.map(({ pool, periods }) => (
                      <article key={pool.id}>
                        <strong>
                          {pool.code} · {pool.name}
                        </strong>
                        <small>{pool.status}</small>
                        <ul>
                          {periods.map((period) => (
                            <li key={period.periodKey}>
                              <span>{period.periodKey}</span>
                              <span
                                className={`status-badge ${period.workflowStatus.toLowerCase()}`}
                              >
                                {formatImpactStatus(period.workflowStatus)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p>This Configuration is not currently assigned to a Pool.</p>
                )}
                <label className="impact-check">
                  <input
                    type="checkbox"
                    checked={impactReviewed}
                    onChange={(event) =>
                      setImpactReviewed(event.target.checked)
                    }
                  />
                  <span>
                    I reviewed the affected Pools and their real Input Period
                    statuses.
                  </span>
                </label>
              </section>
            )}
            {editMode === "POOL_PERIOD_EDIT" && (
              <label className="pool-change-reason">
                <span>Change reason</span>
                <textarea
                  autoFocus
                  value={changeReason}
                  onChange={(event) => setChangeReason(event.target.value)}
                  placeholder="Target increased for the operational plan"
                />
                <small>
                  Briefly explain why this Pool uses settings different from the
                  global KPI configuration.
                </small>
              </label>
            )}
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setConfirmationOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                disabled={
                  saveMutation.isPending ||
                  (editMode === "POOL_PERIOD_EDIT" &&
                    changeReason.trim().length < 3) ||
                  (editMode === "GLOBAL_EDIT" &&
                    (globalImpactQuery.isLoading ||
                      globalImpactQuery.isError ||
                      (hasAffectedPools &&
                        (changeReason.trim().length < 3 ||
                          !selectedGlobalEffectiveDate ||
                          !impactReviewed))))
                }
                onClick={() => {
                  setConfirmationOpen(false);
                  saveMutation.mutate();
                }}
              >
                {editMode === "POOL_PERIOD_EDIT"
                  ? "Save Pool Changes"
                  : structuralChanges.length
                    ? "Confirm Structural Revision"
                    : "Save Global Changes"}
              </button>
            </footer>
          </section>
        </div>
      )}
      {resetConfirmationOpen && (
        <div className="pool-modal-backdrop" role="presentation">
          <section
            className="finalize-composition-modal"
            role="dialog"
            aria-modal="true"
          >
            <header>
              <div>
                <h2>Reset to Global Configuration?</h2>
                <p>{editConfigQuery.data?.code}</p>
              </div>
            </header>
            <p>
              The selected Pool Overrides will stop being effective for{" "}
              {applyToFuturePeriods
                ? "this and future eligible periods"
                : "this Input Period"}
              . FINALIZED Scorecards remain unchanged.
            </p>
            <label className="pool-change-reason">
              <span>Reset reason</span>
              <textarea
                autoFocus
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
                placeholder="Return to the current global KPI standard"
              />
              <small>
                This reason is stored in the override audit history.
              </small>
            </label>
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setResetConfirmationOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary"
                disabled={
                  resetMutation.isPending || changeReason.trim().length < 3
                }
                onClick={() => {
                  setResetConfirmationOpen(false);
                  resetMutation.mutate();
                }}
              >
                Reset to Global
              </button>
            </footer>
          </section>
        </div>
      )}
      {lockedFieldNotice && (
        <div className="config-lock-toast" role="status">
          <ShieldAlert size={19} />
          <div>
            <strong>{lockedFieldNotice.title}</strong>
            <span>{lockedFieldNotice.detail}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setLockedFieldNotice(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {measurementUnitToastVisible && (
        <div className="config-danger-toast" role="alert" aria-live="assertive">
          <CircleAlert size={20} aria-hidden="true" />
          <span>Select a Measurement Unit in Result Setup.</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setMeasurementUnitToastVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {resultUnitToastVisible && (
        <div className="config-danger-toast" role="alert" aria-live="assertive">
          <CircleAlert size={20} aria-hidden="true" />
          <span>
            A quantitative Result Unit is required. The percentage represents
            the target change, not the unit of the actual Result.
          </span>
          <button
            type="button"
            aria-label="Dismiss Result Unit notification"
            onClick={() => setResultUnitToastVisible(false)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {validationToast && (
        <div
          className="config-warning-toast"
          role="alert"
          aria-live="assertive"
        >
          <CircleAlert size={20} aria-hidden="true" />
          <span>{validationToast}</span>
          <button
            type="button"
            aria-label="Dismiss validation notification"
            onClick={() => setValidationToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}

function configurationErrorMessage(error: ApiError): string {
  if (error.code !== "VALIDATION_ERROR" || !error.details || typeof error.details !== "object") return error.message;
  const details = error.details as { fieldErrors?: Record<string, unknown>; formErrors?: unknown };
  const messages = Object.entries(details.fieldErrors ?? {}).flatMap(([field, errors]) =>
    Array.isArray(errors) ? errors.filter((message): message is string => typeof message === "string").map(message => `${field}: ${message}`) : [],
  );
  if (Array.isArray(details.formErrors)) messages.push(...details.formErrors.filter((message): message is string => typeof message === "string"));
  return messages.length ? `No se pudo guardar la configuración. ${messages.join(" · ")}` : error.message;
}

function normalizeAutocompleteText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[—–·._]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidGoalNumber(value: string) {
  const normalized = value.trim();
  return (
    /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized) &&
    Number.isFinite(Number(normalized))
  );
}

function autocompleteQueryTerm(value: string, selectedLabel: string) {
  if (value === selectedLabel) return "";
  const cleaned = value.trim().replace(/[.]+$/g, "").trim();
  const separator = cleaned.search(/[—–]/);
  if (separator >= 0) {
    const namePart = cleaned.slice(separator + 1).trim();
    if (namePart) return namePart;
    return cleaned.slice(0, separator).trim();
  }
  return cleaned;
}

function isCompatibleWithSelection(
  value: string,
  definition: LegacyKpiDefinitionOption,
) {
  const typed = normalizeAutocompleteText(value);
  if (!typed) return false;
  const label = normalizeAutocompleteText(
    `${definition.code} ${definition.name}`,
  );
  const code = normalizeAutocompleteText(definition.code);
  const name = normalizeAutocompleteText(definition.name);
  return (
    label.startsWith(typed) ||
    code.startsWith(typed) ||
    name.startsWith(typed) ||
    label.includes(typed)
  );
}
