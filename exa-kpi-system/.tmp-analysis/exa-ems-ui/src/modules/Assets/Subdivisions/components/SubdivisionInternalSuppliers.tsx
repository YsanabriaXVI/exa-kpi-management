import React, { useEffect, useRef, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheck, cilPencil, cilPlus, cilTrash, cilX } from '@coreui/icons'
import { subdivisionsAPI } from '../api/subdivisions.api'
import { InternalSupplier } from '../types'

interface SubdivisionInternalSuppliersProps {
  subdivisionId: number
  readOnly?: boolean
}

const extractErrorMessage = (payload: any, fallback = 'An unexpected error occurred') => {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload
  const data = payload.response?.data ?? payload.data ?? payload
  if (typeof data === 'string') return data
  if (data?.message && typeof data.message === 'string') return data.message
  if (data && typeof data === 'object') {
    const firstKey = Object.keys(data)[0]
    const firstValue = firstKey ? data[firstKey] : null
    if (typeof firstValue === 'string') return firstValue
    if (Array.isArray(firstValue) && firstValue.length > 0 && typeof firstValue[0] === 'string') {
      return firstValue[0]
    }
  }
  if (payload.message && typeof payload.message === 'string') return payload.message
  return fallback
}

const SubdivisionInternalSuppliers: React.FC<SubdivisionInternalSuppliersProps> = ({ subdivisionId, readOnly }) => {
  const [suppliers, setSuppliers] = useState<InternalSupplier[]>([])
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)
  const [supplierToDelete, setSupplierToDelete] = useState<InternalSupplier | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const [toast, setToast] = useState<any>(null)
  const toaster = useRef<any>()

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' = 'success') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>,
    )
  }

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const items = await subdivisionsAPI.getInternalSuppliers(subdivisionId)
      setSuppliers(items)
    } catch (error) {
      showToast(extractErrorMessage(error, 'Failed to load internal suppliers'), 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdivisionId])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      const created = await subdivisionsAPI.createInternalSupplier(subdivisionId, { name })
      setSuppliers((prev) => [...prev, created])
      setNewName('')
      showToast('Internal supplier added', 'success')
    } catch (error) {
      showToast(extractErrorMessage(error, 'Failed to add internal supplier'), 'danger')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (supplier: InternalSupplier) => {
    setEditingId(supplier.attribute_item_id)
    setEditingName(supplier.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleRename = async (supplier: InternalSupplier) => {
    const name = editingName.trim()
    if (!name || name === supplier.name) {
      cancelEdit()
      return
    }
    setSavingId(supplier.attribute_item_id)
    try {
      const updated = await subdivisionsAPI.updateInternalSupplier(supplier.attribute_item_id, { name })
      setSuppliers((prev) =>
        prev.map((item) =>
          item.attribute_item_id === supplier.attribute_item_id
            ? { ...item, ...updated, name: updated?.name ?? name }
            : item,
        ),
      )
      showToast('Internal supplier updated', 'success')
      cancelEdit()
    } catch (error) {
      showToast(extractErrorMessage(error, 'Failed to update internal supplier'), 'danger')
    } finally {
      setSavingId(null)
    }
  }

  const confirmDelete = async () => {
    if (!supplierToDelete) return
    setDeleteLoading(true)
    try {
      await subdivisionsAPI.deleteInternalSupplier(supplierToDelete.attribute_item_id)
      setSuppliers((prev) => prev.filter((item) => item.attribute_item_id !== supplierToDelete.attribute_item_id))
      showToast('Internal supplier deleted', 'success')
      setSupplierToDelete(null)
    } catch (error) {
      showToast(extractErrorMessage(error, 'Failed to delete internal supplier'), 'danger')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <CCard className="subdivision-section-card shadow-sm border-0">
      <CCardHeader className="subdivision-section-header d-flex justify-content-between align-items-center">
        <div>
          <div className="section-kicker">Suppliers</div>
          <div className="section-title">Internal Suppliers</div>
          <small className="text-body-secondary">Suppliers available to trucks in this subdivision.</small>
        </div>
      </CCardHeader>
      <CCardBody>
        {!readOnly && (
          <div className="d-flex gap-2 mb-3">
            <CFormInput
              value={newName}
              placeholder="New internal supplier name"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              disabled={adding}
            />
            <CButton color="primary" className="text-white" onClick={handleAdd} disabled={adding || !newName.trim()}>
              {adding ? <CSpinner size="sm" /> : <CIcon icon={cilPlus} className="me-1" />}
              Add
            </CButton>
          </div>
        )}

        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <CSpinner color="primary" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-3 text-body-secondary">No internal suppliers yet.</div>
        ) : (
          <CTable hover responsive className="align-middle mb-0">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Name</CTableHeaderCell>
                {!readOnly && <CTableHeaderCell className="text-end">Actions</CTableHeaderCell>}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {suppliers.map((supplier) => {
                const isEditing = editingId === supplier.attribute_item_id
                const isSaving = savingId === supplier.attribute_item_id
                return (
                  <CTableRow key={supplier.attribute_item_id}>
                    <CTableDataCell>
                      {isEditing ? (
                        <CFormInput
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleRename(supplier)
                            } else if (e.key === 'Escape') {
                              cancelEdit()
                            }
                          }}
                          disabled={isSaving}
                          autoFocus
                        />
                      ) : (
                        supplier.name
                      )}
                    </CTableDataCell>
                    {!readOnly && (
                      <CTableDataCell className="text-end">
                        {isEditing ? (
                          <div className="d-flex gap-1 justify-content-end">
                            <CButton
                              color="success"
                              variant="ghost"
                              size="sm"
                              title="Save"
                              onClick={() => handleRename(supplier)}
                              disabled={isSaving}
                            >
                              {isSaving ? <CSpinner size="sm" /> : <CIcon icon={cilCheck} />}
                            </CButton>
                            <CButton
                              color="secondary"
                              variant="ghost"
                              size="sm"
                              title="Cancel"
                              onClick={cancelEdit}
                              disabled={isSaving}
                            >
                              <CIcon icon={cilX} />
                            </CButton>
                          </div>
                        ) : (
                          <div className="d-flex gap-1 justify-content-end">
                            <CButton
                              color="primary"
                              variant="ghost"
                              size="sm"
                              title="Rename"
                              onClick={() => startEdit(supplier)}
                            >
                              <CIcon icon={cilPencil} />
                            </CButton>
                            <CButton
                              color="danger"
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => setSupplierToDelete(supplier)}
                            >
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </div>
                        )}
                      </CTableDataCell>
                    )}
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        )}
      </CCardBody>

      <CModal
        visible={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader onClose={() => setSupplierToDelete(null)}>
          <CModalTitle>Confirm Deletion</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Are you sure you want to delete this internal supplier?
          {supplierToDelete && <div className="fw-bold mt-2">{supplierToDelete.name}</div>}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setSupplierToDelete(null)} disabled={deleteLoading}>
            Cancel
          </CButton>
          <CButton color="danger" className="text-white" onClick={confirmDelete} disabled={deleteLoading}>
            {deleteLoading ? <CSpinner size="sm" /> : 'Delete'}
          </CButton>
        </CModalFooter>
      </CModal>

      <CToaster ref={toaster} push={toast} placement="top-end" />
    </CCard>
  )
}

export default SubdivisionInternalSuppliers
