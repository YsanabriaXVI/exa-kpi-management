// src/modules/DamageTypes/pages/DamageTypesListPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CContainer,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
} from '@coreui/react-pro'
import { CSmartTable } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilWarning, cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import DamageModalContainer from '../components/DamageModalContainer'
import type { AppDispatch } from '../../../store'
import { useNavigate } from 'react-router-dom'
import {
  fetchDamageTypes,
  deleteDamage,
  resetStatuses,
  selectDamageTypesList,
  selectDamageTypesErrors,
  selectDamageTypesStatuses,
} from '../store/damageTypes.slice'
import type { DamageType } from '../types/damageTypes.types'
import ConfirmDialog from '../../../components/ConfirmationModal'
import { permissionService, CREATE, UPDATE, DELETE } from '../../../services/auth/permission.service'
import { MODULE_DAMAGE_TYPES } from '../../../constants/modules'

const DamageTypesListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const list = useSelector(selectDamageTypesList)
  const errors = useSelector(selectDamageTypesErrors)
  const statuses = useSelector(selectDamageTypesStatuses)

  const [showModal, setShowModal] = useState(false)
  const [selectedDamageId, setSelectedDamageId] = useState<number | undefined>()
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const handleOpenNew = () => {
    if (!canCreate) return
    navigate('/depot/damage-types/new')
  }

  const handleOpenEdit = (id: number) => {
    if (!canUpdate) return
    navigate(`/depot/damage-types/${id}`)
  }

  const canCreate = permissionService.checkPermission(MODULE_DAMAGE_TYPES, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_DAMAGE_TYPES, UPDATE)
  const canDelete = permissionService.checkPermission(MODULE_DAMAGE_TYPES, DELETE)

  // Cargar lista al montar
  useEffect(() => {
    dispatch(fetchDamageTypes())
  }, [dispatch])

  // Manejo de errores (equivalente a AddErrorMessage)
  useEffect(() => {
    if (!errors) return

    let err: unknown = errors
    if (typeof errors === 'object' && (errors as any).message) {
      err = (errors as any).message
    } else if (Array.isArray(errors) && errors.length === 1) {
      err = (errors[0] as any).message ?? errors[0]
    }

    const message = typeof err === 'string' ? err : 'An error occurred loading Damage Types'

    const toast = (window as any).exaToast
    if (toast?.error) {
      toast.error('Error', message)
    } else {
      console.error('DamageTypes error:', message)
    }
  }, [errors])

  // Manejo de statuses (equivalente a AddSuccessMessage + resetStatuses + reload)
  useEffect(() => {
    if (!statuses) return

    const toast = (window as any).exaToast
    const showSuccess = (msg: string) => {
      if (toast?.success) {
        toast.success('Success', msg)
      } else {
        console.log('[SUCCESS]', msg)
      }
    }

    if (statuses.deleted) {
      showSuccess('Damage Type was Deleted')
    } else if (statuses.updated) {
      showSuccess('Damage Type was Updated')
    } else if (statuses.added) {
      showSuccess('Damage Type was Added')
    }

    if (statuses.added || statuses.updated || statuses.deleted) {
      dispatch(resetStatuses())
      dispatch(fetchDamageTypes())
    }
  }, [statuses, dispatch])

  // Handlers de acciones
  // const handleOpenNew = () => {
  //   setSelectedDamageId(undefined)
  //   setShowModal(true)
  // }

  // const handleOpenEdit = (id: number) => {
  //   setSelectedDamageId(id)
  //   setShowModal(true)
  // }

  const handleDelete = (id: number) => {
    if (!canDelete) return
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteId) return
    await dispatch(deleteDamage(pendingDeleteId))
  }

  const toggleModal = (open: boolean) => {
    setShowModal(open)
    if (!open) {
      setSelectedDamageId(undefined)
    }
  }

  // Adaptamos los items para la tabla (equipmentTyped.equipmentName → equipmentTypeName)
  const tableItems = useMemo(() => {
    return (list as (DamageType & { equipmentTyped?: { equipmentName?: string } })[]).map(
      (item) => ({
        ...item,
        equipmentTypeName: item.equipmentTyped?.equipmentName ?? '',
      }),
    )
  }, [list])

  // Columnas para CSmartTable (equivalente a initColumns + Column)
  const columns = [
    {
      key: 'damageName',
      label: 'Damage Name',
      _props: { scope: 'col' },
    },
    {
      key: 'equipmentTypeName',
      label: 'Equipment Type',
    },
    {
      key: 'description',
      label: 'Description',
    },
    {
      key: 'code',
      label: 'Internal Code',
    },
    {
      key: 'isoCode',
      label: 'ISO Code',
    },
    {
      key: 'actions',
      label: 'Actions',
      sorter: false,
      filter: false,
    },
  ]

  const renderActions = (item: any) => {
    return (
      <div className="action-buttons">
        {canUpdate && (
          <CButton
            color="primary"
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(item.damageId)}
            title="Edit"
          >
            <CIcon icon={cilPencil} />
          </CButton>
        )}

        {canDelete && (
          <CButton
            color="danger"
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(item.damageId)}
            title="Delete"
          >
            <CIcon icon={cilTrash} />
          </CButton>
        )}

        {!canUpdate && !canDelete && (
          <span className="text-muted">No actions available</span>
        )}
      </div>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Damage Types"
        icon={cilWarning}
        title="Damage Types"
        actions={
          canCreate ? (
            <CButton color="primary" className="text-white" onClick={handleOpenNew}>
              <CIcon icon={cilPlus} className="me-2" />
              New Damage
            </CButton>
          ): null
        }
      />

      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <span>
            <strong>Damage Types</strong>
          </span>
        </CCardHeader>
        <CCardBody>
          <CSmartTable
            items={tableItems}
            columns={columns}
            itemsPerPage={15}
            pagination
            columnSorter
            columnFilter
            tableProps={{
              hover: true,
              responsive: true,
            }}
            scopedColumns={{
              actions: (item: any) => <td>{renderActions(item)}</td>,
            }}
          />
        </CCardBody>
      </CCard>

      <DamageModalContainer
        data={{ damageId: selectedDamageId }}
        isOpen={showModal}
        toggleModal={toggleModal}
      />
      <ConfirmDialog
        visible={confirmVisible}
        title="Delete Confirmation"
        message="Are you sure you want to delete this record?"
        onClose={() => {
          setConfirmVisible(false)
          setPendingDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </CContainer>
  )
}

export default DamageTypesListPage
