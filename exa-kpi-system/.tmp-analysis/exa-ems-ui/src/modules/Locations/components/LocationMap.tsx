import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { GoogleMap, Marker, Polygon, Polyline, useJsApiLoader } from '@react-google-maps/api'
import { CAlert, CButton } from '@coreui/react-pro'
import type { GeofencePoint } from '../types'

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '420px',
}

const HONDURAS_CENTER = { lat: 14.0818, lng: -87.2068 }

interface LocationMapProps {
  latitud?: number | null
  longitud?: number | null
  geofenceCoordinates?: GeofencePoint[] | null
  readOnly?: boolean
  onCenterChange: (latitud: number, longitud: number) => void
  onPolygonChange: (coordinates: GeofencePoint[] | null) => void
}

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isZeroZero = (lat?: number | null, lng?: number | null): boolean =>
  Number(lat) === 0 && Number(lng) === 0

const normalizePoint = (point: GeofencePoint): GeofencePoint => ({
  lat: Number(point.lat),
  lng: Number(point.lng),
})

const isValidMapsKey = (key?: string): boolean =>
  Boolean(
    key &&
      key.trim() &&
      !key.includes('VITE_GOOGLE_MAPS_API_KEY') &&
      !key.startsWith('$'),
  )

const getGoogleMapsApiKey = (): string => {
  const runtimeKey =
    typeof window !== 'undefined'
      ? (window as unknown as { __ENV__?: { VITE_GOOGLE_MAPS_API_KEY?: string } }).__ENV__
          ?.VITE_GOOGLE_MAPS_API_KEY
      : undefined

  const viteKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY

  if (isValidMapsKey(runtimeKey)) {
    return runtimeKey as string
  }

  if (isValidMapsKey(viteKey)) {
    return viteKey as string
  }

  return ''
}

const LocationMap = ({
  latitud,
  longitud,
  geofenceCoordinates,
  readOnly = false,
  onCenterChange,
  onPolygonChange,
}: LocationMapProps): React.ReactElement => {
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false)
  const [draftPath, setDraftPath] = useState<GeofencePoint[]>([])

  const googleMapsApiKey = getGoogleMapsApiKey()

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey,
  })

  const markerPosition = useMemo(() => {
    const lat = Number(latitud)
    const lng = Number(longitud)

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || isZeroZero(lat, lng)) {
      return null
    }

    return { lat, lng }
  }, [latitud, longitud])

  const mapCenter = markerPosition || HONDURAS_CENTER

  const polygonPath = useMemo(() => {
    if (!Array.isArray(geofenceCoordinates)) {
      return []
    }

    return geofenceCoordinates
      .map(normalizePoint)
      .filter((point) => isValidNumber(point.lat) && isValidNumber(point.lng))
  }, [geofenceCoordinates])

  const closedDraftPath = useMemo(() => {
    if (draftPath.length < 2) {
      return draftPath
    }

    if (draftPath.length >= 3) {
      return [...draftPath, draftPath[0]]
    }

    return draftPath
  }, [draftPath])

  const startDrawing = useCallback(() => {
    if (readOnly) {
      return
    }

    setDraftPath(polygonPath.length >= 3 ? polygonPath : [])
    setIsDrawingPolygon(true)
  }, [readOnly, polygonPath])

  const cancelDrawing = useCallback(() => {
    setDraftPath([])
    setIsDrawingPolygon(false)
  }, [])

  const finishDrawing = useCallback(() => {
    if (draftPath.length < 3) {
      return
    }

    onPolygonChange(draftPath)
    setDraftPath([])
    setIsDrawingPolygon(false)
  }, [draftPath, onPolygonChange])

  const undoDraftPoint = useCallback(() => {
    setDraftPath((currentPath) => currentPath.slice(0, -1))
  }, [])

  const clearGeofence = useCallback(() => {
    setDraftPath([])
    setIsDrawingPolygon(false)
    onPolygonChange(null)
  }, [onPolygonChange])

  const removeDraftPoint = useCallback((indexToRemove: number) => {
    setDraftPath((currentPath) => currentPath.filter((_, index) => index !== indexToRemove))
  }, [])

  const updateDraftPoint = useCallback((indexToUpdate: number, point: GeofencePoint) => {
    setDraftPath((currentPath) =>
      currentPath.map((currentPoint, index) => (index === indexToUpdate ? point : currentPoint)),
    )
  }, [])

  const updateSavedPoint = useCallback(
    (indexToUpdate: number, point: GeofencePoint) => {
      const updatedPath = polygonPath.map((currentPoint, index) =>
        index === indexToUpdate ? point : currentPoint,
      )

      onPolygonChange(updatedPath.length >= 3 ? updatedPath : null)
    },
    [polygonPath, onPolygonChange],
  )

  const removeSavedPoint = useCallback(
    (indexToRemove: number) => {
      const updatedPath = polygonPath.filter((_, index) => index !== indexToRemove)

      onPolygonChange(updatedPath.length >= 3 ? updatedPath : null)
    },
    [polygonPath, onPolygonChange],
  )

  useEffect(() => {
    if (readOnly) {
      cancelDrawing()
    }
  }, [readOnly, cancelDrawing])

  if (!googleMapsApiKey) {
    return (
      <CAlert color="warning" className="mt-3">
        Google Maps API key is not configured. Set VITE_GOOGLE_MAPS_API_KEY.
      </CAlert>
    )
  }

  if (loadError) {
    return (
      <CAlert color="danger" className="mt-3">
        Unable to load Google Maps. Check that VITE_GOOGLE_MAPS_API_KEY is valid and that Maps
        JavaScript API is enabled.
      </CAlert>
    )
  }

  if (!isLoaded) {
    return <div className="location-map-placeholder mt-3">Loading map...</div>
  }

  const geofencePointIcon: google.maps.Symbol = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#dc2626',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeOpacity: 1,
    strokeWeight: 2,
    scale: 8,
  }

  const centerPointIcon: google.maps.Symbol = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#16a34a',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeOpacity: 1,
    strokeWeight: 2,
    scale: 9,
  }

  const polygonOptions: google.maps.PolygonOptions = {
    clickable: false,
    draggable: false,
    editable: false,
    fillColor: '#111827',
    fillOpacity: 0.25,
    strokeColor: '#111827',
    strokeOpacity: 1,
    strokeWeight: 3,
  }

  const draftLineOptions: google.maps.PolylineOptions = {
    clickable: false,
    strokeColor: '#dc2626',
    strokeOpacity: 1,
    strokeWeight: 3,
  }

  return (
    <div className="location-map-editor mt-4">
      <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
        <div>
          <h6 className="mb-0">Geofence</h6>
          <small className="text-body-secondary">
            Click the map to add red points. Drag the red points to resize the geofence before
            saving.
          </small>
        </div>

        {!readOnly && (
          <div className="d-flex flex-wrap justify-content-end gap-2">
            {!isDrawingPolygon && (
              <CButton color="primary" variant="outline" size="sm" onClick={startDrawing}>
                {polygonPath.length >= 3 ? 'Edit geofence' : 'Draw geofence'}
              </CButton>
            )}

            {isDrawingPolygon && (
              <>
                <CButton
                  color="success"
                  variant="outline"
                  size="sm"
                  disabled={draftPath.length < 3}
                  onClick={finishDrawing}
                >
                  Finish polygon
                </CButton>

                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  disabled={draftPath.length === 0}
                  onClick={undoDraftPoint}
                >
                  Undo point
                </CButton>

                <CButton color="secondary" variant="outline" size="sm" onClick={cancelDrawing}>
                  Cancel
                </CButton>
              </>
            )}

            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              disabled={polygonPath.length === 0 && draftPath.length === 0}
              onClick={clearGeofence}
            >
              Clear geofence
            </CButton>
          </div>
        )}
      </div>

      {isDrawingPolygon && (
        <CAlert color="info" className="py-2">
          Click on the map to add red points. Drag any red point to make the polygon bigger or
          smaller. Click a red point to remove it. Add at least 3 points, then click Finish polygon.
        </CAlert>
      )}

      {!isDrawingPolygon && polygonPath.length >= 3 && !readOnly && (
        <CAlert color="info" className="py-2">
          Drag the red points to resize the polygon. Click Edit geofence to add more points, or
          click a red point to remove it.
        </CAlert>
      )}

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={mapCenter}
        zoom={markerPosition ? 15 : 7}
        onClick={(event: google.maps.MapMouseEvent) => {
          if (readOnly || !event.latLng) {
            return
          }

          const clickedPoint: GeofencePoint = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng(),
          }

          if (isDrawingPolygon) {
            setDraftPath((currentPath) => [...currentPath, clickedPoint])
            return
          }

          onCenterChange(clickedPoint.lat, clickedPoint.lng)
        }}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: true,
        }}
      >
        {markerPosition && (
          <Marker
            position={markerPosition}
            draggable={!readOnly && !isDrawingPolygon}
            icon={centerPointIcon}
            title="Location center"
            onDragEnd={(event: google.maps.MapMouseEvent) => {
              if (readOnly || isDrawingPolygon || !event.latLng) {
                return
              }

              onCenterChange(event.latLng.lat(), event.latLng.lng())
            }}
          />
        )}

        {isDrawingPolygon &&
          draftPath.map((point, index) => (
            <Marker
              key={`draft-point-${index}-${point.lat}-${point.lng}`}
              position={point}
              icon={geofencePointIcon}
              draggable={!readOnly}
              title={`Point ${index + 1}. Drag to resize or click to remove.`}
              zIndex={1000 + index}
              onClick={() => removeDraftPoint(index)}
              onDragEnd={(event: google.maps.MapMouseEvent) => {
                if (!event.latLng) {
                  return
                }

                updateDraftPoint(index, {
                  lat: event.latLng.lat(),
                  lng: event.latLng.lng(),
                })
              }}
            />
          ))}

        {isDrawingPolygon && draftPath.length >= 2 && (
          <Polyline path={closedDraftPath} options={draftLineOptions} />
        )}

        {isDrawingPolygon && draftPath.length >= 3 && (
          <Polygon path={draftPath} options={polygonOptions} />
        )}

        {!isDrawingPolygon && polygonPath.length >= 3 && (
          <>
            <Polygon path={polygonPath} options={polygonOptions} />

            {!readOnly &&
              polygonPath.map((point, index) => (
                <Marker
                  key={`saved-point-${index}-${point.lat}-${point.lng}`}
                  position={point}
                  icon={geofencePointIcon}
                  draggable
                  title={`Point ${index + 1}. Drag to resize or click to remove.`}
                  zIndex={1000 + index}
                  onClick={() => removeSavedPoint(index)}
                  onDragEnd={(event: google.maps.MapMouseEvent) => {
                    if (!event.latLng) {
                      return
                    }

                    updateSavedPoint(index, {
                      lat: event.latLng.lat(),
                      lng: event.latLng.lng(),
                    })
                  }}
                />
              ))}
          </>
        )}
      </GoogleMap>
    </div>
  )
}

export default LocationMap