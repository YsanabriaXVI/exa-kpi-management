type Props = {
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
    <div className="config-fields-grid">
      <label><span>Goal *</span><input aria-label="Goal" type="number" step="any" required placeholder="Enter goal..." value={props.goal} onChange={e => props.setGoal(e.target.value)}/></label>
      <label><span>Goal Measurement Unit *</span><select aria-label="Goal Measurement Unit" className={!props.goalUnit ? "goal-field-placeholder" : undefined} value={props.goalUnit} onChange={e => props.setGoalUnit(e.target.value)}><option value="">Select a Measurement Unit...</option>{props.units.map(unit => <option key={unit.id} value={unit.symbol}>{unit.label}</option>)}</select></label>
      <label><span>Result Measurement Unit</span><input aria-label="Result Measurement Unit" readOnly value={props.goalUnit}/><small>Same as Goal Measurement Unit</small></label>
      <label><span>Input Frequency</span><select className={!props.inputFrequencyCode ? "goal-field-placeholder" : undefined} value={props.inputFrequencyCode} onChange={e => props.setInputFrequencyCode(e.target.value)}><option value="">Select a Input Frequency...</option>{props.frequencies.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}</select></label>
      <label><span>Data Source</span><select className={!props.dataSource ? "goal-field-placeholder" : undefined} value={props.dataSource} onChange={e => props.setDataSource(e.target.value)}><option value="">Select a Data Source...</option>{props.dataSources.map(source => <option key={source.id} value={source.name}>{source.name}</option>)}</select></label>
    </div><p>Compliance siempre se expresa en %. {props.goalUnit === "%" ? "Ejemplo: Goal 10%, Result 8%, Compliance 80%." : "Goal y Result usan la unidad seleccionada."}</p>
  </section>;
}
