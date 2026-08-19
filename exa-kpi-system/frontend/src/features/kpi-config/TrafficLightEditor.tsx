import type { TrafficLightRanges } from "./kpi-config.types";

type TrafficLightEditorProps = {
  value: TrafficLightRanges;
  onChange: (ranges: TrafficLightRanges) => void;
};

const clamp = (value: number) => Math.min(100, Math.max(0, value));

export function TrafficLightEditor({ value, onChange }: TrafficLightEditorProps) {
  const updateBox = (field: keyof TrafficLightRanges, raw: string) => {
    const next = clamp(Number(raw) || 0);
    onChange({ ...value, [field]: next });
  };

  const updateRedBoundary = (boundary: number) => {
    const redTo = Math.min(boundary, value.yellowTo - 1);
    onChange({
      ...value,
      redFrom: 0,
      redTo,
      yellowFrom: redTo + 1,
    });
  };

  const updateYellowBoundary = (boundary: number) => {
    const yellowTo = Math.max(boundary, value.redTo + 1);
    onChange({
      ...value,
      yellowTo,
      greenFrom: Math.min(100, yellowTo + 1),
      greenTo: 100,
    });
  };

  const rangeRows: Array<{
    key: "red" | "yellow" | "green";
    label: string;
    from: keyof TrafficLightRanges;
    to: keyof TrafficLightRanges;
  }> = [
    { key: "red", label: "Red", from: "redFrom", to: "redTo" },
    { key: "yellow", label: "Yellow", from: "yellowFrom", to: "yellowTo" },
    { key: "green", label: "Green", from: "greenFrom", to: "greenTo" },
  ];

  return (
    <section className="traffic-editor">
      <div className="traffic-heading">
        <div className="traffic-heading-title">
          <span className="step-number">3</span>
          <div>
            <h2>Traffic Light</h2>
            <p>Edit the six values or drag either handle on the visual range.</p>
          </div>
        </div>
        <span>Score scale: 0–100</span>
      </div>

      <div className="traffic-editor-grid">
        <div className="range-inputs">
          <div className="range-input-labels"><span /><span>From</span><span>To</span></div>
          {rangeRows.map((row) => (
            <div className="range-input-row" key={row.key}>
              <span className={`range-name ${row.key}`}><i />{row.label}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={value[row.from]}
                onChange={(event) => updateBox(row.from, event.target.value)}
              />
              <input
                type="number"
                min="0"
                max="100"
                value={value[row.to]}
                onChange={(event) => updateBox(row.to, event.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="visual-range">
          <div className="range-preview-label">Visual Range Slider</div>
          <div
            className="segmented-track"
            style={{
              background: `linear-gradient(to right,
                #ef7777 0% ${value.redTo}%,
                #f2c94c ${value.redTo}% ${value.yellowTo}%,
                #58cf8b ${value.yellowTo}% 100%)`,
            }}
          />
          <div className="dual-range">
            <input
              type="range"
              min="0"
              max="99"
              value={value.redTo}
              aria-label="Red to yellow boundary"
              onChange={(event) => updateRedBoundary(Number(event.target.value))}
            />
            <input
              type="range"
              min="1"
              max="100"
              value={value.yellowTo}
              aria-label="Yellow to green boundary"
              onChange={(event) => updateYellowBoundary(Number(event.target.value))}
            />
          </div>
          <div className="range-scale">
            <span>0</span><span>{value.redTo}</span><span>{value.yellowTo}</span><span>100</span>
          </div>
        </div>
      </div>
    </section>
  );
}
