import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import type { MeasurementInput } from "./kpi-config.types";
import { ResultCalculationSetup } from "./ResultCalculationSetup";

export function RatioSetupModal({ inputs, unit, units, onClose, onSave }: {
  inputs: MeasurementInput[];
  unit: string;
  units: Array<{ id: string; symbol: string; label: string }>;
  onClose: () => void;
  onSave: (inputs: MeasurementInput[], unit: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [draftInputs, setDraftInputs] = useState(inputs);
  const [draftUnit, setDraftUnit] = useState(unit);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const complete = draftInputs.length === 2 && draftInputs.every(input => input.name.trim() && input.unit) && draftUnit;
  return <dialog ref={dialog} className="ratio-setup-modal" aria-labelledby="ratio-setup-title" onCancel={onClose}>
    <div className="ratio-modal-header">
      <h2 id="ratio-setup-title">Razón entre dos valores</h2>
      <button type="button" className="ratio-modal-close" aria-label="Cerrar configuración" onClick={onClose}><X size={20}/></button>
    </div>
    <ResultCalculationSetup inputs={draftInputs} units={units} onInputsChange={setDraftInputs}/>
    <label className="ratio-official-unit"><span>Official Result Unit</span>
      <select value={draftUnit} onChange={event => setDraftUnit(event.target.value)}>
        <option value="">Selecciona la unidad del resultado</option>
        {units.map(item => <option key={item.id} value={item.symbol}>{item.label}</option>)}
      </select>
    </label>
    <div className="ratio-modal-actions">
      <button type="button" className="ratio-button-secondary" onClick={onClose}><X size={16}/>Cancelar</button>
      <button type="button" className="ratio-button-primary" disabled={!complete} onClick={() => onSave(draftInputs, draftUnit)}><Check size={16}/>Guardar</button>
    </div>
  </dialog>;
}
