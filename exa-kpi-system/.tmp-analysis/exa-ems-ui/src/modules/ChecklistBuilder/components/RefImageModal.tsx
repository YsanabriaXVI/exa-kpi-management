import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { RootState, AppDispatch } from 'src/store'
import { useSelector, useDispatch } from 'react-redux'
import { loadPartImage } from 'src/modules/PartsAndSections/store/partsAndSectionsSlice'
import { EquipmentPartImage } from 'src/modules/PartsAndSections/types'
import '../styles/RefImageModal.css'

import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react-pro'

type RefImageModalProps = {
  data: any
  partsList: any[]
  isOpen: boolean
  toggleModal: (arg: boolean) => void
  setSections: any
  scrollToBottom: any
  setShowErrorModal: (arg: boolean) => void
  showErrorMessage: (arg: string) => void
  equipmentPartId: number | null
}

export default function RefImageModal({
  data: dataProp = {},
  partsList: partsListProp = [],
  isOpen: isOpenProp = false,
  toggleModal,
  setSections,
  scrollToBottom,
  setShowErrorModal,
  showErrorMessage,
  equipmentPartId,
}: RefImageModalProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { imageFile: img } = useSelector((state: RootState) => state.partsAndSections)

  const [data, setData] = useState(dataProp || {})
  const [isOpen, setIsOpen] = useState(!!isOpenProp)
  const [imageFile, setImageFile] = useState<EquipmentPartImage | null>(null)
  const [partsList, setPartsList] = useState(partsListProp || [])

  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState({ sx: 1, sy: 1 })

  // --- helpers ---------------------------------------------------------------

  const getCoordsCount = (coords: string) =>
    coords
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0).length

  // If coords have 4 numbers => rect (x1,y1,x2,y2). Otherwise treat as poly.
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

  const updateScale = useCallback(() => {
    const el = imgRef.current
    if (!el || !el.naturalWidth || !el.naturalHeight) return
    setScale({
      sx: el.clientWidth / el.naturalWidth,
      sy: el.clientHeight / el.naturalHeight,
    })
  }, [])

  // --- effects ---------------------------------------------------------------

  useEffect(() => setIsOpen(!!isOpenProp), [isOpenProp])
  useEffect(() => setData(dataProp || {}), [dataProp])
  useEffect(() => setPartsList(partsListProp || []), [partsListProp])

  useEffect(() => {
    const first = Array.isArray(img) ? img[0] ?? null : img ?? null
    setImageFile(first as EquipmentPartImage | null)
  }, [img])

  useEffect(() => {
    if (typeof equipmentPartId === 'number') {
      dispatch(loadPartImage({ id: equipmentPartId }))
    }
  }, [equipmentPartId, dispatch])

  // Recompute scale on modal open + image changes + element resize
  useEffect(() => {
    const el = imgRef.current
    if (!el) return

    // Initial compute (after render)
    updateScale()

    const ro = new ResizeObserver(() => updateScale())
    ro.observe(el)

    return () => ro.disconnect()
  }, [updateScale, isOpen, imageFile?.url])

  // --- derived ---------------------------------------------------------------

  const getSections = useCallback(
    (list: any) => {
      const partId = equipmentPartId
      if (typeof partId !== 'number') return []
      const part = (list || []).find((p: any) => p.equipmentPartId === partId)
      return part && Array.isArray(part.sections_data) ? part.sections_data : []
    },
    [equipmentPartId],
  )

  const sections = useMemo(() => getSections(partsList), [getSections, partsList])

  const getImageSource = useCallback(() => imageFile?.url ?? '#', [imageFile])

  // --- actions ---------------------------------------------------------------

  const handleClose = useCallback(() => {
    const next = { ...(data || {}), part: {} }
    setData(next)
    toggleModal(false)
  }, [data, toggleModal])

  const addSectionClicked = useCallback(
    (section: any) => {
      const current = data || {}
      const parts = Array.isArray(current.parts) ? current.parts : []

      const partIndex = parts.findIndex((p: any) => Number(p.id) === Number(equipmentPartId))
      if (partIndex < 0) return

      const currentSections = Array.isArray(parts[partIndex]?.sections)
        ? [...parts[partIndex].sections]
        : []

      const lastArrIndex = currentSections.length - 1
      const alreadyAdded = currentSections.find((elem) => Number(elem.id) === Number(section.sectionId))

      if (alreadyAdded) {
        handleClose()
        showErrorMessage(`Section ${section.isoCode} is already added.`)
        setShowErrorModal(true)
        return
      }

      if (
        currentSections.length > 0 &&
        currentSections[0].name === '' &&
        currentSections[0].id === null
      ) {
        currentSections[0].name = section.isoCode
        currentSections[0].id = section.sectionId
      } else if (
        currentSections.length > 0 &&
        currentSections[lastArrIndex].name === '' &&
        currentSections[lastArrIndex].id === null
      ) {
        currentSections[lastArrIndex].name = section.isoCode
        currentSections[lastArrIndex].id = section.sectionId
      } else {
        currentSections.push({
          name: section.isoCode,
          id: section.sectionId,
          instruction: '',
        })
      }

      setSections?.(partIndex, currentSections)
      scrollToBottom?.()
      handleClose()
    },
    [data, equipmentPartId, handleClose, scrollToBottom, setSections, setShowErrorModal, showErrorMessage],
  )

  // --- render ----------------------------------------------------------------

  return (
    <CModal visible={isOpen} onClose={handleClose} className="ref-image-modal ref-image-modal--auto">
      <CModalHeader>Click on a Section</CModalHeader>

      <CModalBody>
        <div className="image-container">
          <img
            ref={imgRef}
            className="ref-image-modal__img"
            src={getImageSource()}
            onLoad={updateScale}
            useMap="#image-map"
            alt=""
            style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
          />

          {/* key forces remount when scale changes (helps some browsers) */}
          <map name="image-map" key={`${scale.sx}-${scale.sy}`}>
            {equipmentPartId &&
              sections.map((section: any, index: number) => {
                const rawCoords = section.coordinates ?? ''
                const shape = inferShape(rawCoords)
                const scaled = scaleCoords(rawCoords, scale.sx, scale.sy)

                return (
                  <area
                    key={`${section.sectionId ?? index}-${index}`}
                    alt={String(section.sectionId)}
                    title={String(section.sectionId)}
                    shape={shape}
                    coords={scaled}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      addSectionClicked(section)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addSectionClicked(section)
                    }}
                    role="button"
                    tabIndex={0}
                  />
                )
              })}
          </map>
        </div>
      </CModalBody>

      <CModalFooter>
        <CButton onClick={handleClose} color="secondary">
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}