/**
 * Companies Data Form Component
 * Manages company-role assignments for users
 */

import React, { useState, useEffect } from 'react'
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CFormLabel,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CAlert,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'

interface CompaniesDataFormProps {
  data: any[]
  companies: any
  roles: any[]
  errors: any
  onChange: (data: any[]) => void
}

const CompaniesDataForm: React.FC<CompaniesDataFormProps> = ({
  data,
  companies,
  roles,
  errors,
  onChange,
}) => {
  const [showModal, setShowModal] = useState(false)
  const [isInsertMode, setIsInsertMode] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [modalErrors, setModalErrors] = useState<any>({})
  const [freeCompanies, setFreeCompanies] = useState<any[]>([])

  // Convert companies object to array
  const companiesArray = Object.values(companies || {}).map((c: any) => c.company || c)

  useEffect(() => {
    initFreeCompanies()
  }, [data, companies])

  const initFreeCompanies = () => {
    const pickedCompanyIds = data.map((item) => 
      typeof item.company === 'object' ? item.company.company_id : item.company
    )
    
    const availableCompanies = companiesArray.filter(
      (company) => !pickedCompanyIds.includes(company.company_id)
    )
    
    setFreeCompanies(availableCompanies)
  }

  const buildCompanyOptions = (list: any[]) =>
    list.map((company) => ({
      value: company.company_id.toString(),
      label: company.name,
    }))

  const buildRoleOptions = () =>
    roles.map((role) => ({
      value: role.role_id.toString(),
      label: role.name,
    }))

  const toSelectValue = (id?: number | string) => {
    if (id === undefined || id === null || id === '') {
      return []
    }
    return [id.toString()]
  }

  const openEditor = (item?: any) => {
    if (item) {
      setEditingItem({ ...item })
      setIsInsertMode(false)
    } else {
      setEditingItem({
        company: { company_id: '', name: '' },
        role: { role_id: '', name: '' },
      })
      setIsInsertMode(true)
    }
    setModalErrors({})
    setShowModal(true)
  }

  const handleModalChange = (field: string, value: any) => {
    if (field === 'company_id') {
      const parsedValue = value ? parseInt(value) : NaN
      const selectedCompany = companiesArray.find((c) => c.company_id === parsedValue)
      setEditingItem({
        ...editingItem,
        company: {
          company_id: Number.isNaN(parsedValue) ? '' : parsedValue,
          name: selectedCompany?.name || '',
        },
      })
    } else if (field === 'role_id') {
      const parsedValue = value ? parseInt(value) : NaN
      const selectedRole = roles.find((r) => r.role_id === parsedValue)
      setEditingItem({
        ...editingItem,
        role: {
          role_id: Number.isNaN(parsedValue) ? '' : parsedValue,
          name: selectedRole?.name || '',
        },
      })
    }
  }

  const validateModal = (): boolean => {
    const errors: any = {}

    if (!editingItem?.company?.company_id) {
      errors.company_id = 'Company is required'
    }

    if (!editingItem?.role?.role_id) {
      errors.role_id = 'Role is required'
    }

    setModalErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = () => {
    if (!validateModal()) {
      return
    }

    let newData = [...data]

    if (isInsertMode) {
      // Add new item
      newData.push({
        ...editingItem,
        company_item_id: `temp_${Date.now()}`,
      })
    } else {
      // Update existing item
      const index = newData.findIndex(
        (item) => 
          (item.company_item_id && item.company_item_id === editingItem.company_item_id) ||
          (item.company.company_id === editingItem.company.company_id)
      )
      if (index !== -1) {
        newData[index] = editingItem
      }
    }

    onChange(newData)
    setShowModal(false)
  }

  const handleDelete = (companyId: number) => {
    const newData = data.filter((item) => {
      const itemCompanyId = typeof item.company === 'object' 
        ? item.company.company_id 
        : item.company
      return itemCompanyId !== companyId
    })
    onChange(newData)
  }

  const handleRoleChange = (companyId: number, roleId: number) => {
    const selectedRole = roles.find((r) => r.role_id === roleId)
    if (!selectedRole) return

    const newData = data.map((item) => {
      const itemCompanyId = typeof item.company === 'object' 
        ? item.company.company_id 
        : item.company
      
      if (itemCompanyId === companyId) {
        return {
          ...item,
          role: {
            role_id: roleId,
            name: selectedRole.name,
          },
        }
      }
      return item
    })

    onChange(newData)
  }

  const canAddCompany = companiesArray.length > 0

  return (
    <div className="company-role-section">
      <CButton
        color="success"
        size="sm"
        className="mb-3 company-role-section__add"
        onClick={() => openEditor()}
        disabled={!canAddCompany}
        style={{ color: '#fff' }}
      >
        <CIcon icon={cilPlus} className="me-1" />
        Add Company
      </CButton>

      {!canAddCompany && (
        <CAlert color="warning" className="mb-3">
          No companies available. Please create a company first.
        </CAlert>
      )}

      {errors?.user_role_companies && (
        <CAlert color="danger" className="mb-3">
          {errors.user_role_companies}
        </CAlert>
      )}

      {data.length === 0 ? (
        <CAlert color="warning">
          <strong>No Items.</strong> Please add at least one company and role.
        </CAlert>
      ) : (
        <div className="company-role-table-wrapper">
          <CTable striped hover className="company-role-table">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell className="text-uppercase small text-body-secondary">Company</CTableHeaderCell>
                <CTableHeaderCell className="text-uppercase small text-body-secondary">Role</CTableHeaderCell>
                {companiesArray.length > 1 && (
                  <CTableHeaderCell style={{ width: '100px', textAlign: 'center' }}>
                    Actions
                  </CTableHeaderCell>
                )}
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {data.map((item, index) => {
                const companyName = typeof item.company === 'object' 
                  ? item.company.name 
                  : item.company
                const companyId = typeof item.company === 'object' 
                  ? item.company.company_id 
                  : item.company
                const roleId = typeof item.role === 'object' 
                  ? item.role.role_id 
                  : item.role

                return (
                  <CTableRow key={index}>
                    <CTableDataCell className="fw-semibold">{companyName}</CTableDataCell>
                    <CTableDataCell>
                      <CMultiSelect
                        options={buildRoleOptions()}
                        multiple={false}
                        placeholder="Select Role"
                        size="sm"
                        search
                        value={toSelectValue(roleId)}
                        onChange={(selected) => {
                          const value = selected?.[0]?.value
                          if (!value) {
                            return
                          }
                          handleRoleChange(companyId, parseInt(value, 10))
                        }}
                      />
                    </CTableDataCell>
                    {companiesArray.length > 1 && (
                      <CTableDataCell style={{ textAlign: 'center' }}>
                        <CButton
                          color="danger"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(companyId)}
                        >
                          <CIcon icon={cilTrash} />
                        </CButton>
                      </CTableDataCell>
                    )}
                  </CTableRow>
                )
              })}
            </CTableBody>
          </CTable>
        </div>
      )}

      {/* Modal for adding/editing company-role */}
      <CModal visible={showModal} onClose={() => setShowModal(false)}>
        <CModalHeader onClose={() => setShowModal(false)}>
          <CModalTitle>
            {isInsertMode ? 'Add' : 'Edit'} Company - Role
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {/* Company Select */}
          <div className="mb-3">
            <CFormLabel htmlFor="company_id">
              Company <span className="text-danger">*</span>
            </CFormLabel>
            <CMultiSelect
              id="company_id"
              options={buildCompanyOptions(isInsertMode ? freeCompanies : companiesArray)}
              multiple={false}
              placeholder="Pick Company"
              search
              disabled={!isInsertMode}
              className={modalErrors?.company_id ? 'is-invalid' : undefined}
              value={toSelectValue(editingItem?.company?.company_id)}
              onChange={(selected) => {
                const value = selected?.[0]?.value
                handleModalChange('company_id', value)
              }}
            />
            {modalErrors?.company_id && (
              <div className="invalid-feedback d-block">{modalErrors.company_id}</div>
            )}
          </div>

          {/* Role Select */}
          <div className="mb-3">
            <CFormLabel htmlFor="role_id">
              Role <span className="text-danger">*</span>
            </CFormLabel>
            <CMultiSelect
              id="role_id"
              options={buildRoleOptions()}
              multiple={false}
              placeholder="Pick Role"
              search
              className={modalErrors?.role_id ? 'is-invalid' : undefined}
              value={toSelectValue(editingItem?.role?.role_id)}
              onChange={(selected) => {
                const value = selected?.[0]?.value
                handleModalChange('role_id', value)
              }}
            />
            {modalErrors?.role_id && (
              <div className="invalid-feedback d-block">{modalErrors.role_id}</div>
            )}
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowModal(false)}>
            Close
          </CButton>
          <CButton color="primary" onClick={handleSave}>
            Save
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default CompaniesDataForm
