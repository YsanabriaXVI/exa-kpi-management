import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { kpiDefinitionService } from "../kpi-definition/kpi-definition.service";
import type { KpiDefinition } from "../kpi-definition/kpi-definition.types";
import type { KpiConfigInput, KpiConfigRecord, TrafficLightRanges } from "./kpi-config.types";
import { kpiConfigService } from "./kpi-config.service";
import { catalogManagementService } from "./catalog-management.service";
import { ConfigMultiSelect } from "./ConfigMultiSelect";
import { TrafficLightEditor } from "./TrafficLightEditor";
import { useSingleResultProfile } from "./SingleResultProfile";
import { ApiError } from "../../api/http-client";
import "./kpi-config.css";
import "./quick-configure.css";

const defaultRanges: TrafficLightRanges = {redFrom:0,redTo:59,yellowFrom:60,yellowTo:79,greenFrom:80,greenTo:100};
const validNumber = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));
type Draft = {goal:string;name:string};

export function QuickConfigureModal({definition,onClose}:{definition:KpiDefinition;onClose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [unit,setUnit] = useState("");
  const [frequency,setFrequency] = useState("MONTHLY");
  const [source,setSource] = useState("");
  const [ranges,setRanges] = useState(defaultRanges);
  const [subjectType,setSubjectType] = useState("");
  const [selected,setSelected] = useState<string[]>([]);
  const [drafts,setDrafts] = useState<Record<string,Draft>>({});
  const [defaultGoal,setDefaultGoal] = useState("");
  const [customNames,setCustomNames] = useState(false);
  const [copyMode,setCopyMode] = useState("DEFAULTS");
  const [copyId,setCopyId] = useState("");
  const [saved,setSaved] = useState<KpiConfigRecord>(() => ({negativeResultPolicy:"DISALLOW"}) as KpiConfigRecord);
  const [showErrors,setShowErrors] = useState(false);
  const [error,setError] = useState("");
  const lookups = useQuery({queryKey:["kpi-config-lookups"],queryFn:kpiConfigService.lookups});
  const types = useQuery({queryKey:["catalog-subject-types"],queryFn:catalogManagementService.subjectTypes});
  const subjects = useQuery({queryKey:["catalog-subject-values",subjectType],queryFn:()=>catalogManagementService.subjectValues(subjectType),enabled:!!subjectType});
  const hints = useQuery({queryKey:["quick-config-definition-defaults",definition.id],queryFn:()=>kpiDefinitionService.analyze(definition.kpiName)});
  const defaultsLoaded = useRef(false);
  const existing = useQuery({queryKey:["kpi-configurations"],queryFn:kpiConfigService.list});
  const available = (subjects.data ?? []).filter(s=>s.isActive);
  const selectedSubjects = selected.map(id=>available.find(s=>s.externalId===id)).filter((s):s is typeof available[number]=>!!s);
  const common: KpiConfigInput = {definitionId:definition.id,goal:validNumber(defaultGoal)?Number(defaultGoal):selectedSubjects.length && validNumber(drafts[selectedSubjects[0].externalId]?.goal ?? "")?Number(drafts[selectedSubjects[0].externalId].goal):NaN,goalUnit:unit,measurementUnit:unit,inputFrequencyCode:frequency,dataSource:source,ranges,isActive:true,periodScope:"CURRENT_PERIOD",goalMode:"SINGLE",goalType:"SINGLE_VALUE",evaluationScope:"OVERALL",resultMethod:"DIRECT",measurementInputs:[],targetKind:"ABSOLUTE_TARGET"};
  const profile = useSingleResultProfile(common,saved,()=>{setDefaultGoal("0");setDrafts(current=>Object.fromEntries(Object.entries(current).map(([id,row])=>[id,{...row,goal:"0"}])));},showErrors);
  const generatedName = (name:string) => `${definition.kpiName} ? ${name}`;
  const rowInvalid = (id:string) => !validNumber(drafts[id]?.goal ?? "") || (profile.fields.evaluationTypeCode === "ZERO_IS_BETTER" ? Number(drafts[id]?.goal)!==0 : profile.fields.scoringMethod === "PROPORTIONAL" && Number(drafts[id]?.goal)<=0);
  const copyOptions = (existing.data ?? []).filter(c=>String(c.definitionId)===definition.id && c.id>0 && c.scoringRuleConfig?.model==="SINGLE_RESULT_V1" && c.resultMethod==="DIRECT" && c.evaluationScope==="OVERALL");
  function applyDefinitionDefaults() {
    const hint=hints.data;
    const found=lookups.data?.measurementUnits.find(u=>u.code===hint?.resultUnitHint || u.symbol===hint?.resultUnitHint);
    const behavior=hint?.behavior?.value;
    setUnit(found?.symbol ?? "");setFrequency(hint?.cadenceHint ?? "MONTHLY");
    setSource(lookups.data?.dataSources.find(s=>s.sourceType==="MANUAL")?.name ?? "");
    setRanges({...defaultRanges});
    const goal=behavior==="ZERO_IS_BETTER"?"0":hint?.targetHint && "value" in hint.targetHint?String(hint.targetHint.value):"";
    setDefaultGoal(goal);
    setSaved({negativeResultPolicy:"DISALLOW",evaluationTypeCode:behavior && ["GREATER_IS_BETTER","HIGHER_IS_BETTER","LOWER_IS_BETTER","ZERO_IS_BETTER"].includes(behavior)?behavior:""} as KpiConfigRecord);
    setDrafts(current=>Object.fromEntries(Object.entries(current).map(([id,row])=>[id,{...row,goal}])));
  }
  useEffect(()=>{if(!defaultsLoaded.current && lookups.data && !hints.isPending){defaultsLoaded.current=true;if(copyMode==="DEFAULTS")applyDefinitionDefaults();}},[lookups.data,hints.isPending]);
  function selectSubjects(ids:string[]) {
    setSelected(ids);
    setDrafts(current=>Object.fromEntries(ids.map(id=>[id,current[id] ?? {goal:defaultGoal,name:generatedName(available.find(s=>s.externalId===id)?.name ?? "")}])));
  }
  function copyFrom(id:string) {
    setCopyId(id);
    const item=copyOptions.find(c=>String(c.id)===id);
    if(!item) return;
    setSaved(item);setUnit(item.goalUnit ?? item.measurementUnit);setFrequency(item.inputFrequencyCode ?? "MONTHLY");setSource(item.dataSource);setRanges({...item.ranges});setDefaultGoal(String(item.goal));
    setDrafts(current=>Object.fromEntries(Object.entries(current).map(([key,row])=>[key,{...row,goal:String(item.goal)}])));
  }
  const create = useMutation({mutationFn:()=>kpiConfigService.quickConfigure(selectedSubjects.map(subject=>({
    ...common,...profile.fields,goal:Number(drafts[subject.externalId].goal),
    configurationName:customNames?drafts[subject.externalId].name.trim():generatedName(subject.name),
    classification:{subjectType,subjectExternalId:subject.externalId,subjectCode:subject.code,subjectLabel:subject.name},
  }))),onSuccess:items=>{
    cache.setQueryData<KpiConfigRecord[]>(["kpi-configurations"],current=>[...items,...(current ?? []).filter(c=>!items.some(item=>item.id===c.id))]);
    void cache.invalidateQueries({queryKey:["kpi-configurations"]});
    onClose();navigate(`/app/kpi-management/config/overview?created=${items.map(i=>i.id).join(",")}&definitionId=${definition.id}`);
  },onError:cause=>setError(cause instanceof ApiError ? cause.message + (cause.details ? " · " + JSON.stringify(cause.details) : "") : cause instanceof Error?cause.message:"Could not create configurations.")});
  useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
  const busy=create.isPending;
  const loading=existing.isLoading || hints.isLoading || lookups.isLoading || types.isLoading || subjects.isLoading && !!subjectType;
  const loadError=existing.error || lookups.error || types.error || subjects.error || (copyMode==="EXISTING"?existing.error:null);
  const duplicateSubjects = selectedSubjects.filter(subject => (existing.data ?? []).some(config => String(config.definitionId) === definition.id && config.isActive && config.classification?.subjectType === subjectType && config.classification?.subjectExternalId === subject.externalId));
  const invalid=duplicateSubjects.length > 0 || !profile.ready || !selected.length || selected.length>100 || selectedSubjects.length!==selected.length || selectedSubjects.some(s=>rowInvalid(s.externalId) || customNames && (!drafts[s.externalId]?.name.trim() || drafts[s.externalId].name.length>240)) || copyMode==="EXISTING" && !copyId;
  return <dialog ref={dialog} className="quick-config-dialog set-kpi-config-page" aria-labelledby="quick-config-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <header><h2 id="quick-config-title">Quick Configure — {definition.kpiName}</h2><button type="button" disabled={busy} aria-label="Close Quick Configure" onClick={onClose}>×</button></header>
    <form noValidate className={`config-form ${showErrors?"show-goal-errors":""}`} onSubmit={event=>{event.preventDefault();setShowErrors(true);setError("");if(loading||loadError||invalid){setError("Complete the fields marked in red and select up to 100 Subject Values. " + profile.reasons.join(" · "));return;}create.mutate();}}>
      <fieldset disabled={busy} className="quick-config-fields">
        <section className="config-card"><h3>Use configuration from</h3><div className="quick-copy-options"><label><input type="radio" checked={copyMode==="DEFAULTS"} onChange={()=>{setCopyMode("DEFAULTS");setCopyId("");applyDefinitionDefaults();}}/>Definition defaults</label><label><input type="radio" checked={copyMode==="EXISTING"} onChange={()=>setCopyMode("EXISTING")}/>Existing configuration</label></div>
          {copyMode==="EXISTING" && <label>Copy settings from<select value={copyId} data-config-invalid={!copyId} onChange={e=>copyFrom(e.target.value)}><option value="">Select a configuration...</option>{copyOptions.map(c=><option key={c.id} value={c.id}>{c.code} · {c.definitionName}</option>)}</select>{!existing.isLoading&&!copyOptions.length&&<small>No existing single-result configuration for this Definition.</small>}</label>}
        </section>
        <section className="config-card"><h3>Common Configuration</h3>{duplicateSubjects.length > 0 && <p role="alert">{duplicateSubjects.map(subject => subject.name).join(", ")} already has a configuration. Deselect these subjects to continue.</p>}<div className="config-fields-grid">
          <label>Goal Measurement Unit<select data-config-invalid={!unit} value={unit} onChange={e=>setUnit(e.target.value)}><option value="">Select a Measurement Unit...</option>{lookups.data?.measurementUnits.map(u=><option key={u.id} value={u.symbol}>{u.name} ({u.symbol})</option>)}</select></label>
          <label>Input Frequency<select data-config-invalid={!frequency} value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="">Select frequency...</option>{lookups.data?.inputFrequencies.map(f=><option key={f.code} value={f.code}>{f.name}</option>)}</select></label>
          <label>Data Source<select data-config-invalid={!source} value={source} onChange={e=>setSource(e.target.value)}><option value="">Select data source...</option>{lookups.data?.dataSources.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></label>
        </div>{profile.panel}<TrafficLightEditor value={ranges} onChange={setRanges}/></section>
        <section className="config-card"><h3>Create Configurations by Subject</h3><label>Subject Type<select data-config-invalid={!subjectType} value={subjectType} onChange={e=>{setSubjectType(e.target.value);setSelected([]);setDrafts({});}}><option value="">Select Subject Type...</option>{types.data?.filter(t=>t.isActive).map(t=><option key={t.code} value={t.code}>{t.name}</option>)}</select></label>
          <div data-config-invalid={!selected.length}><ConfigMultiSelect label="Subject Values" options={available.map(s=>({value:s.externalId,label:s.name,description:s.code}))} selected={selected} onChange={selectSubjects} searchable searchPlaceholder="Search and select..." emptyText="No active Subject Values."/></div>
          <p>Subjects classify independent configurations. Each configuration has one Goal and one Result per period.</p>
        </section>
        <section className="config-card"><h3>Configurations to Create</h3><div className="quick-default-goal"><label>Default Goal<input type="number" step="any" value={defaultGoal} onChange={e=>setDefaultGoal(e.target.value)} readOnly={profile.fields.evaluationTypeCode==="ZERO_IS_BETTER"}/></label><span>{unit}</span><button type="button" disabled={!validNumber(defaultGoal)} onClick={()=>setDrafts(current=>Object.fromEntries(Object.entries(current).map(([id,row])=>[id,{...row,goal:defaultGoal}])))}>Apply to all</button></div>
          <p>Naming Pattern: {definition.kpiName} + Subject Value</p><label className="quick-customize"><input type="checkbox" checked={customNames} onChange={e=>setCustomNames(e.target.checked)}/>Customize generated names</label>
          <table><thead><tr><th>Configuration</th><th>Goal</th></tr></thead><tbody>{selectedSubjects.map(s=><tr key={s.externalId}><td>{customNames?<input aria-label={`Name for ${s.name}`} maxLength={240} value={drafts[s.externalId]?.name ?? ""} data-config-invalid={!drafts[s.externalId]?.name.trim()} onChange={e=>setDrafts(current=>({...current,[s.externalId]:{...current[s.externalId],name:e.target.value}}))}/>:generatedName(s.name)}</td><td><input type="number" step="any" aria-label={`Goal for ${s.name}`} data-config-invalid={rowInvalid(s.externalId)} value={drafts[s.externalId]?.goal ?? ""} readOnly={profile.fields.evaluationTypeCode==="ZERO_IS_BETTER"} onChange={e=>setDrafts(current=>({...current,[s.externalId]:{...current[s.externalId],goal:e.target.value}}))}/> {unit}</td></tr>)}</tbody></table>
        </section>
        <section className="config-card"><h3>Summary</h3><p>Definition: {definition.kpiName}</p><p>Subject Type: {types.data?.find(t=>t.code===subjectType)?.name ?? "—"} · Configurations: {selected.length}</p><p>{frequency} · {profile.fields.evaluationTypeCode || "Select evaluation rule"} · {unit} · {source} · {profile.fields.scoringMethod==="RESULT_BANDS"?"Shared result bands":"No bands"}</p><p>Result bands and Traffic Light are copied to every configuration.</p>{selectedSubjects.filter(s=>drafts[s.externalId]?.goal!==defaultGoal).map(s=><p key={s.externalId}>{s.name}: {drafts[s.externalId]?.goal || "Missing goal"} {unit}</p>)}</section>
      </fieldset>
      {loading&&<p role="status">Loading catalogs...</p>}{loadError&&<p role="alert">{loadError.message}<button type="button" onClick={()=>{void lookups.refetch();void types.refetch();if(subjectType)void subjects.refetch();void existing.refetch();}}>Retry</button></p>}{error&&<p role="alert" className="config-field-error">{error}</p>}
      <footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={busy||loading||!!loadError}>{busy?"Creating...":`Create ${selected.length} Configurations`}</button></footer>
    </form>
  </dialog>;
}
