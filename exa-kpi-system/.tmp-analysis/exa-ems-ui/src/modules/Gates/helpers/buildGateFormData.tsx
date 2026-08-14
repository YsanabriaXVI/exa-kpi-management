// gates.api.ts (or a helpers file)

function isFile(v: any): v is File {
  return typeof File !== "undefined" && v instanceof File;
}

export function buildGateFormData(payload: any) {
  const fd = new FormData();
  const clean = structuredClone(payload);

  clean.gateDetails = (clean.gateDetails ?? []).map((gd: any, gdIndex: number) => {
    if (!gd || !Array.isArray(gd.gateDamageData)) return gd;

    gd.gateDamageData = gd.gateDamageData.map((dmg: any, dmgIndex: number) => {
      const file = dmg?.damageImage;

      if (isFile(file)) {
        const field = `damageImage_${gdIndex}_${dmgIndex}`;
        fd.append(field, file, file.name);

        return {
          ...dmg,
          damageImageRef: field, // backend uses this to match file
          damageImage: null, 
        };
      }

      return {
        ...dmg,
        damageImageRef: null,
        damageImage: null,
      };
    });

    return gd;
  });

  fd.append("payload", JSON.stringify(clean));
  return fd;
}