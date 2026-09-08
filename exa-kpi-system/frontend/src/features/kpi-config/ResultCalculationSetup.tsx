import type { MeasurementInput } from "./kpi-config.types";

export function ResultCalculationSetup({ inputs, onInputsChange, units }: {
  inputs: MeasurementInput[]; onInputsChange: (inputs: MeasurementInput[]) => void;
  units: Array<{ id: string; symbol: string; label: string }>;
}) {
  const update = (index: number, field: "name" | "unit", value: string) => {
    onInputsChange([0, 1].map(i => ({ ...(inputs[i] ?? { name: "", unit: "", description: "" }), ...(i === index ? { [field]: value } : {}) })));
  };
  return <div className="result-calculation-setup">
      <div className="division-input-definitions">{["Numerador", "Denominador"].map((role, index) => <div key={role}>
        <h4>{role}</h4>
        <label><span>Concepto del {role.toLowerCase()}</span><input value={inputs[index]?.name ?? ""} maxLength={120} onChange={e => update(index, "name", e.target.value)} placeholder={index === 0 ? "Ej. Costo total" : "Ej. Contenedores"}/></label>
        <label><span>Unidad del {role.toLowerCase()}</span><select value={inputs[index]?.unit ?? ""} onChange={e => update(index, "unit", e.target.value)}><option value="">Selecciona una unidad</option>{units.map(unit => <option key={unit.id} value={unit.symbol}>{unit.label}</option>)}</select></label>
      </div>)}</div>
      <p><strong>Resultado = {inputs[0]?.name || "Numerador"} / {inputs[1]?.name || "Denominador"}</strong></p>
      <small>Monitoring solicitará estos dos valores en este orden. Si falta uno, el resultado queda pendiente; si el denominador es 0, no se puede calcular. Selecciona abajo la unidad de este cociente, sin conversión automática.</small>
  </div>;
}
