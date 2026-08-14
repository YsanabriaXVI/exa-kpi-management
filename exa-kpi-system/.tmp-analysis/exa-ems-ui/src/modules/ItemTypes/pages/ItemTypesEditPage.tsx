// src/modules/ItemTypes/pages/ItemTypesEditPage.tsx
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

import ItemTypeForm, {
  type ItemTypeFormValue,
} from '../components/ItemTypeForm'

import {
  addItemType,
  fetchItemTypes,
  loadDefaultItem,
  loadItemFromList,
  saveItemType,
  selectItemTypeCurrent,
  selectItemTypesSaving,
} from '../store/itemTypes.slice'

import { permissionService, CREATE, UPDATE } from '../../../services/auth/permission.service'
import { MODULE_ITEM_TYPES, MODULE_REPAIR_STATUS } from '../../../constants/modules'

const allowed = /^[^?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]*$/

const schema = Yup.object({
  ISOCode: Yup.string()
    .trim()
    .min(1, '* required')
    .max(6, '* max 6 characters')
    .matches(allowed, '* invalid characters')
    .required('* iso code is required'),
  description: Yup.string()
    .trim()
    .min(6, '* minimum 6 characters')
    .max(255, '* maximum 255 characters')
    .matches(allowed, '* invalid characters')
    .required('* description is required'),
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

const ItemTypesEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Number.isFinite(Number(id))
  const editId = isEdit ? Number(id) : null

  const canCreate = permissionService.checkPermission(MODULE_ITEM_TYPES, CREATE)
  const canUpdate = permissionService.checkPermission(MODULE_ITEM_TYPES, UPDATE)

  const saving = useSelector(selectItemTypesSaving)
  const item = useSelector(selectItemTypeCurrent)

  const [value, setValue] = useState<ItemTypeFormValue>({
    ISOCode: '',
    description: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (isEdit && editId) {
      dispatch(fetchItemTypes()).then(() =>
        dispatch(loadItemFromList(editId)),
      )
    } else {
      dispatch(loadDefaultItem(undefined))
    }
  }, [dispatch, isEdit, editId])

  useEffect(() => {
    if (!item) return
    setValue({
      ISOCode: item.ISOCode ?? '',
      description: item.description ?? '',
    })
  }, [item])

  useEffect(() => {
    if (!isEdit && !canCreate) {
      navigate('/depot/repair-status')
      return
    }

    if (isEdit && !canUpdate) {
      navigate('/depot/repair-status')
    }
  }, [isEdit, canCreate, canUpdate, navigate])

  const setField = (field: keyof ItemTypeFormValue, v: any) => {
    setValue((prev) => ({ ...prev, [field]: v }))
  }

  const hasError = (field: keyof ItemTypeFormValue) =>
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
      setTouched({ ISOCode: true, description: true })

      const ok = await validate()
      if (!ok) return

      const payload: any = {
        ...value,
        ISOCode: value.ISOCode?.trim(),
      }

      if (isEdit && editId) payload.itemTypeId = editId

      const result = isEdit
        ? await dispatch(saveItemType(payload))
        : await dispatch(addItemType(payload))

      if (result.meta.requestStatus === 'rejected') {
        const msg = getErrorMessage((result as any).payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result.meta.requestStatus === 'fulfilled') {
        navigate('/depot/item-types')
      }
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err))
      setShowErrorModal(true)
    }
  }

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Item Type' : 'Add Item Type'}
          icon={cilList}
          title="Item Types"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader>
          <strong>Item Type Details</strong>
        </CCardHeader>

        <CCardBody>
          <ItemTypeForm
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
            onClick={() => navigate('/depot/item-types')}
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

export default ItemTypesEditPage
