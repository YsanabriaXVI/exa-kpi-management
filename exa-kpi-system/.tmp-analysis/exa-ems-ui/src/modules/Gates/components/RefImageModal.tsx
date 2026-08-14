import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../styles/RefImageModal.css'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilXCircle, cilArrowThickFromRight } from '@coreui/icons'
import { EquipmentPartImage } from 'src/modules/PartsAndSections/types'

type RefMultiImageModalProps = {
  isOpen: boolean
  toggleModal: (arg: boolean) => void
  outerRefParts: any[]
  referentParts: any[]
  imagesByPartId: Record<number, EquipmentPartImage | null>
  onSelectOuterRef: (selection: any) => void
  onSelectReferent: (part: any, section: any) => void
  selectedOuterRef: any
  backToOuterRef: () => void
}

export default function RefMultiImageModal({
  isOpen,
  toggleModal,
  outerRefParts = [],
  referentParts = [],
  imagesByPartId,
  onSelectOuterRef,
  selectedOuterRef,
  onSelectReferent,
  backToOuterRef
}: RefMultiImageModalProps) {
  const handleClose = useCallback(() => toggleModal(false), [toggleModal])

  const [scalesByPartId, setScalesByPartId] = useState<Record<number, { sx: number; sy: number }>>({})

  const imgRefs = useRef<Record<number, HTMLImageElement | null>>({})

  const getCoordsCount = (coords: string) =>
    coords
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length

  const inferShape = (coords: string): 'rect' | 'poly' => {
    const n = getCoordsCount(coords)
    return n === 4 ? 'rect' : 'poly'
  }

  const scaleCoords = (coords: string, scaleX: number, scaleY: number): string => {
    if (!coords) return ''
    return coords
      .split(',')
      .map((value, index) => {
        const n = Number(value.trim())
        if (Number.isNaN(n)) return value
        const s = index % 2 === 0 ? scaleX : scaleY
        return Math.round(n * s)
      })
      .join(',')
  }

  const updateScaleFor = useCallback((partId: number) => {
    const el = imgRefs.current[partId]
    if (!el || !el.naturalWidth || !el.naturalHeight) return

    const sx = el.clientWidth / el.naturalWidth
    const sy = el.clientHeight / el.naturalHeight

    setScalesByPartId((prev) => {
      const prevScale = prev[partId]
      if (prevScale && prevScale.sx === sx && prevScale.sy === sy) return prev
      return { ...prev, [partId]: { sx, sy } }
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const ros: ResizeObserver[] = []
    const allParts = [...outerRefParts, ...referentParts]

    for (const part of allParts) {
      const id = Number(part?.equipmentPartId)
      if (!id) continue

      const el = imgRefs.current[id]
      if (!el) continue

      updateScaleFor(id)

      const ro = new ResizeObserver(() => updateScaleFor(id))
      ro.observe(el)
      ros.push(ro)
    }

    return () => {
      ros.forEach((ro) => ro.disconnect())
    }
  }, [isOpen, outerRefParts, referentParts, updateScaleFor])

  const outerRefPartsToRender = useMemo(() => {
    return (outerRefParts || []).filter((p: any) => {
      const id = Number(p?.equipmentPartId)
      return id && imagesByPartId && imagesByPartId[id]?.url
    })
  }, [outerRefParts, imagesByPartId])

  const referentPartsToRender = useMemo(() => {
    return (referentParts || []).filter((p: any) => {
      const id = Number(p?.equipmentPartId)
      return id && imagesByPartId && imagesByPartId[id]?.url
    })
  }, [referentParts, imagesByPartId])

  const selectedReferentPartId =
    selectedOuterRef !== null ? Number(selectedOuterRef?.referent) : null

  const selectedReferentPart =
    selectedReferentPartId !== null
      ? referentPartsToRender.find((p: any) => Number(p?.equipmentPartId) === selectedReferentPartId)
      : null

  const selectedReferentImgUrl =
    selectedReferentPartId !== null ? imagesByPartId[selectedReferentPartId]?.url ?? '#' : '#'

  const selectedReferentSections =
    Array.isArray(selectedReferentPart?.sections_data) ? selectedReferentPart.sections_data : []

  const selectedReferentScale =
    selectedReferentPartId !== null
      ? scalesByPartId[selectedReferentPartId] ?? { sx: 1, sy: 1 }
      : { sx: 1, sy: 1 }

  const selectedReferentMapName =
    selectedReferentPartId !== null ? `image-map-${selectedReferentPartId}` : 'image-map-selected'

  return (
    <CModal
      visible={isOpen}
      onClose={handleClose}
      className="ref-image-modal ref-image-modal--auto"
      alignment="center"
    >
      <CModalHeader>Reference Images</CModalHeader>

      <CModalBody>
        {outerRefPartsToRender.length !== 0 && selectedOuterRef == null &&
          outerRefPartsToRender.map((part: any) => {
            const id = Number(part.equipmentPartId)
            const imgUrl = imagesByPartId[id]?.url ?? '#'
            const sections = Array.isArray(part.sections_data) ? part.sections_data : []
            const scale = scalesByPartId[id] ?? { sx: 1, sy: 1 }
            const mapName = `image-map-${id}`

            return (
              <div key={id} style={{ marginBottom: 18 }}>
                <div style={{ marginBottom: 8, fontWeight: 600 }}>
                  {part.partName ?? `Ref ${id}`}
                </div>

                <div className="image-container">
                  <img
                    ref={(el) => {
                      imgRefs.current[id] = el
                    }}
                    src={imgUrl}
                    onLoad={() => updateScaleFor(id)}
                    useMap={`#${mapName}`}
                    alt=""
                    style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                  />

                  <map name={mapName} key={`${id}-${scale.sx}-${scale.sy}`}>
                    {sections.map((section: any, index: number) => {
                      const raw = section.coordinates ?? ''
                      const shape = inferShape(raw)
                      const scaled = scaleCoords(raw, scale.sx, scale.sy)

                      return (
                        <area
                          key={`${section.sectionId ?? index}-${index}`}
                          alt={String(section.isoCode ?? section.sectionId)}
                          title={String(section.description ?? section.isoCode ?? section.sectionId)}
                          shape={shape}
                          coords={scaled}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            onSelectOuterRef(section)
                          }}
                        />
                      )
                    })}
                  </map>
                </div>
              </div>
            )
          })}

        {selectedOuterRef !== null && selectedReferentPartId !== null && selectedReferentPart && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 8, fontWeight: 600 }}>
              {selectedReferentPart.partName ?? `Ref ${selectedReferentPartId}`}
            </div>

            <div className="image-container">
              <img
                ref={(el) => {
                  imgRefs.current[selectedReferentPartId] = el
                }}
                src={selectedReferentImgUrl}
                onLoad={() => updateScaleFor(selectedReferentPartId)}
                useMap={`#${selectedReferentMapName}`}
                alt=""
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
              />

              <map
                name={selectedReferentMapName}
                key={`${selectedReferentPartId}-${selectedReferentScale.sx}-${selectedReferentScale.sy}`}
              >
                {selectedReferentSections.map((section: any, index: number) => {
                  const raw = section.coordinates ?? ''
                  const shape = inferShape(raw)
                  const scaled = scaleCoords(raw, selectedReferentScale.sx, selectedReferentScale.sy)

                  return (
                    <area
                      key={`${section.sectionId ?? index}-${index}`}
                      alt={String(section.isoCode ?? section.sectionId)}
                      title={String(section.description ?? section.isoCode ?? section.sectionId)}
                      shape={shape}
                      coords={scaled}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        onSelectReferent(selectedReferentPart, section)
                      }}
                    />
                  )
                })}
              </map>
            </div>
          </div>
        )}
      </CModalBody>

      <CModalFooter>
        {outerRefPartsToRender.length !== 0 && selectedOuterRef !== null &&
        <CButton
          color="secondary"
          className="text-white"
          onClick={() => backToOuterRef()}
          //disabled={loading.saving}
        >
          <CIcon icon={cilArrowThickFromRight} className="me-2" />
          Back To Parts
        </CButton>}
        <CButton color="warning" onClick={() => toggleModal(false)} /* disabled={disabled} */>
          <CIcon icon={cilXCircle} className="me-2" />
          Cancel
        </CButton>
      </CModalFooter>
    </CModal>
  )
}