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
import { cilSave, cilDescription } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import FuelOrderPdfConfigForm, { type FuelOrderPdfConfigFormValue } from '../components/FuelOrderPdfConfigForm'

import {
  addPdfConfig,
  fetchPdfConfigs,
  loadDefaultPdfConfig,
  loadPdfConfigFromList,
  savePdfConfig,
  selectPdfConfig,
  selectPdfConfigSaving,
} from '../store/fuelOrderPdfConfig.slice'

const schema = Yup.object({
  configName: Yup.string()
    .trim()
    .min(1, '* Config Name is required')
    .max(100, '* Config Name must be at most 100 characters')
    .required('* Config Name is required'),
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

const FuelOrderPdfConfigEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const saving = useSelector(selectPdfConfigSaving)
  const current = useSelector(selectPdfConfig)

  const [value, setValue] = useState<FuelOrderPdfConfigFormValue>({
    configName: '',
    subdivisionIds: [],
    fuelPriceEnabled: false,
    importEnabled: false,
    totalEnabled: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isEdit && editId) {
      dispatch(fetchPdfConfigs()).then(() => {
        dispatch(loadPdfConfigFromList(editId))
      })
    } else {
      dispatch(loadDefaultPdfConfig(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!current) return
    setValue({
      configName: current.configName ?? '',
      subdivisionIds: current.subdivisionIds ?? [],
      fuelPriceEnabled: current.fuelPriceEnabled ?? false,
      importEnabled: current.importEnabled ?? false,
      totalEnabled: current.totalEnabled ?? false,
    })
  }, [current])

  const setField = <K extends keyof FuelOrderPdfConfigFormValue>(field: K, v: FuelOrderPdfConfigFormValue[K]) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof FuelOrderPdfConfigFormValue) =>
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
      setTouched({ configName: true })

      const ok = await validate()
      if (!ok) return

      const payload: any = {
        configName: value.configName?.trim(),
        subdivisionIds: value.subdivisionIds,
        fuelPriceEnabled: value.fuelPriceEnabled,
        importEnabled: value.importEnabled,
        totalEnabled: value.totalEnabled,
      }
      if (isEdit && editId) payload.id = editId

      const result = isEdit
        ? await dispatch(savePdfConfig(payload))
        : await dispatch(addPdfConfig(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any)?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/fuel/settings/pdf-builder')
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
          kicker={isEdit ? 'Edit PDF Config' : 'Add PDF Config'}
          icon={cilDescription}
          title="PDF Builder"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>PDF Config Details</strong>
        </CCardHeader>

        <CCardBody>
          <FuelOrderPdfConfigForm
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
            onClick={() => navigate('/fuel/settings/pdf-builder')}
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

export default FuelOrderPdfConfigEditPage
