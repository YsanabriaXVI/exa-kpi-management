// src/modules/EquipmentSize/pages/EquipmentSizeEditPage.tsx

import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
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
import { cilSave, cilTruck, cilArrowThickFromRight } from '@coreui/icons'

import { set, type AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'
import ErrorMessageModal from '../../../components/ErrorMessageModal'
import SuccesModalWithActions from 'src/components/SuccesModalWithActions'

import EquipmentSizeForm, {
  EquipmentSizeFormValue,
} from '../components/EquipmentSizeForm'

import {
  addEquipmentSize,
  saveEquipmentSize,
  fetchEquipmentSizeById,
  loadDefaultEquipmentSize,
  loadEquipmentTypes,
  loadAxles,
  selectEquipmentSizeCurrent,
  selectEquipmentSizeSaving,
  selectEquipmentTypesList,
  selectAxlesList,
  fetchEquipmentSizes,
  selectEquipmentSizesList
} from '../store/equipmentSize.slice'

/* ---------- helpers ---------- */

const allowed = /^[^?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]*$/

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

/* ---------- validation ---------- */

const baseSchema = {
  equipmentTypeId: Yup.string().required('* equipment type is required'),
  sizeType: Yup.string()
    .trim()
    .min(1, '* required')
    .max(45, '* maximum 45 characters')
    .matches(allowed, '* invalid characters')
    .required('* size is required'),
  description: Yup.string()
    .trim()
    .min(3, '* minimum 3 characters')
    .max(255, '* maximum 255 characters')
    .required('* description is required'),
}

const chassisExtraSchema = {
  axieId: Yup.string().required('* number of axles is required'),
}

/* ---------- component ---------- */

const EquipmentSizeEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const saving = useSelector(selectEquipmentSizeSaving)
  const current = useSelector(selectEquipmentSizeCurrent)
  const equipmentTypesList = useSelector(selectEquipmentTypesList)
  const axlesList = useSelector(selectAxlesList)
  const sizesList = useSelector(selectEquipmentSizesList);

  const location = useLocation()
  const viewMode = Boolean(location.state?.viewMode)

  const emptyFormValue: EquipmentSizeFormValue = {
  equipmentTypeId: '',
  sizeType: '',
  description: '',
  axieId: '',
  extendable: 0,
  fridge: 0,
  isoCode1: '',
  isoCode2: '',
  isoCode3: '',
  isoCode4: '',
  isoCode5: '',
  isoCode6: '',
  isoCode7: '',
  isoCode8: '',
  isoCode9: '',
  isoCode10: '',
  relatedSizes: [],
}

  const [value, setValue] = useState<EquipmentSizeFormValue>(emptyFormValue)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [savedSize, setSavedSize] = useState<any>('')

  /* ---------- effects ---------- */

  useEffect(() => {
    dispatch(loadEquipmentTypes())
    dispatch(loadAxles())
    dispatch(fetchEquipmentSizes())

    if (isEdit && editId) {
      dispatch(fetchEquipmentSizeById(editId))
    } else {
      dispatch(loadDefaultEquipmentSize(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
  if (!current) return

  // Ignore stale edit record when entering create page
  if (!isEdit && current.sizeEquipmentId) return

  // Ignore wrong record while switching between edit ids
  if (isEdit && editId && current.sizeEquipmentId && current.sizeEquipmentId !== editId) return

  setValue({
    equipmentTypeId: current.equipmentTypeId ?? '',
    sizeType: current.sizeType ?? '',
    description: current.description ?? '',
    axieId: current.axieId ?? '',
    extendable: current.extendable ?? 0,
    fridge: current.fridge ?? 0,
    isoCode1: current.isoCode1 ?? '',
    isoCode2: current.isoCode2 ?? '',
    isoCode3: current.isoCode3 ?? '',
    isoCode4: current.isoCode4 ?? '',
    isoCode5: current.isoCode5 ?? '',
    isoCode6: current.isoCode6 ?? '',
    isoCode7: current.isoCode7 ?? '',
    isoCode8: current.isoCode8 ?? '',
    isoCode9: current.isoCode9 ?? '',
    isoCode10: current.isoCode10 ?? '',
    relatedSizes:
      current?.EqSizeRelationships?.map((x: any) => String(x.relatedSizeId)) ?? [],
  })
}, [current, isEdit, editId])

  /* ---------- helpers ---------- */
  const isChassis = (equipmentTypeId?: string | number) => {
    if (!equipmentTypeId) return false
    const id = Number(equipmentTypeId)
    const found = equipmentTypesList.find(
      (x) => x.equipmentTypeId === id,
    )
    return found?.equipmentName?.toLowerCase() === 'chassis'
  }

  const isContainer = (equipmentTypeId?: string | number) => {
    if (!equipmentTypeId) return false
    const id = Number(equipmentTypeId)
    const found = equipmentTypesList.find(
      (x) => x.equipmentTypeId === id,
    )
    return found?.equipmentName?.toLowerCase() === 'container'
  }

  const equipmentTypeOptions = useMemo(() => {
    return equipmentTypesList
      .filter((x) => x.equipmentName.toLowerCase() !== 'genset')
      .map((x) => ({
        label: x.equipmentName,
        value: String(x.equipmentTypeId),
      }))
  }, [equipmentTypesList])

  const axlesOptions = useMemo(() => {
    return (axlesList ?? [])
      .filter((x) => x.name?.toLowerCase() !== 'no axis')
      .map((x) => ({
        label: x.name,
        value: String(x.attributeItemId),
      }))
  }, [axlesList])

  const sizeOptions = useMemo(() => {
    return (sizesList ?? [])
      .filter((x) => x?.equipmentTypeId !== Number(value.equipmentTypeId))
      .map((x) => ({
        label: `${x?.equipmentTypedId?.equipmentName}, ${x?.sizeType}`, 
        value: String(x?.sizeEquipmentId),
      }))
  }, [sizesList, value.equipmentTypeId])

  const setField = (field: keyof EquipmentSizeFormValue, v: any) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof EquipmentSizeFormValue) =>
    !!touched[field] && !!errors[field]

  const validate = async () => {
    try {
      setErrors({})

      const schema = Yup.object(
        isChassis(value.equipmentTypeId)
          ? { ...baseSchema, ...chassisExtraSchema }
          : baseSchema,
      )

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

  /* ---------- save ---------- */

  const handleSave = async () => {
    try {
      setTouched({
        equipmentTypeId: true,
        sizeType: true,
        description: true,
        axieId: true,
      })

      const ok = await validate()
      if (!ok) return

      console.log('save payload', value)
      const payload: any = {
        ...value,
        equipmentTypeId: Number(value.equipmentTypeId),
        extendable: value.extendable ? 1 : 0,
      }

      // Si NO es chassis → limpiamos campos
      if (!isChassis(value.equipmentTypeId)) {
        payload.axieId = null
        payload.extendable = 0
      } else {
        payload.axieId = Number(value.axieId)
      }

      if (isEdit && editId) payload.sizeEquipmentId = editId

      const result = isEdit
        ? await dispatch(saveEquipmentSize(payload))
        : await dispatch(addEquipmentSize(payload))

        console.log('save result', result)

      if (result.meta.requestStatus === 'rejected') {
        setErrorMessage(getErrorMessage((result as any).payload))
        setShowErrorModal(true)
        return
      }

      if (result.meta.requestStatus === 'fulfilled') {
        setSavedSize((result as any).payload)
        setShowSuccessModal(true);
        return
      }

      throw new Error(getErrorMessage((result as any).payload))
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err?.message || err))
      setShowErrorModal(true)
    }
  }

  /* ---------- render ---------- */

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Equipment Size' : 'Add Equipment Size'}
          icon={cilTruck}
          title="Equipment Size"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader>
          <strong>Equipment Size Details</strong>
        </CCardHeader>

        <CCardBody>
          <EquipmentSizeForm
            value={value}
            disabled={saving || viewMode}
            errors={errors}
            touched={touched}
            setTouched={setTouched}
            setField={setField}
            hasError={hasError}
            equipmentTypeOptions={equipmentTypeOptions}
            axlesOptions={axlesOptions}
            isChassis={isChassis}
            isContainer={isContainer}
            sizeOptions={sizeOptions as any}
          />
          <SuccesModalWithActions
                isEdit={isEdit}
                showSuccessModal={showSuccessModal}
                setShowSuccessModal={setShowSuccessModal}
                savedData={savedSize}
                recordIdKey="sizeEquipmentId"
                successMessage={`Size has been ${isEdit ? 'updated' : 'created'}`}
                onClickCreateAnother={() => {
                  setShowSuccessModal(false)
                  setSavedSize(null)
                  dispatch(loadDefaultEquipmentSize())
                }}
                onClickContinueEditing={() => {
                  setShowSuccessModal(false)
                  navigate(`/depot/equipment-size/${savedSize?.sizeEquipmentId}`)
                }}
                onClickBackToOverview={() => navigate("/depot/equipment-size")}
              />
        </CCardBody>
          <CCardFooter>
            <CButton color="secondary" className="text-white" 
              onClick={() => navigate("/depot/equipment-size")}>
              <CIcon icon={cilArrowThickFromRight} className="me-2" />
              Go Back
            </CButton>
            {!viewMode && 
            <CButton color="primary" className="text-white" onClick={handleSave} style={{marginLeft: "3px"}}>
              <CIcon icon={cilSave} className="me-2" />
              Save Size
            </CButton> 
            } 
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

export default EquipmentSizeEditPage
