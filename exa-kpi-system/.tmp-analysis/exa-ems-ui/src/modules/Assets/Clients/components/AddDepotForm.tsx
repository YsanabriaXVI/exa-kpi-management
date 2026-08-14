import React, { useEffect, useMemo, useState } from 'react'
import ConfirmationModal from 'src/components/ConfirmationModal'
import {
  CButton,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSwitch,
  CMultiSelect,
  CRow,
  CCol,
  CSmartTable,
  CSpinner,
  CCardFooter,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave, cilPlus, cilPencil, cilTrash, cilSearch } from '@coreui/icons'

import { MODULE_DEPOT_SETUP } from '../../../../constants/modules'
import { 
  permissionService, 
  UPDATE,
  CREATE,
  READ,
  DELETE } from '../../../../services/auth/permission.service'


const canCreateSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, CREATE)
const canUpdateSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, UPDATE)
const canDeleteSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, DELETE)
const canReadSetup = permissionService.checkPermission(MODULE_DEPOT_SETUP, READ)

/* ---------------- Helpers ---------------- */

const toBoolean = (value: any) => value === true || value === 1 || value === '1'
const shouldVirtualScroll = (options: any[]) => (options?.length ?? 0) > 20
const dropdownScrollStyle: React.CSSProperties = { maxHeight: 260, overflowY: 'auto' }

/* ---------------- Types ---------------- */

type SelectOption = { value: string; label: string; disabled?: boolean }

type TableRow = {
  sizeId: number
  asset: string
  size: string
  setupId: number
}

type JobRateRow = {
  jobRateId?: number
  equipmentSizeId?: number | null
  gensetTypeId?: number | null
  setupId?: number
  jobId?: number
  job?: string
  [key: string]: any
}

type FormState = {
  depotId?: string | number
  ediGateCode?: string
  ediBookingCode?: string
  taxRate?: string
  emailNotification?: string | number | boolean
  imagesOnEmail?: string | number | boolean
  [key: string]: any
}

type Props = {
  saving: boolean
  isEdit: boolean

  formData: FormState
  handleChange: (field: keyof FormState, value: any) => void
  handleSubmit: (e: React.FormEvent) => void
  handleCancel: () => void

  depotOptions: SelectOption[]

  goToSizeChargesPage: (sizeId: number | null) => void
  goToSizeChargesPageOnViewMode: (sizeId: number | null) => void

  // ✅ required for Size Charges table
  jobs_data: JobRateRow[]
  sizesList: any[]
  gensetTypesList: any[]

  deleteJobs: (sizeId: number) => void
  viewMode: boolean
}

export default function AddDepotForm(props: Props) {
  const {
    saving,
    isEdit,
    formData,
    handleChange,
    handleSubmit,
    handleCancel,
    depotOptions,
    goToSizeChargesPage,
    goToSizeChargesPageOnViewMode,
    jobs_data,
    sizesList,
    gensetTypesList,
    deleteJobs,
    viewMode
  } = props

  console.log("depot form PROPS", props);

  const showTable = isEdit
  const showButton = showTable && (sizesList?.length ?? 0) > 0 && (jobs_data?.length ?? 0) < (sizesList?.length ?? 0) && !viewMode && canCreateSetup;

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [idToDelete, markIdToDelete] = useState<number>(0);


  // ✅ Build table data exactly like old JS
  const tableData: TableRow[] = useMemo(() => {
    if (!Array.isArray(jobs_data) || jobs_data.length === 0) return []
    if (!Array.isArray(sizesList)) return []

    const sorted = [...jobs_data].sort((a: any, b: any) => {
      const aId = Number(a.jobRateId ?? 0)
      const bId = Number(b.jobRateId ?? 0)
      return bId - aId
    })

    const fixed: TableRow[] = []
    const sizeIds = new Set<number>()
    const gensetIds = new Set<number>()

    sorted.forEach((job: any) => {
      const equipmentSizeId = job.equipmentSizeId != null ? Number(job.equipmentSizeId) : null
      const gensetTypeId = job.gensetTypeId != null ? Number(job.gensetTypeId) : null

      // --- Equipment sizes
      if (equipmentSizeId != null) {
        // sizesList in your JS used sizeEquipmentId to match equipmentSizeId
        const size = sizesList.find((s: any) => Number(s.sizeEquipmentId) === equipmentSizeId)

        if (size && !sizeIds.has(Number(size.sizeEquipmentId))) {
          fixed.push({
            sizeId: equipmentSizeId,
            asset: size?.equipmentTypedId?.equipmentName ?? 'Asset',
            size: size?.sizeType ?? '',
            setupId: Number(job.setupId ?? 0),
          })
          sizeIds.add(Number(size.sizeEquipmentId))
        }
        return
      }

      // --- Gensets (if you want them later)
      if (gensetTypeId != null) {
        console.log('gensetTypesList', gensetTypesList)
        const genset = (gensetTypesList ?? []).find((g: any) => Number(g.attributeItemId) === gensetTypeId)
        if (genset && !gensetIds.has(gensetTypeId)) {
          fixed.push({
            sizeId: gensetTypeId,
            asset: 'Genset',
            size: genset?.name ?? job?.genset_data?.name ?? '',
            setupId: Number(job.setupId ?? 0),
          })
          gensetIds.add(gensetTypeId)
        }
      }
    })

    return fixed
  }, [jobs_data, sizesList, gensetTypesList])

  const columns = useMemo(
    () => [
      { key: 'asset', label: 'Asset' },
      { key: 'size', label: 'Size/Type' },
      { key: 'actions', label: 'Actions', _style: { width: '1%', textAlign: 'center' } },
    ],
    [],
  )

  const displayConfirmationModal = (sizeId: number) => {
    setShowConfirmationModal(true)
    markIdToDelete(sizeId)
  }

  const actionTemplate = (row: TableRow) => {
    console.log('row', row);
    return (
      <div className="d-flex justify-content-center gap-2">
        { canReadSetup && 
        <CButton
          size="sm"
          color="info"
          variant="ghost"
          onClick={() => goToSizeChargesPageOnViewMode(row.sizeId)}
          title="View"
        >
        <CIcon icon={cilSearch} />
        </CButton>}
        { canUpdateSetup && 
        <CButton
          size="sm"
          color="info"
          variant="ghost"
          disabled={saving}
          onClick={() => goToSizeChargesPage(row.sizeId)}
          title="Edit size charges"
        >
          <CIcon icon={cilPencil} />
        </CButton>}
        {canDeleteSetup && <CButton
          size="sm"
          color="danger"
          variant="ghost"
          disabled={saving}
          onClick={() => displayConfirmationModal(row.sizeId)} //deleteJobs(row.sizeId) 
          title="Delete size charges"
        >
          <CIcon icon={cilTrash} />
        </CButton>}
      </div>
    )
  }

  return (
    <CCard className="client-section-card shadow-sm border-0">
      <CCardBody>
        <CForm onSubmit={handleSubmit}>
          <CRow className="g-4">
            <CCol md={6}>
              <CFormLabel>Depot *</CFormLabel>
              <CMultiSelect
                options={depotOptions}
                value={formData.depotId ? String(formData.depotId) : ''}
                onChange={(selected: any) => {
                  const option = Array.isArray(selected) ? selected[0] : selected
                  handleChange('depotId', option?.value ?? '')
                }}
                multiple={false}
                placeholder="Search depot..."
                disabled={saving || viewMode}
                selectionType="text"
                dropdownStyle={dropdownScrollStyle}
                virtualScroller={shouldVirtualScroll(depotOptions)}
              />
            </CCol>

            <CCol md={6}>
              <CFormLabel>EDI Gate Code</CFormLabel>
              <CFormInput
                value={formData.ediGateCode || ''}
                onChange={(e) => handleChange('ediGateCode', e.target.value)}
                placeholder="Enter EDI gate code"
                disabled={saving || viewMode}
              />
            </CCol>

            <CCol md={6}>
              <CFormLabel>EDI Booking Code</CFormLabel>
              <CFormInput
                value={formData.ediBookingCode || ''}
                onChange={(e) => handleChange('ediBookingCode', e.target.value)}
                placeholder="Enter EDI booking code"
                disabled={saving || viewMode}
              />
            </CCol>

            <CCol md={6}>
              <CFormLabel>Tax Rate (%)</CFormLabel>
              <CFormInput
                type="number"
                value={formData.taxRate || ''}
                onChange={(e) => handleChange('taxRate', e.target.value)}
                placeholder="0.00"
                step="0.01"
                disabled={saving || viewMode}
              />
            </CCol>

            <CCol md={6} className="d-flex align-items-center gap-3">
              <div>
                <CFormLabel className="d-block">Email notifications</CFormLabel>
                <CFormSwitch
                  size="lg"
                  color="info"
                  checked={toBoolean(formData.emailNotification)}
                  onChange={(e) => handleChange('emailNotification', e.target.checked ? '1' : '0')}
                  disabled={saving || viewMode}
                />
              </div>
            </CCol>

            <CCol md={6} className="d-flex align-items-center gap-3">
              <div>
                <CFormLabel className="d-block">Images on email</CFormLabel>
                <CFormSwitch
                  size="lg"
                  color="info"
                  checked={toBoolean(formData.imagesOnEmail)}
                  onChange={(e) => handleChange('imagesOnEmail', e.target.checked ? '1' : '0')}
                  disabled={saving || viewMode}
                />
              </div>
            </CCol>
          </CRow>

          <br />
          <br />

          {showTable && (
            <div>
              <p className="fw-semibold mb-2">Size Charges</p>

              <CSmartTable
                items={tableData}
                columns={columns as any}
                itemsPerPage={10}
                pagination
                scopedColumns={{
                  actions: (item: any) => <td className="text-center">{actionTemplate(item as TableRow)}</td>,
                }}
              />
            </div>
          )}

          {showButton && (
            <div className="d-flex justify-content-center mt-3">
            <CButton
              color="success"
              className="text-white"
              type="button"
              onClick={() => goToSizeChargesPage(null)}
              disabled={saving}
            >
              <CIcon icon={cilPlus} className="me-2" />
              Add Size Charges
            </CButton>
            </div>
          )}
          <div className="client-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4">
            <CButton color="secondary" variant="ghost" type="button" onClick={handleCancel} disabled={saving}>
              <CIcon icon={cilArrowLeft} className="me-2" />
              Back
            </CButton>

            {!viewMode && <CButton color="primary" type="submit" disabled={saving} className="text-white px-4">
              {saving ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CIcon icon={cilSave} className="me-2" />
                  Save Setup
                </>
              )}
            </CButton>}
          </div>
        </CForm>
        <ConfirmationModal 
        visible={showConfirmationModal}  
        onClose={()=> setShowConfirmationModal(false)} //deleteJobs(row.sizeId) 
        onConfirm={() => deleteJobs(idToDelete)}
        />
      </CCardBody>
    </CCard>
  )
}
