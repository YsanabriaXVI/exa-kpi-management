export type DivisionValues = { numerator: string | null; denominator: string | null };
export function DivisionResultInput({ name, inputs, values, unit, disabled, onChange }: {
  name: string; inputs: Array<{name: string; unit: string}>; values: DivisionValues;
  unit: string | null; disabled: boolean; onChange: (values: DivisionValues) => void;
}) {
  const complete = values.numerator !== null && values.denominator !== null;
  const numerator = Number(values.numerator), denominator = Number(values.denominator);
  const valid = complete && Number.isFinite(numerator) && Number.isFinite(denominator);
  const quotient = valid && denominator !== 0 ? numerator / denominator : null;
  const preview = !complete ? "Pendiente" : !valid ? "Ingresa valores numéricos" : denominator === 0 ? "NOT_CALCULABLE: denominador 0" : quotient !== null && Number.isFinite(quotient) && Math.abs(quotient) < 1e14 ? `${quotient.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${unit ?? ""}` : "NOT_CALCULABLE: fuera de rango";
  return <div className="division-result-input">
    {(["numerator", "denominator"] as const).map((key, index) => <label key={key}>
      <span>{index === 0 ? "Numerador" : "Denominador"} · {inputs[index]?.name} ({inputs[index]?.unit})</span>
      <input aria-label={`${index === 0 ? "Numerador" : "Denominador"} ${inputs[index]?.name} para ${name}`} className="manual-inline-input result" inputMode="decimal" value={values[key] ?? ""} disabled={disabled} onChange={e => onChange({...values, [key]: e.target.value.trim() || null})}/>
    </label>)}
    <small>{inputs[0]?.name} / {inputs[1]?.name}</small>
    <output aria-label={`Resultado calculado para ${name}`} aria-live="polite">{preview}</output>
  </div>;
}
