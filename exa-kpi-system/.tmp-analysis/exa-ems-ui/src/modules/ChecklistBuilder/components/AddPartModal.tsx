import React, { useMemo } from 'react'
import {
  CButton,
  CModal,
  CModalBody,
  CModalHeader,
  CModalFooter,
  CFormSelect,
} from '@coreui/react-pro'
import { RenderOptions } from '../../../helpers/RenderOptionsHelper'

interface ModalProps {
  data: any
  toggleModal: (arg: boolean) => void
  isOpen: boolean
  parts: any[]
  isGenset: boolean
  setState: (arg: any) => void
}

const AddPartModal: React.FC<ModalProps> = (props) => {
  const handleClose = () => props.toggleModal(false)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const option = e.target.options[e.target.selectedIndex]

    const next = { ...props.data }
    next.part = { id: value, name: option?.text ?? '' }

    props.setState(next) // ✅ set at end
  }

  const addPart = () => {
    const d = props.data
    const selected = d?.part

    if (!selected?.id) return

    const newPart = {
      name: selected.name,
      id: selected.id,
      sections: [{ name: '', id: null, instruction: '' }],
    }

    // ✅ IMMUTABLE update (no mutation)
    const next = {
      ...d,
      parts: [...(d.parts ?? []), newPart],
      part: {}, // clear selection
    }

    props.setState(next) // ✅ set at end
    handleClose()
  }

  const partsList = useMemo(() => {
    // only compute when modal is open; avoids stale/extra work
    if (!props.isOpen) return []

    const partsListClone = [...props.parts]
    const { data, isGenset } = props

    const pendingDefaultChecklist = !('parts' in data)
    if (pendingDefaultChecklist) return []

    const pendingEquipmentSizeType = data.gensetTypeId == null && data.equipmentTypeId == null
    if (pendingEquipmentSizeType) return []

    let listForSizeType: any[] = []

    if (isGenset) {
      listForSizeType = partsListClone.filter(
        (p) => Number(p.gensetTypeId) === Number(data.gensetTypeId)  && p.outerRef !== 1
      )
    } else {
      listForSizeType = partsListClone.filter(
        (p) => Number(p.sizeEquipmentId) === Number(data.sizeEquipmentId) && p.outerRef !== 1
      )
    }

    // remove already-added parts (IMMUTABLE: filter, no splice)
    const added = data.parts ?? []
    const addedIds = new Set(added.map((p: any) => Number(p.id)))

    let filtered = listForSizeType.filter((p) => !addedIds.has(Number(p.equipmentPartId)))
    console.log('filtered', filtered)

    // equipmentType filter (if needed)
    const equipmentType = Number(data.equipmentTypeId)
    filtered = filtered.filter((p) => {
      if (!isGenset && p.equipmentType?.equipmentTypeId != null) {
        return (Number(p.equipmentType.equipmentTypeId) === equipmentType)
      }
      if (isGenset) {
        return (Number(p.gensetTypeId) === Number(data.gensetTypeId))
      }
      return true
    })

    return filtered
  }, [props.isOpen, props.parts, props.data, props.isGenset])

  const partsOptions = useMemo(() => {
    const base = RenderOptions(partsList, 'equipmentPartId', 'partName') as any[]
    return [{ label: 'Select a part...', value: '' }, ...base] 
  }, [partsList])

  const partId = props.data?.part?.id ?? ''

  return (
    <CModal
      visible={props.isOpen}
      onClose={handleClose}
      className="modal-primary"
    >
      <CModalHeader>Add a Part</CModalHeader>

      <CModalBody>
        <CFormSelect
          name="part"
          label="Part"
          options={partsOptions as any}
          value={partId}
          onChange={handleChange}
        />
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={handleClose}>
          Close
        </CButton>

        <CButton color="primary" onClick={addPart} disabled={!partId}>
          Add to List
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default AddPartModal
