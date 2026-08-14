import React, { useEffect, useMemo, useState } from 'react'
import PageHero from '../../../components/PageHero'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilSave, cilWarning } from '@coreui/icons'
import type { AppDispatch, RootState } from '../../../store'
import {
  loadDamageFromList,
  loadDefaultDamage,
  fetchDamageTypes, // para cuando entras directo por URL y la lista aún no está
  addDamage,
  saveDamage,
  loadEquipmentTypes,
  selectDamageTypesCurrent,
  selectEquipmentTypesList,
  selectDamageTypesSaving,
} from '../store/damageTypes.slice'

import * as Yup from 'yup'
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
  CFormLabel,
  CFormSelect,
  CMultiSelect,
  CRow,
} from '@coreui/react-pro'

const allowedName = /^[^?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]*$/

const schema = Yup.object({
  equipmentTypeId: Yup.string().required('* equipment type is required'),
  damageName: Yup.string()
    .trim()
    .min(3, '* name must be at least 3 characters')
    .max(45, '* name must be at most 45 characters')
    .matches(allowedName, '* invalid characters')
    .notRequired(),
  description: Yup.string()
    .trim()
    .min(6, '* description must be at least 6 characters')
    .max(255, '* description must be at most 255 characters')
    .required('* description is required'),
  code: Yup.string()
    .trim()
    .min(6, '* code must be at least 6 characters')
    .max(10, '* code must be at most 10 characters')
    .required('* code is required'),
  isoCode: Yup.string()
    .trim()
    .min(1, '* iso code is required')
    .max(6, '* iso code must be at most 6 characters')
    .required('* iso code is required'),
})

const DamageTypesEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const damage = useSelector(selectDamageTypesCurrent)
  const equipmentTypesList = useSelector(selectEquipmentTypesList)
  const saving = useSelector(selectDamageTypesSaving)

  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<any>({})

  // carga inicial
  useEffect(() => {
    dispatch(loadEquipmentTypes())

    if (isEdit && editId) {
      dispatch(fetchDamageTypes()).then(() => dispatch(loadDamageFromList(editId)))
    } else {
      dispatch(loadDefaultDamage(undefined))
    }
  }, [dispatch, isEdit, editId])

  // sync store -> local form
  useEffect(() => {
    if (!damage) return
    setFormData(damage)
  }, [damage])

  const handleChange = (e: any, name: string) => {
    const { value } = e.target
    setFormData((prev: any) => ({ ...prev, [name]: value }))
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
      if (err.inner) {
        err.inner.forEach((e: any) => {
          formatted[e.path] = e.message
        })
      }
      setErrors(formatted)
      return false
    }
  }

  const buildEquipmentTypeOptions = (list: any[]) =>
    list.map((item) => ({
      label: item.equipmentName,
      value: item.equipmentTypeId.toString(),
    }))

  const toSelectValue = (id?: number | string) => {
    if (id === undefined || id === null || id === '') return []
    return [id.toString()]
  }

  const handleSubmit = async () => {
    const valid = await validateForm(formData)
    if (!valid) return

    const payload = {
      ...formData,
      equipmentTypeId: formData.equipmentTypeId ? Number(formData.equipmentTypeId) : undefined,
    }

    let result: any
    if (isEdit && id) {
      result = await dispatch(saveDamage(payload))
    } else {
      result = await dispatch(addDamage(payload))
    }

    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/depot/damage-types')
    } else {
      const msg = result.payload || 'Failed to save damage type'
      alert(`Error: ${msg}`)
    }
  }

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Damage Type' : 'Add Damage Type'}
          icon={cilWarning}
          title="Damage Types"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <span>
            <strong>Damage Types Details</strong>
          </span>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={6}>
              <CForm>
                <CFormInput
                  type="text"
                  label="Name"
                  size="lg"
                  onChange={(e) => handleChange(e, 'damageName')}
                  value={formData.damageName ?? ''}
                  invalid={!!errors.damageName}
                  feedbackInvalid={errors.damageName}
                />
                <CMultiSelect
                  id="equipmentTypeId"
                  label="Equipment Type"
                  size="lg"
                  options={buildEquipmentTypeOptions(equipmentTypesList)}
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
                  }}
                />
                {errors?.equipmentTypeId && (
                  <div className="invalid-feedback d-block">{errors.equipmentTypeId}</div>
                )}

              </CForm>
            </CCol>

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
          <CButton color="secondary" variant="outline" onClick={() => navigate('/depot/damage-types')}>
            Cancel
          </CButton>

          <CButton color="primary" className="text-white" onClick={handleSubmit} disabled={saving}>
            <CIcon icon={cilSave} className="me-2" />
            Save
          </CButton>
        </CCardFooter>
      </CCard>
    </CContainer>
  )
}

export default DamageTypesEditPage
