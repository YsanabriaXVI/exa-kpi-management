type ErrorBag = Record<string, any>;

const DEFAULT_SECTION_LABELS: Record<string, string> = {
  gateErrors: "Gate/Truck",
  containerErrors: "Container",
  chassisErrors: "Chassis",
  gensetErrors: "Genset",
  containerDamageErrors: "Container Damage",
  chassisDamageErrors: "Chassis Damage",
  gensetDamageErrors: "Genset Damage",
};

function prettyFieldPath(path: string): string {
  const m = path.match(
    /^checkListData\.equipmentParts\[(\d+)\]\.partSections\[(\d+)\]\.(.+)$/
  );
  if (m) {
    const partIdx = Number(m[1]) + 1;
    const sectionIdx = Number(m[2]) + 1;
    const field = m[3];
    const fieldLabel =
      field === "conditionId" ? "Condition" :
      field === "remarks" ? "Remarks" :
      field;
    return `Checklist item ${partIdx}, section ${sectionIdx} — ${fieldLabel}`;
  }

  if (path === "checkListData.equipmentParts") return "Checklist";

  const d = path.match(/^(\w+)\.(\d+)\.(.+)$/);
  if (d) {
    const group = d[1];
    const idx = Number(d[2]) + 1;
    const field = d[3];
    return `${group} row ${idx} — ${field}`;
  }

  // make simple fields nicer
  const simpleMap: Record<string, string> = {
    equipmentId: "Equipment",
    clientId: "Client",
    sizeEquipmentId: "Size",
    gensetTypeId: "Genset Type",
    inTransit: "In Transit",
    haulage: "Haulage",
    loaded: "Loaded",
  };

  return simpleMap[path] ?? path;
}

export default function buildSubmitErrorMessage(
  allErrors: ErrorBag,
  opts?: {
    sectionLabels?: Record<string, string>;
    sectionOrder?: string[];
    maxItemsPerSection?: number; // optional, to avoid huge modals
  }
): string {
  const sectionLabels = { ...DEFAULT_SECTION_LABELS, ...(opts?.sectionLabels ?? {}) };
  const sectionOrder =
    opts?.sectionOrder ??
    [
      "containerErrors",
      "chassisErrors",
      "gensetErrors",
      "containerDamageErrors",
      "chassisDamageErrors",
      "gensetDamageErrors",
      "gateErrors",
    ];

  const maxItemsPerSection = opts?.maxItemsPerSection ?? 50;

  const lines: string[] = ["⚠️ Incorrect or missing information. Please fix the following:"];

  for (const sectionKey of sectionOrder) {
    const section = allErrors?.[sectionKey];
    if (!section || typeof section !== "object") continue;

    const entries = Object.entries(section).filter(([, v]) => typeof v === "string" && v.trim());
    if (entries.length === 0) continue;

    lines.push(`\n${sectionLabels[sectionKey] ?? sectionKey}`);
    lines.push("—".repeat(20));

    const seen = new Set<string>();
    let count = 0;

    for (const [fieldPath, msg] of entries) {
      const label = prettyFieldPath(fieldPath);
      //const item = `• ${label}: ${msg}`;
      const item = `• ${msg}`;

      if (seen.has(item)) continue;
      seen.add(item);

      lines.push(item);
      count++;
      if (count >= maxItemsPerSection) {
        lines.push(`• …and ${entries.length - count} more`);
        break;
      }
    }
  }

  return lines.join("\n");
}