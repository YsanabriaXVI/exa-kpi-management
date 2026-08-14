export interface CoordinateSource {
  latitud?: number | string | null
  longitud?: number | string | null
  position?: { x?: number | null; y?: number | null } | null
}

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

/**
 * The by-city endpoint returns latitud/longitud as null and only fills the raw
 * `position` point ({ x: longitude, y: latitude }), so both sources are checked.
 */
export const getLocationCoordinates = (location?: CoordinateSource | null) => {
  if (!location) return { latitud: null, longitud: null }
  const position = location.position || {}
  const latitud = toFiniteNumber(location.latitud)
  const longitud = toFiniteNumber(location.longitud)
  return {
    latitud: latitud !== null ? latitud : toFiniteNumber(position.y),
    longitud: longitud !== null ? longitud : toFiniteNumber(position.x),
  }
}

export const isValidLatitude = (value: unknown): boolean => {
  const latitud = toFiniteNumber(value)
  return latitud !== null && latitud >= -90 && latitud <= 90
}

export const isValidLongitude = (value: unknown): boolean => {
  const longitud = toFiniteNumber(value)
  return longitud !== null && longitud >= -180 && longitud <= 180
}

// (0,0) is the placeholder written when coordinates were never configured.
export const hasValidCoordinates = (location?: CoordinateSource | null): boolean => {
  const { latitud, longitud } = getLocationCoordinates(location)
  if (!isValidLatitude(latitud) || !isValidLongitude(longitud)) return false
  return !(latitud === 0 && longitud === 0)
}
