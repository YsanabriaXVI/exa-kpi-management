type Props = {
  definitionName?: string;
  configurationName?: string;
  setConfigurationName?: (value: string) => void;
  customName?: boolean;
  setCustomName?: (value: boolean) => void;
  showErrors?: boolean;
  goalInvalid?: boolean;
  goal: string; setGoal: (value: string) => void;
  goalUnit: string; setGoalUnit: (value: string) => void;
  inputFrequencyCode: string; setInputFrequencyCode: (value: string) => void;
  dataSource: string; setDataSource: (value: string) => void;
  units: Array<{id:string;symbol:string;label:string}>;
  frequencies: Array<{code:string;name:string}>;
  dataSources: Array<{id:string;name:string}>;
};
export function KpiSemanticSetup(props: Props) {
  return <section className="config-card semantic-step goal-configuration-card">
    <div className="config-section-heading"><span className="step-number">2</span><div><h2>Goal Configuration</h2><p>Un KPI, una meta y un resultado final por periodo.</p></div></div>
    <div className="config-fields-grid goal-name-row">
      <div className="configuration-name-field">
        <div className="configuration-name-heading">
          <label htmlFor="kpi-configuration-name"><span>KPI Configuration Name</span></label>
          <label className="custom-name-toggle"><input type="checkbox" checked={Boolean(props.customName)} onChange={e => {
            if (e.target.checked && !props.configurationName?.trim()) props.setConfigurationName?.(props.definitionName ?? "");
            props.setCustomName?.(e.target.checked);
          }}/>Use a custom name</label>
        </div>
        <input id="kpi-configuration-name" aria-label="KPI Configuration Name" maxLength={240} readOnly={!props.customName} value={props.customName ? props.configurationName ?? "" : props.definitionName ?? ""} onChange={e => props.setConfigurationName?.(e.target.value)}/>
      </div>
      <label><span>Goal *</span><input aria-label="Goal" type="number" step="any" required data-config-invalid={props.goalInvalid || !props.goal.trim() || !Number.isFinite(Number(props.goal))} aria-invalid={props.showErrors && (props.goalInvalid || !props.goal.trim() || !Number.isFinite(Number(props.goal)))} placeholder="Enter goal..." value={props.goal} onChange={e => props.setGoal(e.target.value)}/>{props.showErrors && props.goalInvalid && <small className="config-field-error">Ingresa una meta válida: cero para Zero is better; mayor que cero si no usas bandas.</small>}</label>
    </div>
    <div className="config-fields-grid goal-details-row">
      <label><span>Goal Measurement Unit *</span><select aria-label="Goal Measurement Unit" required data-config-invalid={!props.goalUnit} aria-invalid={props.showErrors && !props.goalUnit} className={!props.goalUnit ? "goal-field-placeholder" : undefined} value={props.goalUnit} onChange={e => props.setGoalUnit(e.target.value)}><option value="">Select a Measurement Unit...</option>{props.units.map(unit => <option key={unit.id} value={unit.symbol}>{unit.label}</option>)}</select></label>
      <label><span>Input Frequency</span><select required data-config-invalid={!props.inputFrequencyCode} aria-invalid={props.showErrors && !props.inputFrequencyCode} className={!props.inputFrequencyCode ? "goal-field-placeholder" : undefined} value={props.inputFrequencyCode} onChange={e => props.setInputFrequencyCode(e.target.value)}><option value="">Select a Input Frequency...</option>{props.frequencies.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}</select></label>
      <label><span>Data Source</span><select required data-config-invalid={!props.dataSource} aria-invalid={props.showErrors && !props.dataSource} className={!props.dataSource ? "goal-field-placeholder" : undefined} value={props.dataSource} onChange={e => props.setDataSource(e.target.value)}><option value="">Select a Data Source...</option>{props.dataSources.map(source => <option key={source.id} value={source.name}>{source.name}</option>)}</select></label>
    </div><p>Compliance siempre se expresa en %. {props.goalUnit === "%" ? "Ejemplo: Goal 10%, Result 8%, Compliance 80%." : "Goal y Result usan la unidad seleccionada."}</p>
  </section>;
}
