// src/modules/MaterialTypes/pages/MaterialTypesEditPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import PageHero from '../../../components/PageHero'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilSave, cilInbox } from '@coreui/icons'
import * as Yup from 'yup'
import type { AppDispatch } from '../../../store'
import ErrorMessageModal from '../../../components/ErrorMessageModal'

import {
  addMaterialType,
  clearCurrent,
  fetchEquipmentTypes,
  fetchMaterialTypeById,
  fetchMaterialTypes,
  selectMaterialCurrent,
  selectMaterialEquipmentTypes,
  selectMaterialSaving,
  updateMaterialType,
} from '../store/materialTypes.slice'
import {
  CButton,
  CCardHeader,
  CCard,
  CCardBody,
  CCardFooter,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'

const allowedChars = /^[^?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]*$/

const schema = Yup.object({
  equipmentTypeId: Yup.string().required('* equipment type is required'),
  name: Yup.string()
    .trim()
    .min(3, '* name must be at least 3 characters')
    .max(45, '* name must be at most 45 characters')
    .matches(allowedChars, '* invalid characters')
    .required('* name is required'),
  description: Yup.string()
    .trim()
    .min(6, '* description must be at least 6 characters')
    .max(255, '* description must be at most 255 characters')
    .matches(allowedChars, '* invalid characters')
    .required('* description is required'),
  code: Yup.string()
    .trim()
    .min(6, '* code must be at least 6 characters')
    .max(10, '* code must be at most 10 characters')
    .matches(allowedChars, '* invalid characters')
    .required('* code is required'),
  isoCode: Yup.string()
    .trim()
    .min(1, '* iso code is required')
    .max(6, '* iso code must be at most 6 characters')
    .matches(allowedChars, '* invalid characters')
    .required('* iso code is required'),
})

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'

  // string directo
  if (typeof payload === 'string') return payload

  // backend: [{ message }]
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }

  // backend: { message }
  if (typeof payload?.message === 'string') {
    return payload.message
  }

  return 'Something went wrong!'
}


const MaterialTypesEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const current = useSelector(selectMaterialCurrent)
  const equipmentTypesList = useSelector(selectMaterialEquipmentTypes)
  const saving = useSelector(selectMaterialSaving)

  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')


  // carga inicial (igual patrón a DamageTypesEditPage)
  useEffect(() => {
    dispatch(fetchEquipmentTypes())

    if (isEdit && editId) {
      dispatch(fetchMaterialTypes()).then(() => dispatch(fetchMaterialTypeById(editId)))
    } else {
      dispatch(clearCurrent())
      setFormData({
        equipmentTypeId: '',
        name: '',
        description: '',
        code: '',
        isoCode: '',
        status: 1,
        active: 1,
      })
      setErrors({})
    }

    return () => {
      dispatch(clearCurrent())
    }
  }, [dispatch, isEdit, editId])

  // sync store -> local form
  useEffect(() => {
    if (!current) return
    setFormData({
      ...current,
      equipmentTypeId: current.equipmentTypeId ? String(current.equipmentTypeId) : '',
    })
  }, [current])

  const handleChange = (e: any, name: string) => {
    const { value } = e.target
    const nextValue = name === 'isoCode' ? String(value).toUpperCase() : value
    setFormData((prev: any) => ({ ...prev, [name]: nextValue }))

    if (errors?.[name]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[name]
        return copy
      })
    }
  }

  const validateForm = async (data: any): Promise<boolean> => {
    try {
      setErrors({})
      await schema.validate(
        {
          ...data,
          equipmentTypeId: data.equipmentTypeId ? String(data.equipmentTypeId) : '',
        },
        { abortEarly: false },
      )
      return true
    } catch (err: any) {
      const formatted: Record<string, string> = {}
      if (err?.inner) {
        err.inner.forEach((e: any) => {
          if (e?.path && !formatted[e.path]) formatted[e.path] = e.message
        })
      }
      setErrors(formatted)
      return false
    }
  }

  // --- CMultiSelect helpers (copiados del patrón DamageTypesEditPage) ---
  const buildEquipmentTypeOptions = (list: any[]) =>
    (list || []).map((item) => ({
      label: item.equipmentName,
      value: item.equipmentTypeId.toString(),
    }))

  const toSelectValue = (val?: number | string) => {
    if (val === undefined || val === null || val === '') return []
    return [val.toString()]
  }

  const equipmentOptions = useMemo(
    () => buildEquipmentTypeOptions(equipmentTypesList || []),
    [equipmentTypesList],
  )

  const handleSubmit = async () => {
    try {
      const valid = await validateForm(formData)
      if (!valid) return

      const payload = {
        ...formData,
        equipmentTypeId: formData.equipmentTypeId
          ? Number(formData.equipmentTypeId)
          : undefined,
      }

      const result = isEdit && editId
        ? await dispatch(updateMaterialType({ id: editId, form: payload }))
        : await dispatch(addMaterialType(payload))

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any)?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/depot/material-types')
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
          kicker={isEdit ? 'Edit Material Type' : 'Add Material Type'}
          icon={cilInbox}
          title="Material Types"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <span>
            <strong>Material Types Details</strong>
          </span>
        </CCardHeader>

        <CCardBody>
          <CRow className="g-3">
            {/* LEFT */}
            <CCol md={6}>
              <CForm>
                <CFormInput
                  type="text"
                  label="Name"
                  size="lg"
                  onChange={(e) => handleChange(e, 'name')}
                  value={formData.name ?? ''}
                  invalid={!!errors.name}
                  feedbackInvalid={errors.name}
                />

                <CMultiSelect
                  id="equipmentTypeId"
                  label="Equipment Type"
                  size="lg"
                  options={equipmentOptions}
                  multiple={false}
                  placeholder="Pick Equipment Type"
                  search
                  className={errors?.equipmentTypeId ? 'is-invalid' : undefined}
                  value={toSelectValue(formData?.equipmentTypeId)}
                  onChange={(selected) => {
                    const value = selected?.[0]?.value // string
                    setFormData((prev: any) => ({
                      ...prev,
                      equipmentTypeId: value ?? '',
                    }))

                    if (errors?.equipmentTypeId) {
                      setErrors((prev) => {
                        const copy = { ...prev }
                        delete copy.equipmentTypeId
                        return copy
                      })
                    }
                  }}
                />
                {errors?.equipmentTypeId && (
                  <div className="invalid-feedback d-block">{errors.equipmentTypeId}</div>
                )}
              </CForm>
            </CCol>

            {/* RIGHT */}
            <CCol md={6}>
              <CForm>
                <CFormInput
                  type="text"
                  label="Description"
                  size="lg"
                  onChange={(e) => handleChange(e, 'description')}
                  value={formData.description ?? ''}
                  invalid={!!errors.description}
                  feedbackInvalid={errors.description}
                />

                <CFormInput
                  type="text"
                  label="Internal Code"
                  size="lg"
                  onChange={(e) => handleChange(e, 'code')}
                  value={formData.code ?? ''}
                  invalid={!!errors.code}
                  feedbackInvalid={errors.code}
                />

                <CFormInput
                  type="text"
                  label="ISO Code"
                  size="lg"
                  onChange={(e) => handleChange(e, 'isoCode')}
                  value={formData.isoCode ?? ''}
                  invalid={!!errors.isoCode}
                  feedbackInvalid={errors.isoCode}
                />
              </CForm>
            </CCol>
          </CRow>
        </CCardBody>
        <CCardFooter className="d-flex justify-content-end gap-2">
          <CButton color="secondary" variant="outline" onClick={() => navigate('/depot/material-types')} disabled={saving}>
            Cancel
          </CButton>

          <CButton color="primary" className="text-white" onClick={handleSubmit} disabled={saving}>
            <CIcon icon={cilSave} className="me-2" />
            Save
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

export default MaterialTypesEditPage
