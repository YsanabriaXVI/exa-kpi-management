import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CContainer,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CSmartTable,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilSearch, cilTrash } from '@coreui/icons'

import PageHero from 'src/components/PageHero'
import ErrorMessageModal from 'src/components/ErrorMessageModal'
import SuccessMessageModal from 'src/components/SuccessMessageModal'
import ConfirmDialog from '../../../components/ConfirmationModal'

import { set, type AppDispatch, type RootState } from '../../../store'
import type { GateListRow, GateType } from '../types'
import { clearError, deleteGate, loadGatesList, loadGateInList, loadGateOutList } from '../store/gates.slice'

const normalizeGateType = (t?: string): GateType | null => {
  const upper = (t ?? '').toUpperCase()
  if (upper === 'IN' || upper === 'OUT') return upper as GateType
  return null
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

export default function GatesListPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const location = useLocation().pathname;

  const { list, loading, error } = useSelector((state: RootState) => state.gates)

  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<GateListRow | null>(null)

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [gateType, setGateType] = useState(false as GateType | boolean)
  const noGateType = (gateType as string) !== 'IN' && (gateType as string) !== 'OUT';

  useEffect(() => {
    if (location.includes('gate-in')) {
      dispatch(loadGateInList())
      setGateType('IN')
    } else if (location.includes('gate-out')) {
      dispatch(loadGateOutList())
      setGateType('OUT')
    } else {
      dispatch(loadGatesList()) 
      setGateType(false)
    }
  }, [dispatch, location])

  useEffect(() => {
    if (error) {
      setErrorMessage(error)
      setShowErrorModal(true)
      dispatch(clearError())
    }
  }, [error, dispatch])

  const columns = useMemo(() => {
    return [
      { key: 'gateId', label: 'Gate ID' },
      { key: 'gateType', label: 'Type' },
      { key: 'equipmentTypeId', label: 'Equipment Type' },
      { key: 'ownedEquipment', label: 'Owned Equipment' },
      { key: 'equipmentId', label: 'Equipment' },
      { key: 'tripId', label: 'Trip #' },
      { key: 'truckId', label: 'Truck #' },
      { key: 'requestId', label: 'Request #' },
      { key: 'clientId', label: 'Client' },
      { key: 'createDate', label: 'Date' },
      { key: 'actions', label: 'Actions', sorter: false, filter: false },
    ]
  }, [])

  const onClickNew = () => {
    navigate(`/depot-main/gates/new/${gateType}`)
  }

  const onClickView = (row: GateListRow) => {
    const nextType = normalizeGateType(row.gateType) ?? gateType ?? 'IN'
    navigate(`/depot-main/gates/${row.gateId}/${nextType}`, { state: { viewMode: true } })
  }

  const askDelete = (row: GateListRow) => {
    setPendingDelete(row)
    setConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await dispatch(deleteGate(pendingDelete.gateId)).unwrap()
      setSuccessMessage(`Gate #${pendingDelete.gateId} deleted successfully.`)
      setShowSuccessModal(true)
    } catch (e: any) {
      setErrorMessage(typeof e === 'string' ? e : 'Failed to delete gate.')
      setShowErrorModal(true)
    } finally {
      setConfirmOpen(false)
      setPendingDelete(null)
    }
  }

const subtitle = useMemo(() => {
  if (gateType === 'IN') return 'Create, view, and delete gate-in records'
  if (gateType === 'OUT') return 'Create, view, and delete gate-out records'
  return 'All gate records overview'
}, [gateType])

  return (
    <CContainer fluid>
      <PageHero
        kicker="Depot"
        icon="cilTransfer"
        title={gateType ? `Gate ${gateType}s` : 'Gates'}
        subtitle={subtitle}
        actions={
           !noGateType && 
           <CButton color="primary" className="text-white" onClick={onClickNew}>
            <CIcon icon={cilPlus} className="me-2" />
            New Gate {gateType}
          </CButton>
        }
      />

      <CCard className="mt-3">
        <CCardBody>
          <div className="d-flex justify-content-end align-items-center mb-2 pe-1">
            <span className="me-2 text-body-secondary" style={{ fontSize: '0.9rem' }}>Items per page:</span>
            <CDropdown direction="dropup">
              <CDropdownToggle color="secondary" variant="outline" size="sm" style={{ minWidth: '5rem', fontSize: '0.9rem' }}>
                {itemsPerPage}
              </CDropdownToggle>
              <CDropdownMenu style={{ minWidth: '5rem', fontSize: '1rem' }}>
                {[5, 10, 20, 50, 100].map((n) => (
                  <CDropdownItem
                    key={n}
                    active={n === itemsPerPage}
                    onClick={() => setItemsPerPage(n)}
                    style={{ padding: '0.5rem 1.25rem', cursor: 'pointer' }}
                  >
                    {n}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>
          </div>
          {loading.list ? (
            <div className="d-flex align-items-center gap-2">
              <CSpinner size="sm" />
              <span>Loading...</span>
            </div>
          ) : (
            <CSmartTable
              items={list as any}
              columns={columns as any}
              clickableRows={false}
              columnFilter
              columnSorter
              itemsPerPage={itemsPerPage}
              itemsPerPageSelect={false}
              pagination
              scopedColumns={{
                createDate: (item: GateListRow) => <td>{formatDate(item.createDate)}</td>,
                actions: (item: GateListRow) => (
                  <td>
                    <div className="d-flex gap-2">
                      <CButton color="info" variant="outline" size="sm" onClick={() => onClickView(item)}>
                        <CIcon icon={cilSearch} />
                      </CButton>
                      <CButton color="danger" variant="outline" size="sm" onClick={() => askDelete(item)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </div>
                  </td>
                ),
              }}
            />
          )}
        </CCardBody>
      </CCard>

      <ConfirmDialog
        visible={confirmOpen}
        title="Delete Gate"
        message={
          pendingDelete
            ? `Are you sure you want to delete Gate #${pendingDelete.gateId}?`
            : 'Are you sure you want to delete this record?'
        }
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />

      <SuccessMessageModal
        showSuccessModal={showSuccessModal}
        setShowSuccessModal={setShowSuccessModal}
        successMessage={successMessage}
      />
    </CContainer>
  )
}
