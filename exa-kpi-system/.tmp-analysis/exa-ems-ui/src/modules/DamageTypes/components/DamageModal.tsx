// src/modules/DamageTypes/components/DamageModal.tsx
import React, { useEffect, useState } from 'react'
import {
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
} from '@coreui/react-pro'
import * as Yup from 'yup'
import DamageForm, {
  DamageFormData,
  DamageFormErrors,
  EquipmentType,
} from './DamageForm'


const INVALID_CHARS_REGEX = /[?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]/

// Esquema de validación con Yup (equivalente al Joi viejo)
const schema = Yup.object().shape({
  equipmentTypeId: Yup.number()
    .typeError('Equipment Type is required')
    .required('Equipment Type is required'),

  damageName: Yup.string()
    .trim()
    .min(3, 'Damage Name must be at least 3 characters')
    .max(45, 'Damage Name must be at most 45 characters')
    .test(
      'no-invalid-chars',
      'Damage Name contains invalid characters',
      (value) => !value || !INVALID_CHARS_REGEX.test(value),
    )
    .required('Damage Name is required'),

  description: Yup.string()
    .trim()
    .min(6, 'Description must be at least 6 characters')
    .max(255, 'Description must be at most 255 characters')
    .test(
      'no-invalid-chars',
      'Description contains invalid characters',
      (value) => !value || !INVALID_CHARS_REGEX.test(value),
    )
    .required('Description is required'),

  code: Yup.string()
    .trim()
    .min(6, 'Code must be at least 6 characters')
    .max(10, 'Code must be at most 10 characters')
    .test(
      'no-invalid-chars',
      'Code contains invalid characters',
      (value) => !value || !INVALID_CHARS_REGEX.test(value),
    )
    .required('Internal Code is required'),

  isoCode: Yup.string()
    .trim()
    .min(1, 'ISO Code must be at least 1 character')
    .max(6, 'ISO Code must be at most 6 characters')
    .test(
      'no-invalid-chars',
      'ISO Code contains invalid characters',
      (value) => !value || !INVALID_CHARS_REGEX.test(value),
    )
    .required('ISO Code is required'),
})

export interface DamageModalProps {
  isOpen: boolean
  /** objeto con info para cargar el daño (por ejemplo { damageId }) */
  data?: Partial<DamageFormData> & { damageId?: number }
  /** damage actual proveniente del store */
  damage: DamageFormData
  errors?: DamageFormErrors | false
  equipmentTypesList: EquipmentType[]

  // acciones (normalmente conectadas a Redux/slice)
  loadEquipmentTypesList: () => void
  loadDamage: (damage?: Partial<DamageFormData> & { damageId?: number }) => void
  saveDamage: (data: DamageFormData) => void
  toggleModal: (isOpen: boolean) => void
}

const DamageModal: React.FC<DamageModalProps> = (props) => {
  const {
    isOpen: isOpenProp,
    data: dataProp,
    damage: damageProp,
    errors: errorsProp,
    equipmentTypesList,
    loadDamage,
    saveDamage,
    toggleModal,
  } = props

  const [isOpen, setIsOpen] = useState<boolean>(isOpenProp)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [data, setData] = useState<DamageFormData>(damageProp || {})
  const [errors, setErrors] = useState<DamageFormErrors | false>(
    errorsProp || false,
  )

  // componentDidMount
  useEffect(() => {
    loadDamage(dataProp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // componentWillReceiveProps equivalente (solo para isOpen)
  useEffect(() => {
    if (isOpenProp !== isOpen) {
      setIsOpen(isOpenProp)

      if (isOpenProp) {
        loadDamage(dataProp)
        setIsLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpenProp])

  // sincronizar errores externos
  useEffect(() => {
    if (errorsProp !== undefined) {
      setErrors(errorsProp || false)
      setIsLoading(false)
    }
  }, [errorsProp])

  // sincronizar damage desde props
  useEffect(() => {
    setData(damageProp || {})
  }, [damageProp])

  // Validación usando Yup
  const validate = (formData: DamageFormData): boolean => {
    setErrors(false)

    try {
      schema.validateSync(formData, { abortEarly: false })
      return true
    } catch (validationError: any) {
      const formattedErrors: DamageFormErrors = {}

      if (validationError.inner && Array.isArray(validationError.inner)) {
        validationError.inner.forEach((err: any) => {
          if (err.path) {
            formattedErrors[err.path] = err.message
          }
        })
      } else if (validationError.path) {
        formattedErrors[validationError.path] = validationError.message
      }

      setErrors(formattedErrors)
      return false
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleClose = () => {
    setErrors(false)
    toggleModal(false)
  }

  const handleSave = () => {
    const formData: DamageFormData = { ...data }
    if (validate(formData)) {
      setIsLoading(true)
      saveDamage(formData)
      handleClose()
      setIsLoading(false)
    }
  }

  return (
    <CModal
      visible={isOpen}
      onClose={handleClose}
      alignment="center"
      className="modal-primary"
    >
      <CModalHeader onClose={handleClose}>Add Damage</CModalHeader>
      <CModalBody>
        <DamageForm
          errors={errors}
          data={data}
          onChange={handleChange}
          list={equipmentTypesList}
        />
      </CModalBody>
      <CModalFooter>
        <CButton onClick={handleClose} color="secondary" variant="outline">
          Close
        </CButton>
        <CButton color="primary" onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default DamageModal
