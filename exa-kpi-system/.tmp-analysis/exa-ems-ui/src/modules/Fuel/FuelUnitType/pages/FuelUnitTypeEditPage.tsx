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
import { cilSave, cilDrop } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import FuelUnitTypeForm, { type FuelUnitTypeFormValue } from '../components/FuelUnitTypeForm'

import {
  addFuelUnitType,
  fetchFuelUnitTypes,
  loadDefaultFuelUnitType,
  loadFuelUnitTypeFromList,
  saveFuelUnitType,
  selectFuelUnitType,
  selectFuelUnitTypeSaving,
} from '../store/fuelUnitType.slice'
import { permissionService, CREATE, UPDATE } from '../../../../services/auth/permission.service'
import { MODULE_FUEL_UNIT_TYPE } from '../../../../constants/modules'

const schema = Yup.object({
  name: Yup.string()
    .trim()
    .min(1, '* name is required')
    .max(100, '* name must be at most 100 characters')
    .required('* name is required'),
})

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }
  if (typeof payload?.message === 'string') return payload.message
  return 'Something went wrong!'
}

const FuelUnitTypeEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const saving = useSelector(selectFuelUnitTypeSaving)
  const fuelUnitType = useSelector(selectFuelUnitType)

  const canCreate = permissionService.checkPermission(MODULE_FUEL_UNIT_TYPE, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_FUEL_UNIT_TYPE, UPDATE)

  useEffect(() => {
    if ((isEdit && !canUpdate) || (!isEdit && !canCreate)) {
      navigate('/fuel/settings/fuel-unit-types')
    }
  }, [isEdit, canCreate, canUpdate, navigate])

  const [value, setValue] = useState<FuelUnitTypeFormValue>({ name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isEdit && editId) {
      dispatch(fetchFuelUnitTypes()).then(() => {
        dispatch(loadFuelUnitTypeFromList(editId))
      })
    } else {
      dispatch(loadDefaultFuelUnitType(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!fuelUnitType) return
    setValue({ name: fuelUnitType.name ?? '' })
  }, [fuelUnitType])

  const setField = (field: keyof FuelUnitTypeFormValue, v: string) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof FuelUnitTypeFormValue) =>
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
      setTouched({ name: true })

      const ok = await validate()
      if (!ok) return

      const payload: any = { name: value.name?.trim() }
      if (isEdit && editId) payload.unitTypeId = editId

      const result = isEdit
        ? await dispatch(saveFuelUnitType(payload))
        : await dispatch(addFuelUnitType(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any)?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/fuel/settings/fuel-unit-types')
        return
      }

      throw new Error(getErrorMessage((result as any)?.payload))
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err?.message || err))
      setShowErrorModal(true)
    }
  }

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Fuel Unit Type' : 'Add Fuel Unit Type'}
          icon={cilDrop}
          title="Fuel Unit Types"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Fuel Unit Type Details</strong>
        </CCardHeader>

        <CCardBody>
          <FuelUnitTypeForm
            value={value}
            disabled={saving}
            errors={errors}
            setTouched={setTouched}
            setField={setField}
            hasError={hasError}
          />
        </CCardBody>

        <CCardFooter className="d-flex justify-content-between">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate('/fuel/settings/fuel-unit-types')}
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

export default FuelUnitTypeEditPage
