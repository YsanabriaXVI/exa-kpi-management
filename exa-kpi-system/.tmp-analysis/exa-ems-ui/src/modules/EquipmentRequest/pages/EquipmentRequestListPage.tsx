import React, { useEffect, useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CContainer } from '@coreui/react-pro'
import PageHero from 'src/components/PageHero'
import { useNavigate } from 'react-router-dom'
import { CSmartTable } from '@coreui/react-pro'
import { useDispatch, useSelector } from 'react-redux'
import { loadRequirementsList, deleteRequirement, actions } from '../store/equipmentRequest.slice'
import { set, type AppDispatch, type RootState } from '../../../store'
import { AssignmentModal } from '../components/AssignmentModal'
import { EquipmentRequirement } from '../types'
import ErrorMessageModal from 'src/components/ErrorMessageModal'
import ConfirmDialog from '../../../components/ConfirmationModal';
import SuccessMessageModal from 'src/components/SuccessMessageModal'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilPencil, cilSearch, cilPlus } from '@coreui/icons'
import { MODULE_EQUIPMENT_REQUEST } from 'src/constants/modules'
import { permissionService, UPDATE, CREATE, DELETE, READ } from '../../../services/auth/permission.service'


// Permission checks
const canCreate = permissionService.checkPermission(MODULE_EQUIPMENT_REQUEST, CREATE);
const canUpdate = permissionService.checkPermission(MODULE_EQUIPMENT_REQUEST, UPDATE);
const canDelete = permissionService.checkPermission(MODULE_EQUIPMENT_REQUEST, DELETE);
const canRead = permissionService.checkPermission(MODULE_EQUIPMENT_REQUEST, READ);

export default function EquipmentRequestListPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const { requirements, loading, error } = useSelector((state: RootState) => state.equipmentRequest);
  const [assignOpen, setAssignOpen] = useState(false)
  const [errorOpen, setErrorOpen] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDialog, setShowDialog] = useState(false);
    const [dialogOptions, setDialogOptions] = useState({
      title: "",
      message: "Are you sure you want to delete this record?",
      onConfirm: null as null | (() => void)
    });

  useEffect(() => {
    dispatch(loadRequirementsList())
  }, [dispatch])

  useEffect(() => {
    if (error) setErrorOpen(true)
  }, [error])

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  setDialogOptions({ title, message, onConfirm });
  setShowDialog(true);
};

  const columns = useMemo(() => {
    return [
      { key: 'equipmentRequestId', label: 'Request ID' },
      { key: 'requestTypelabel', label: 'Request Type' },
      { key: 'workorderRefNumber', label: 'Work Order ID' },
      { key: 'containerlabel', label: 'Container' },
      { key: 'chassislabel', label: 'Chassis' },
      { key: 'gensetlabel', label: 'Genset' },
      { key: 'status', label: 'Status' },
      { key: 'clientName', label: 'Client' },
      { key: 'createDate', label: 'Creation Date' },
      { key: 'actions', label: 'Actions', sorter: false, filter: false },
    ]
  }, [])

  return (
    <CContainer fluid>
      <PageHero
        kicker="Depot"
        icon="cilTruck"
        title="Equipment Requests / Bookings"
        subtitle="Manage requirements and bookings"
        actions={ 
          canCreate && 
            <CButton color="primary" className="text-white" onClick={() => navigate('/depot-main/equipment-request/new')}>
              <CIcon icon={cilPlus} className="me-2" />
              Add Request
            </CButton>
        }
      />

      <CCard className="mt-3">
        <CCardBody>
          <CSmartTable
            items={requirements}
            columns={columns as any}
            loading={loading.requirements}
            clickableRows
            columnFilter
            tableProps={{ responsive: true, striped: true, hover: true }}
            pagination
            itemsPerPage={10}
            itemsPerPageSelect
            scopedColumns={{
              actions: (item: EquipmentRequirement) => (
                <td>
                  <div className="d-flex gap-2">
                    { canRead && <CButton
                      size="sm"
                      color="info"
                      variant="ghost"
                      onClick={() => {
                        const id = item.equipmentRequestId ?? (item as any).equipmentRequest?.equipmentRequestId
                        navigate(`/depot-main/equipment-request/${id}?mode=view`)
                      }}
                      title="View"
                    >
                      <CIcon icon={cilSearch} />
                    </CButton>}
                    { canUpdate && <CButton
                      size="sm"
                      color="primary"
                      variant="ghost"
                      onClick={() => {
                        const id = item.equipmentRequestId ?? (item as any).equipmentRequest?.equipmentRequestId
                        if (id) navigate(`/depot-main/equipment-request/${id}`)
                      }}
                      title="Edit"
                    >
                      <CIcon icon={cilPencil} />
                    </CButton>}
                    { canDelete && <CButton
                      size="sm"
                      color="danger"
                      variant="ghost"
                      onClick={() => 
                        showConfirm("Delete Confirmation", "Are you sure you want to delete this record?", async() => {
                        const result = await dispatch(deleteRequirement(item.requestId as any))
                        console.log('DELETE result', result);
                      if (result?.meta?.requestStatus === 'fulfilled') {
                        setSuccessMessage("Request deleted successfully!");
                        setShowSuccessModal(true);
                      } else {
                        throw new Error('Failed to delete equipment request');
                      }
                      })}
                      title="Delete"
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>}
                    {/* <CButton size="sm" color="success" onClick={() => setAssignOpen(true)}>
                      Assign
                    </CButton> */}
                  </div>
                </td>
              ),
            }}
          />
        </CCardBody>
      </CCard>

      <AssignmentModal visible={assignOpen} onClose={() => setAssignOpen(false)} />
      
      <ErrorMessageModal
        showErrorModal={errorOpen}
        setShowErrorModal={setErrorOpen}
        errorMessage={error}
      />
      <ConfirmDialog
        visible={showDialog}
        title={dialogOptions.title}
        message={dialogOptions.message}
        onClose={() => setShowDialog(false)}
        onConfirm={dialogOptions.onConfirm || undefined}
      />
      <SuccessMessageModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        successMessage={successMessage}
    />
    </CContainer>
  )
}
