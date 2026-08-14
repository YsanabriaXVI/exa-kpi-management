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

import FuelTypeForm, { type FuelTypeFormValue } from '../components/FuelTypeForm'

import {
  addFuelType,
  fetchFuelTypes,
  loadDefaultFuelType,
  loadFuelTypeFromList,
  saveFuelType,
  selectFuelType,
  selectFuelTypeSaving,
} from '../store/fuelType.slice'

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

const FuelTypeEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const saving = useSelector(selectFuelTypeSaving)
  const fuelType = useSelector(selectFuelType)

  const [value, setValue] = useState<FuelTypeFormValue>({ name: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isEdit && editId) {
      dispatch(fetchFuelTypes()).then(() => {
        dispatch(loadFuelTypeFromList(editId))
      })
    } else {
      dispatch(loadDefaultFuelType(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!fuelType) return
    setValue({ name: fuelType.name ?? '' })
  }, [fuelType])

  const setField = (field: keyof FuelTypeFormValue, v: string) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof FuelTypeFormValue) =>
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
      if (isEdit && editId) payload.fuelTypeId = editId

      const result = isEdit
        ? await dispatch(saveFuelType(payload))
        : await dispatch(addFuelType(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any)?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/fuel/settings/fuel-types')
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
          kicker={isEdit ? 'Edit Fuel Type' : 'Add Fuel Type'}
          icon={cilDrop}
          title="Fuel Types"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Fuel Type Details</strong>
        </CCardHeader>

        <CCardBody>
          <FuelTypeForm
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
            onClick={() => navigate('/fuel/settings/fuel-types')}
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

export default FuelTypeEditPage
