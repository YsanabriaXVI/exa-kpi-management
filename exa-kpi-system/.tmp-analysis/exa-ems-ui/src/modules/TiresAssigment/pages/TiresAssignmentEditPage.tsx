// src/modules/TiresAssignment/pages/TiresAssignmentEditPage.tsx

import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { CButton, CCard, CCardBody, CCardFooter, CContainer } from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilAlbum } from '@coreui/icons'
import * as Yup from 'yup'

import PageHero from '../../../components/PageHero'
import ErrorMessageModal from '../../../components/ErrorMessageModal'
import type { AppDispatch } from '../../../store'

import {
  addTiresAssignment,
  clearCurrent,
  fetchTiresAssignmentById,
  fetchTiresCatalogs,
  selectTiresAssignmentCatalogs,
  selectTiresAssignmentCatalogsLoading,
  selectTiresAssignmentCurrent,
  selectTiresAssignmentSaving,
  updateTiresAssignment,
} from '../store/tiresAssignment.slice'

import TiresForm from '../components/TiresForm'
import TiresAssignmentComments from '../components/TiresComments'
import TiresAssignmentAttachments from '../components/TiresAttachments'

import type { TiresAssignmentForm } from '../types/tiresAssignment.types'

const currentYear = new Date().getFullYear()

const DAMAGED_STATUSES = ['Desinflada', 'Rota', 'Explotada', 'Desgastada', 'Damaged']

const initialHeader = {
  tiresId: undefined,
  tiresAssignId: undefined,
  serialNo: '',
  year: '',
  brand: '',
  brandId: '',
  brandName: '',
  depth: '',
  owner: true,
  tireTypeId: '',
  tireTypeName: '',
  assignedToId: '',
  positionId: '',
  categoryId: '',
  statusId: '',
  statusName: '',
  observations: '',
  chassisId: '',
  axieId: '',
  status: 1,
}

const tiresAssignmentSchema = Yup.object({
  serialNo: Yup.string()
    .trim()
    .matches(
      /^EXA-\d{2}(0[1-9]|1[0-2])\d{4}$/,
      '* serial no must follow format EXA-YYMM#### with a valid month',
    )
    .required('* serial no is required'),

  year: Yup.number()
    .typeError('* year must be a valid number')
    .integer('* year must be a full year')
    .min(2000, '* year must be 2000 or later')
    .max(currentYear, '* year cannot be in the future')
    .required('* year is required'),

  brand: Yup.string().required('* brand is required'),

  depth: Yup.number()
    .typeError('* depth must be a valid number')
    .min(0, '* depth cannot be negative')
    .max(99.99, '* depth must be less than 100')
    .required('* depth is required'),

  owner: Yup.boolean().required(),

  tireTypeId: Yup.string().required('* tire type is required'),

  assignedToId: Yup.string().nullable(),

  positionId: Yup.string()
    .nullable()
    .when('assignedToId', {
      is: (value: any) => Boolean(value),
      then: (schema) => schema.required('* position is required when tire is assigned'),
      otherwise: (schema) => schema.nullable(),
    }),

  statusId: Yup.string().required('* status is required'),

  statusName: Yup.string().nullable(),

  observations: Yup.string()
    .trim()
    .max(500, '* remarks must be at most 500 characters')
    .when('statusName', {
      is: (statusName: string) => DAMAGED_STATUSES.includes(statusName),
      then: (schema) => schema.required('* remarks are required when tire is damaged'),
      otherwise: (schema) => schema.nullable(),
    }),
})

const toFormPayload = (header: any): TiresAssignmentForm => ({
  tiresId: header.tiresId,
  tiresAssignId: header.tiresAssignId,
  status: header.status ?? 1,

  serialNo: String(header.serialNo ?? '')
    .trim()
    .toUpperCase(),
  year: header.year ? Number(header.year) : undefined,
  brand: header.brandId || header.brand,
  brandId: header.brandId || header.brand,
  brandName: header.brandName,
  depth: header.depth !== '' && header.depth !== undefined ? Number(header.depth) : undefined,
  owner: Boolean(header.owner),
  tireTypeId: header.tireTypeId,
  tireTypeName: header.tireTypeName,
  assignedToId: header.assignedToId,
  positionId: header.positionId,
  categoryId: header.categoryId,
  statusId: header.statusId,
  statusName: header.statusName,
  observations: header.observations,

  chassisId: header.assignedToId,
  axieId: header.positionId,
})

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'

  if (typeof payload === 'string') return payload

  if (Array.isArray(payload) && payload.length > 0) {
    return payload[0]?.message ?? 'Something went wrong!'
  }

  return payload?.message ?? 'Something went wrong!'
}

const TiresAssignmentEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const isEdit = id !== 'new' && Boolean(id)
  const serialNoParam = isEdit ? decodeURIComponent(String(id)).trim().toUpperCase() : null

  const current = useSelector(selectTiresAssignmentCurrent)
  const saving = useSelector(selectTiresAssignmentSaving)
  const catalogs = useSelector(selectTiresAssignmentCatalogs)
  const catalogsLoading = useSelector(selectTiresAssignmentCatalogsLoading)

  const [header, setHeader] = useState<any>(initialHeader)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const tiresAssignmentId = current?.tiresId ?? header?.tiresId
  const canEdit = isEdit && Boolean(tiresAssignmentId)

  useEffect(() => {
    dispatch(fetchTiresCatalogs())
  }, [dispatch])

  useEffect(() => {
    if (isEdit && serialNoParam) {
      dispatch(fetchTiresAssignmentById(serialNoParam))
    } else {
      dispatch(clearCurrent())
      setHeader(initialHeader)
      setErrors({})
    }

    return () => {
      dispatch(clearCurrent())
    }
  }, [dispatch, isEdit, serialNoParam])

  useEffect(() => {
    if (!current) return

    const serialNo = current.serialNo ?? current.seriesNumber ?? ''
    const brandId = current.brandId ?? current.brand ?? ''
    const tireTypeId = current.tireTypeId ?? current.tireType ?? ''
    const statusId = current.statusId ?? current.status ?? ''

    setHeader({
      tiresId: current.tiresId,
      tiresAssignId: current.tiresId,
      company: current.company,
      status: current.status ?? 1,

      serialNo,
      year: current.year ?? '',
      brand: brandId,
      brandId,
      brandName: current.brandName ?? '',
      depth: current.depth ?? '',
      owner: Boolean(current.owner ?? current.owned ?? true),
      tireTypeId,
      tireTypeName: current.tireTypeName ?? '',
      assignedToId: current.assignedToId ?? '',
      positionId: current.positionId ?? '',
      categoryId: current.categoryId ?? '',
      statusId,
      statusName: current.statusName ?? '',
      observations: current.observations ?? current.remarks ?? '',

      chassisId: current.assignedToId ?? '',
      axieId: current.positionId ?? '',
    })

    setErrors({})
  }, [current])

  const validateForm = async (): Promise<boolean> => {
    try {
      setErrors({})

      await tiresAssignmentSchema.validate(
        {
          ...header,
          serialNo: String(header.serialNo ?? '').toUpperCase(),
          brand: header.brandId || header.brand ? String(header.brandId || header.brand) : '',
          owner: Boolean(header.owner),
          year: header.year === '' ? undefined : header.year,
          depth: header.depth === '' ? undefined : header.depth,
          assignedToId: header.assignedToId ? String(header.assignedToId) : '',
          positionId: header.positionId ? String(header.positionId) : '',
          statusId: header.statusId ? String(header.statusId) : '',
        },
        { abortEarly: false },
      )

      return true
    } catch (err: any) {
      const formatted: Record<string, string> = {}

      if (err?.inner) {
        err.inner.forEach((e: any) => {
          if (e?.path && !formatted[e.path]) {
            formatted[e.path] = e.message
          }
        })
      }

      setErrors(formatted)

      const firstMessage = Object.values(formatted)[0] ?? 'Please review the required fields.'

      setErrorMessage(firstMessage)
      setShowErrorModal(true)

      return false
    }
  }

  const handleSubmit = async () => {
    try {
      const formIsValid = await validateForm()
      if (!formIsValid) return

      const normalizedHeader = {
        ...header,
        serialNo: String(header.serialNo ?? '')
          .trim()
          .toUpperCase(),
        year: header.year ? Number(header.year) : undefined,
        depth: header.depth !== '' && header.depth !== undefined ? Number(header.depth) : undefined,
        owner: Boolean(header.owner),
      }

      const payload = toFormPayload(normalizedHeader)

      const result =
        isEdit && serialNoParam
          ? await dispatch(updateTiresAssignment({ serialNo: serialNoParam, form: payload }))
          : await dispatch(addTiresAssignment(payload))

      if (result.meta.requestStatus === 'rejected') {
        setErrorMessage(getErrorMessage((result as any).payload))
        setShowErrorModal(true)
        return
      }

      navigate('/mr/tires')
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err))
      setShowErrorModal(true)
    }
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker={isEdit ? 'Edit Tire' : 'M&R'}
        icon={cilAlbum}
        title={isEdit ? 'Edit Tire' : 'Add a Tire'}
      />

      <CCard className="mb-4 shadow-sm">
        <TiresForm
          header={header}
          setHeader={setHeader}
          isEdit={isEdit}
          errors={errors}
          brandOptions={catalogs.brands}
          tireTypeOptions={catalogs.tireTypes}
          assignedToOptions={catalogs.assignedTo}
          positionOptions={catalogs.positions}
          categoryOptions={catalogs.categories}
          statusOptions={catalogs.statuses}
          loadingOptions={catalogsLoading}
        />

        {isEdit && tiresAssignmentId && (
          <>
            <CCardBody>
              <TiresAssignmentComments tiresAssignmentId={tiresAssignmentId} canEdit={canEdit} />
            </CCardBody>

            <CCardBody>
              <TiresAssignmentAttachments tiresAssignmentId={tiresAssignmentId} canEdit={canEdit} />
            </CCardBody>
          </>
        )}

        <CCardFooter className="d-flex justify-content-end gap-2">
          <CButton
            color="secondary"
            variant="outline"
            onClick={() => navigate('/mr/tires')}
            disabled={saving}
          >
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

export default TiresAssignmentEditPage
