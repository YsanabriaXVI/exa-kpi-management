import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import * as Yup from 'yup'

import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilSave, cilList } from '@coreui/icons'

import type { AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import ErrorMessageModal from '../../../components/ErrorMessageModal'

import RepairStatusForm from '../components/RepairStatusForm'

import {
  addRepairStatus,
  saveRepairStatus,
  fetchRepairStatuses,
  loadDefaultRepairStatus,
  loadRepairStatusFromList,
  selectRepairStatusCurrent,
  selectRepairStatusLoading,
} from '../store/repairStatus.slice'

import type { RepairStatusFormValue } from '../types/repairStatus.types'
import { permissionService, CREATE, UPDATE } from '../../../services/auth/permission.service'
import { MODULE_REPAIR_STATUS } from '../../../constants/modules'


const allowed = /^[^?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]*$/

const schema = Yup.object({
  ISOCode: Yup.string()
    .trim()
    .min(1, '* required')
    .max(6, '* maximum 6 characters')
    .matches(allowed, '* invalid characters')
    .required('* status code is required'),

  description: Yup.string()
    .trim()
    .min(6, '* minimum 6 characters')
    .max(255, '* maximum 255 characters')
    .required('* description is required'),
})

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'

  if (typeof payload === 'string') return payload

  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }

  if (typeof payload?.message === 'string') {
    return payload.message
  }

  return 'Something went wrong!'
}

const RepairStatusEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const canCreate = permissionService.checkPermission(MODULE_REPAIR_STATUS, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_REPAIR_STATUS, UPDATE)

  const saving = useSelector(selectRepairStatusLoading)
  const current = useSelector(selectRepairStatusCurrent)

  const [value, setValue] = useState<RepairStatusFormValue>({
    ISOCode: '',
    description: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isEdit && editId) {
      dispatch(fetchRepairStatuses()).then(() => {
        dispatch(loadRepairStatusFromList(editId))
      })
    } else {
      dispatch(loadDefaultRepairStatus())
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!current) return
    setValue({
      repairStatusId: current.repairStatusId,
      ISOCode: current.ISOCode ?? '',
      description: current.description ?? '',
    })
  }, [current])

  useEffect(() => {
    if (!isEdit && !canCreate) {
      navigate('/depot/repair-status')
      return
    }

    if (isEdit && !canUpdate) {
      navigate('/depot/repair-status')
    }
  }, [isEdit, canCreate, canUpdate, navigate])

  const setField = (field: keyof RepairStatusFormValue, v: any) => {
    setValue((prev) => ({ ...prev, [field]: v }))

    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[field]
        return copy
      })
    }
  }

  const hasError = (field: keyof RepairStatusFormValue) =>
    !!touched[field] && !!errors[field]

  const validate = async () => {
    try {
      setErrors({})
      await schema.validate(value, { abortEarly: false })
      return true
    } catch (err: any) {
      const formatted: Record<string, string> = {}
      ;(err?.inner ?? []).forEach((e: any) => {
        if (e?.path) formatted[e.path] = e.message
      })
      setErrors(formatted)
      return false
    }
  }

  const handleSave = async () => {
    try {
      setTouched({
        ISOCode: true,
        description: true,
      })

      const ok = await validate()
      if (!ok) return

      const payload = {
        ...value,
        ISOCode: value.ISOCode.trim().toUpperCase(),
      }

      const result = isEdit && editId
        ? await dispatch(saveRepairStatus({ ...payload, repairStatusId: editId }))
        : await dispatch(addRepairStatus(payload as any))

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any)?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/depot/repair-status')
        return
      }

      throw new Error(getErrorMessage((result as any)?.payload))
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err))
      setShowErrorModal(true)
    }
  }

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Repair Status' : 'Add Repair Status'}
          icon={cilList}
          title="Repair Status"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader>
          <strong>Repair Status Details</strong>
        </CCardHeader>

        <CCardBody>
          <RepairStatusForm
            value={value}
            disabled={saving}
            errors={errors}
            touched={touched}
            setTouched={setTouched}
            setField={setField}
            hasError={hasError}
          />
        </CCardBody>

        <CCardFooter className="d-flex justify-content-between">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate('/depot/repair-status')}
            disabled={saving}
          >
            Cancel
          </CButton>

          <CButton
            color="primary"
            className="text-white"
            onClick={handleSave}
            disabled={saving || (isEdit ? !canUpdate : !canCreate)}
          >
            <CIcon icon={cilSave} className="me-2" />
            {saving ? 'Saving...' : 'Save'}
          </CButton>
        </CCardFooter>
      </CCard>

      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </CContainer>
  )
}

export default RepairStatusEditPage
