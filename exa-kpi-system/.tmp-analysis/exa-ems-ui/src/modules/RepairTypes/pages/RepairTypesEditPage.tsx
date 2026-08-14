// src/modules/RepairTypes/pages/RepairTypesEditPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
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
import { cilSave, cilPaint } from '@coreui/icons'

import type { AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'

import RepairForm, { type RepairFormValue } from '../components/RepairForm'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import {
  addRepairType,
  fetchRepairTypes,
  loadDefaultRepair,
  loadRepairFromList,
  loadEquipmentTypes,
  saveRepairType,
  selectEquipmentTypesList,
  selectRepair,
  selectRepairSaving,
} from '../store/repairTypes.slice'

const allowed = /^[^?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]*$/

const schema = Yup.object({
  equipmentTypeId: Yup.string().required('* equipment type is required'),
  repairName: Yup.string()
    .trim()
    .min(3, '* minimum 3 characters')
    .max(45, '* maximum 45 characters')
    .matches(allowed, '* invalid characters')
    .required('* name is required'),
  description: Yup.string()
    .trim()
    .min(6, '* minimum 6 characters')
    .max(255, '* maximum 255 characters')
    .required('* description is required'),
  internalCode: Yup.string()
    .trim()
    .min(1, '* required')
    .max(6, '* maximum 6 characters')
    .required('* internal code is required'),
  ISOCode: Yup.string()
    .trim()
    .min(1, '* required')
    .max(6, '* maximum 6 characters')
    .matches(allowed, '* invalid characters')
    .required('* iso code is required'),
})

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'

  // Caso: string directo
  if (typeof payload === 'string') return payload

  // Caso backend: [{ message: '...' }]
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }

  // Caso backend: { message: '...' }
  if (typeof payload?.message === 'string') {
    return payload.message
  }

  return 'Something went wrong!'
}

const RepairTypesEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const saving = useSelector(selectRepairSaving)
  const repair = useSelector(selectRepair)
  const equipmentTypesList = useSelector(selectEquipmentTypesList)

  const [value, setValue] = useState<RepairFormValue>({
    equipmentTypeId: '',
    repairName: '',
    description: '',
    internalCode: '',
    ISOCode: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    dispatch(loadEquipmentTypes())

    if (isEdit && editId) {
      dispatch(fetchRepairTypes()).then(() => {
        dispatch(loadRepairFromList(editId))
      })
    } else {
      dispatch(loadDefaultRepair(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!repair) return
    setValue({
      equipmentTypeId: repair.equipmentTypeId ?? '',
      repairName: repair.repairName ?? '',
      description: repair.description ?? '',
      internalCode: repair.internalCode ?? '',
      ISOCode: repair.ISOCode ?? '',
    })
  }, [repair])

  const equipmentTypeOptions = useMemo(() => {
    return (equipmentTypesList ?? []).map((x) => ({
      label: x.equipmentName,
      value: String(x.equipmentTypeId),
    }))
  }, [equipmentTypesList])

  const setField = (field: keyof RepairFormValue, v: any) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof RepairFormValue) =>
    !!touched[field] && !!errors[field]

  const validate = async () => {
    try {
      setErrors({})
      await schema.validate(
        {
          ...value,
          equipmentTypeId: value.equipmentTypeId
            ? String(value.equipmentTypeId)
            : '',
        },
        { abortEarly: false },
      )
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
        equipmentTypeId: true,
        repairName: true,
        description: true,
        internalCode: true,
        ISOCode: true,
      })

      const ok = await validate()
      if (!ok) return

      const payload: any = {
        ...value,
        equipmentTypeId: parseInt(String(value.equipmentTypeId), 10),
        ISOCode: String(value.ISOCode ?? '').trim(),
      }

      if (isEdit && editId) payload.repairTypesId = editId

      const result = isEdit
        ? await dispatch(saveRepairType(payload))
        : await dispatch(addRepairType(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any)?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/depot/repair-types')
        return
      }

      throw new Error(getErrorMessage((result as any)?.payload))
    } catch (err: any) {
      setErrorMessage(
        getErrorMessage(err?.message || err)
      )
      setShowErrorModal(true)
    }
  }



  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Repair Type' : 'Add Repair Type'}
          icon={cilPaint}
          title="Repair Types"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Repair Type Details</strong>
        </CCardHeader>

        <CCardBody>
          <RepairForm
            value={value}
            disabled={saving}
            errors={errors}
            touched={touched}
            setTouched={setTouched}
            setField={setField}
            hasError={hasError}
            equipmentTypeOptions={equipmentTypeOptions}
          />
        </CCardBody>

        <CCardFooter className="d-flex justify-content-between">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate('/depot/repair-types')}
            disabled={saving}
          >
            Cancel
          </CButton>

          <CButton
            color="primary"
            className="text-white"
            onClick={handleSave}
            disabled={saving}
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

export default RepairTypesEditPage
