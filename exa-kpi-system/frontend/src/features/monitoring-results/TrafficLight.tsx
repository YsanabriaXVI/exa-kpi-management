export function TrafficLight({ value }: { value: string | null | undefined }) {
  const labels: Record<string, string> = { GREEN: "Green", YELLOW: "Yellow", RED: "Red" };
  if (!value || !labels[value]) return <span className="traffic-unavailable">—</span>;
  return <span className={`traffic-status ${value.toLowerCase()}`}><i aria-hidden="true"/>{labels[value]}</span>;
}
