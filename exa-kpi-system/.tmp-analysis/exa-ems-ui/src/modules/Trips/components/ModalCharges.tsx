import React, { useState, useEffect } from 'react'
import {
  CButton,
  CCol,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CTable,
  CTableBody,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPencil } from '@coreui/icons'
import type { SelectOption, TripChargeItem } from '../types'

interface ModalChargesProps {
  title: string
  items: TripChargeItem[]
  options: SelectOption[]
  onChange: (items: TripChargeItem[]) => void
  renderTrigger?: (openModal: () => void) => React.ReactNode
}

const ModalCharges: React.FC<ModalChargesProps> = ({ title, items, options, onChange, renderTrigger }) => {
  const [visible, setVisible] = useState(false)
  const [localItems, setLocalItems] = useState<TripChargeItem[]>(items)

  useEffect(() => {
    if (visible) setLocalItems(items)
  }, [visible, items])

  const handleChange = (index: number, field: keyof TripChargeItem, value: any) => {
    setLocalItems((prev) => {
      const next = [...prev]
      let newValue = value
      if (field === 'value') {
        newValue = Number(value) || 0
      } else if (field === 'type') {
        // Try to convert to number if it looks like one
        const num = Number(value)
        if (!Number.isNaN(num) && value !== '') {
          newValue = num
        }
      }
      next[index] = { ...next[index], [field]: newValue }
      return next
    })
  }

  const handleRemove = (index: number) => {
    setLocalItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleAdd = () => {
    setLocalItems((prev) => [
      ...prev,
      { value: 0, type: options[0]?.value || '', name: options[0]?.label || '' },
    ])
  }

  const handleSave = () => {
    onChange(localItems)
    setVisible(false)
  }

  const openModal = () => setVisible(true)
  const closeModal = () => setVisible(false)

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <CButton
          size="sm"
          color="light"
          onClick={openModal}
          className="d-inline-flex align-items-center gap-1 fw-semibold"
        >
          <CIcon icon={cilPencil} className="text-body-secondary" />
          Edit
        </CButton>
      )}
      <CModal visible={visible} onClose={closeModal} size="lg">
        <CModalHeader closeButton>
          <CModalTitle>{title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CTable responsive striped>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Total</CTableHeaderCell>
                <CTableHeaderCell>Charge Type</CTableHeaderCell>
                <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {localItems.map((item, index) => (
                <CTableRow key={`charge-${index}`}>
                  <CTableHeaderCell>
                    <CFormInput
                      type="number"
                      value={item.value ?? 0}
                      onChange={(e) => handleChange(index, 'value', e.target.value)}
                    />
                  </CTableHeaderCell>
                  <CTableHeaderCell>
                    <CFormSelect
                      value={item.type ?? ''}
                      onChange={(e) => handleChange(index, 'type', e.target.value)}
                    >
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </CFormSelect>
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end">
                    <CButton
                      color="danger"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(index)}
                    >
                      Remove
                    </CButton>
                  </CTableHeaderCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
          {!localItems.length && <div className="text-center text-body-secondary">No charges defined.</div>}
        </CModalBody>
        <CModalFooter className="justify-content-between">
          <CRow className="w-100">
            <CCol className="text-start">
              <CButton color="success" className="text-white" onClick={handleAdd}>
                Add Item
              </CButton>
            </CCol>
            <CCol className="text-end">
              <CButton color="secondary" className="me-2 text-white" onClick={closeModal}>
                Cancel
              </CButton>
              <CButton color="primary" className="text-white" onClick={handleSave}>
                Save
              </CButton>
            </CCol>
          </CRow>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default ModalCharges
