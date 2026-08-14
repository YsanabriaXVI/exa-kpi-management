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
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilHome } from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import GasSupplierFormComponent, { type GasSupplierFormValue } from '../components/GasSupplierForm'
import { loadAllLocationItems } from '../../../LocationItems/store/locationItemsSlice'

import {
  addStore,
  fetchStore,
  saveStore,
  loadDefaultStore,
  selectCurrentStore,
  selectGasSupplierSaving,
  selectStoreLoading,
} from '../store/gasSupplier.slice'

import { loadSubdivisions } from '../../../Assets/Subdivisions/store/subdivisions.slice'

import { permissionService, UPDATE } from '../../../../services/auth/permission.service'
import { MODULE_GASSUPPLIER } from '../../../../constants/modules'

const schema = Yup.object({
  name: Yup.string().trim().min(1, '* name is required').required('* name is required'),
  address: Yup.string().trim().min(1, '* address is required').required('* address is required'),
  email: Yup.string().email('* invalid email').nullable(),
  phone: Yup.string().matches(/^\+?[1-9]\d{1,14}$/, '* invalid phone number').nullable(),
  creditDays: Yup.number().typeError('* must be a number').min(0).nullable(),
  countryId: Yup.number().min(1, '* country is required').required('* country is required'),
  departmentId: Yup.number().min(1, '* department is required').required('* department is required'),
  cityId: Yup.number().min(1, '* city is required').required('* city is required'),
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

const GasStoreEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { parentId, storeId } = useParams<{ parentId: string; storeId: string }>()

  const numParentId = Number(parentId)
  const isEdit = storeId !== 'new' && Number.isFinite(Number(storeId))
  const numStoreId = isEdit ? Number(storeId) : null

  const saving = useSelector(selectGasSupplierSaving)
  const loadingStore = useSelector(selectStoreLoading)
  const currentStore = useSelector(selectCurrentStore)
  const locationData = useSelector((s: RootState) => (s as any).locationitems?.data)

  const canUpdate = permissionService.checkPermission(MODULE_GASSUPPLIER, UPDATE)

  const authSubdivisions = useSelector(
    (s: RootState) => (s.auth as any)?.details?.details?.subdivisions ?? [],
  )
  const sliceSubdivisions = useSelector(
    (s: RootState) => (s as any).subdivisions?.list ?? [],
  )
  const subdivisionsList = authSubdivisions.length > 0 ? authSubdivisions : sliceSubdivisions

  const subdivisionOptions = useMemo(
    () => subdivisionsList.map((sub: any) => ({
      value: sub.subdivision_id ?? sub.subdivisionId,
      label: sub.name,
    })),
    [subdivisionsList],
  )

  const [value, setValue] = useState<GasSupplierFormValue>({
    name: '', address: '', email: '', phone: '', creditDays: '',
    countryId: 0, departmentId: 0, cityId: 0, status: 1, active: 0,
    subdivisions: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Always reset currentStore immediately on mount to clear any stale data
  // left in Redux from a previously visited store/supplier page.
  useEffect(() => {
    dispatch(loadDefaultStore())
  }, [dispatch])

  useEffect(() => {
    dispatch(loadAllLocationItems())
    dispatch(loadSubdivisions())
    if (isEdit && numStoreId) {
      dispatch(fetchStore(numStoreId))
    }
  }, [dispatch, isEdit, numStoreId])

  useEffect(() => {
    if (!currentStore) return
    setValue({
      name: currentStore.name ?? '',
      address: currentStore.address ?? '',
      email: currentStore.email ?? '',
      phone: currentStore.phone ?? '',
      creditDays: String(currentStore.creditDays ?? ''),
      countryId: currentStore.countryId ?? 0,
      departmentId: currentStore.departmentId ?? 0,
      cityId: currentStore.cityId ?? 0,
      status: currentStore.status ?? 1,
      active: currentStore.active ? 1 : 0,
      subdivisions: currentStore.subdivisions ?? [],
    })
  }, [currentStore])

  const setField = (field: keyof GasSupplierFormValue, v: any) =>
    setValue((prev) => ({ ...prev, [field]: v }))

  const hasError = (field: keyof GasSupplierFormValue) =>
    !!touched[field] && !!errors[field]

  const handleReset = () => {
    setValue({
      name: '', address: '', email: '', phone: '', creditDays: '',
      countryId: 0, departmentId: 0, cityId: 0, status: 1, active: 0,
      subdivisions: [],
    })
    setErrors({})
    setTouched({})
  }

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

  const handleSubdivisionsChange = (selected: number[]) => {
    setValue((prev) => ({ ...prev, subdivisions: selected }))
  }

  const handleSave = async () => {
    try {
      setTouched({
        name: true, address: true, email: true, phone: true, creditDays: true,
        countryId: true, departmentId: true, cityId: true,
      })
      const ok = await validate()
      if (!ok) return

      const payload: any = { ...value }
      payload.subdivisions = value.subdivisions ?? currentStore?.subdivisions ?? []

      let result
      if (isEdit && numStoreId) {
        payload.gasStationsId = numStoreId
        payload.gasStationsParentId = numParentId
        result = await dispatch(saveStore(payload))
      } else {
        result = await dispatch(addStore({ form: payload, parentId: numParentId }))
      }

      if (result?.meta?.requestStatus === 'rejected') {
        setErrorMessage(getErrorMessage((result as any)?.payload))
        setShowErrorModal(true)
        return
      }
      if (result?.meta?.requestStatus === 'fulfilled') {
        const toast = (window as any).exaToast
        toast?.success?.('Success', isEdit ? 'Data was Updated!' : 'Data was Added!')
        navigate(`/fuel/gas-supplier/${numParentId}`)
        return
      }
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err?.message || err))
      setShowErrorModal(true)
    }
  }

  return (
    <CContainer fluid>
      <CCol xs={12}>
        <PageHero
          kicker={isEdit ? 'Edit Gas Store' : 'New Gas Store'}
          icon={cilHome}
          title="Gas Store"
        />
      </CCol>

      <CCard className="mb-4 shadow-sm">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <strong>Gas Store Details</strong>
        </CCardHeader>
        <CCardBody>
          {(isEdit && loadingStore) || !locationData ? (
            <div className="d-flex justify-content-center py-5">
              <CSpinner color="primary" />
            </div>
          ) : (
            <GasSupplierFormComponent
              value={value}
              disabled={saving || !canUpdate}
              errors={errors}
              setTouched={setTouched}
              setField={setField}
              hasError={hasError}
              subdivisionOptions={subdivisionOptions}
              onSubdivisionsChange={handleSubdivisionsChange}
              onSubmit={handleSave}
              onReset={handleReset}
              filterVariantCities
            />
          )}
        </CCardBody>
        <CCardFooter className="d-flex justify-content-between">
          <CButton
            onClick={() => navigate(`/fuel/gas-supplier/${numParentId}`)}
            disabled={saving}
            style={{
              borderColor: '#c0392b',
              color: '#c0392b',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget
              el.style.background = 'rgba(192,57,43,0.12)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget
              el.style.background = 'transparent'
            }}
          >
            Cancel
          </CButton>
          {canUpdate && (
            <CButton color="primary" className="text-white" onClick={handleSave} disabled={saving}>
              <CIcon icon={cilSave} className="me-2" />
              {saving ? 'Saving...' : 'Save'}
            </CButton>
          )}
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

export default GasStoreEditPage
