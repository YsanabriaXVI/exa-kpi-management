import React, { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import * as Yup from 'yup'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CContainer,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSave, cilDollar, cilReload } from '@coreui/icons'

import type { AppDispatch, RootState } from '../../../../store'
import PageHero from '../../../../components/PageHero'
import ErrorBoundary from 'src/components/ErrorBoundary'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import FuelPriceFormComponent from '../components/FuelPriceForm'
import type { FuelPriceForm } from '../types/fuelPrice.types'

import {
  addFuelPrice,
  saveFuelPrice,
  fetchFuelPriceById,
  clearCurrent,
  loadCountries,
  loadDepartments,
  loadCities,
  loadFuelTypes,
  loadUnitTypes,
  selectFuelPriceCurrent,
  selectFuelPriceLoadingCurrent,
  selectFuelPriceSaving,
  selectFuelPriceErrors,
  selectFuelPriceStatuses,
  selectFuelPriceFuelTypes,
  selectFuelPriceUnitTypes,
  resetStatuses,
} from '../store/fuelPrice.slice'
import { loadWeeks } from '../../../Weeks/store/weeksSlice'

const schema = Yup.object({
  weekId: Yup.number().typeError('* week is required').required('* week is required'),
  countryId: Yup.number().typeError('* country is required').required('* country is required'),
  departmentId: Yup.number().typeError('* department is required').required('* department is required'),
  cityId: Yup.number().typeError('* city is required').required('* city is required'),
})

const defaultForm: FuelPriceForm = {
  fuelPriceLocationWeekId: null,
  weekId: null,
  exchangeRate: '',
  countryId: null,
  departmentId: null,
  cityId: null,
  prices: {},
}

const FuelPriceEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const current = useSelector(selectFuelPriceCurrent)
  const loadingCurrent = useSelector(selectFuelPriceLoadingCurrent)
  const saving = useSelector(selectFuelPriceSaving)
  const errors = useSelector(selectFuelPriceErrors)
  const statuses = useSelector(selectFuelPriceStatuses)
  const weeks = useSelector((s: RootState) => (s as any).weeks?.weeks ?? [])
  const fuelTypes = useSelector(selectFuelPriceFuelTypes)
  const unitTypes = useSelector(selectFuelPriceUnitTypes)

  const [form, setForm] = useState<FuelPriceForm>({ ...defaultForm })
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showErrorModal, setShowErrorModal] = useState(false)

  useEffect(() => {
    dispatch(loadCountries())
    dispatch(loadFuelTypes())
    dispatch(loadUnitTypes())
    dispatch(loadWeeks())
  }, [dispatch])

  useEffect(() => {
    if (!isNew && id) {
      dispatch(fetchFuelPriceById(Number(id)))
    } else {
      dispatch(clearCurrent())
    }
    return () => { dispatch(clearCurrent()) }
  }, [id, isNew, dispatch])

  useEffect(() => {
    if (!isNew && current) {
      const pricesMap: Record<string, string> = {}
      if (current.fuelPrices) {
        current.fuelPrices.forEach((p) => {
          pricesMap[`${p.fuelTypeId}_${p.unitTypeId}`] = String(parseFloat(String(p.price)) || 0)
        })
      }

      const loc = current.FuelPriceLocation
      const countryId = loc?.countryId ?? loc?.country?.id ?? (loc?.country as any)?.countryId ?? null
      const departmentId = loc?.departmentId ?? loc?.department?.id ?? (loc?.department as any)?.departmentId ?? null
      const cityId = loc?.cityId ?? loc?.city?.id ?? (loc?.city as any)?.cityId ?? null

      setForm({
        fuelPriceLocationWeekId: current.fuelPriceLocationWeekId,
        weekId: current.weekId,
        exchangeRate: current.exchangeRate != null ? String(current.exchangeRate) : '',
        countryId,
        departmentId,
        cityId,
        prices: pricesMap,
      })

      if (countryId) dispatch(loadDepartments(countryId))
      if (departmentId) dispatch(loadCities(departmentId))
    }
  }, [current, isNew, dispatch])

  useEffect(() => {
    const toast = (window as any).exaToast
    if (statuses.added) {
      toast?.success?.('Success', 'Fuel Price was Added')
      dispatch(resetStatuses())
      navigate('/fuel/fuel-price')
    }
    if (statuses.updated) {
      toast?.success?.('Success', 'Fuel Price was Updated')
      dispatch(resetStatuses())
      navigate('/fuel/fuel-price')
    }
  }, [statuses, dispatch, navigate])

  useEffect(() => {
    if (errors) setShowErrorModal(true)
  }, [errors])

  const setField = useCallback((field: string, value: any) => {
    setForm((prev) => {
      if (field === 'prices') return { ...prev, prices: value }
      return { ...prev, [field]: value }
    })
  }, [])

  const validate = async (): Promise<boolean> => {
    try {
      await schema.validate(form, { abortEarly: false })
      setValidationErrors({})
      return true
    } catch (err: any) {
      const fieldErrors: Record<string, string> = {}
      if (err.inner) {
        err.inner.forEach((e: any) => {
          if (e.path) fieldErrors[e.path] = e.message
        })
      }
      setValidationErrors(fieldErrors)
      setTouched(
        Object.keys(fieldErrors).reduce(
          (acc, k) => ({ ...acc, [k]: true }),
          {},
        ),
      )
      return false
    }
  }

  const validatePriceMatrix = (): boolean => {
    if (!fuelTypes.length || !unitTypes.length) return true

    const priceErrors: Record<string, string> = {}
    fuelTypes.forEach((ft: any) => {
      unitTypes.forEach((ut: any) => {
        const key = `${ft.attributeItemid}_${ut.unitTypeId}`
        const val = form.prices?.[key]
        if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
          priceErrors[`prices.${key}`] = 'Price is required'
        }
      })
    })

    if (Object.keys(priceErrors).length > 0) {
      const toast = (window as any).exaToast
      toast?.error?.('Validation Error', 'All price fields are required. Please fill in every price cell.')
      setValidationErrors((prev) => ({ ...prev, ...priceErrors }))
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    const valid = await validate()
    if (!valid) return

    if (!validatePriceMatrix()) return

    if (isNew) {
      dispatch(addFuelPrice(form))
    } else {
      dispatch(saveFuelPrice(form))
    }
  }

  const handleReset = () => {
    if (isNew) {
      setForm({ ...defaultForm })
    } else if (current) {
      const pricesMap: Record<string, string> = {}
      if (current.fuelPrices) {
        current.fuelPrices.forEach((p) => {
          pricesMap[`${p.fuelTypeId}_${p.unitTypeId}`] = String(parseFloat(String(p.price)) || 0)
        })
      }
      const loc = current.FuelPriceLocation
      setForm({
        fuelPriceLocationWeekId: current.fuelPriceLocationWeekId,
        weekId: current.weekId,
        exchangeRate: current.exchangeRate != null ? String(current.exchangeRate) : '',
        countryId: loc?.countryId ?? loc?.country?.id ?? (loc?.country as any)?.countryId ?? null,
        departmentId: loc?.departmentId ?? loc?.department?.id ?? (loc?.department as any)?.departmentId ?? null,
        cityId: loc?.cityId ?? loc?.city?.id ?? (loc?.city as any)?.cityId ?? null,
        prices: pricesMap,
      })
    }
    setTouched({})
    setValidationErrors({})
  }

  const hasError = (field: string) =>
    !!(touched[field] && validationErrors[field])

  const referenceDataReady = weeks.length > 0 && fuelTypes.length > 0 && unitTypes.length > 0

  if (!isNew && loadingCurrent) {
    return (
      <CContainer fluid className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading fuel price...</p>
      </CContainer>
    )
  }

  if (!referenceDataReady) {
    return (
      <CContainer fluid className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-2">Loading reference data...</p>
      </CContainer>
    )
  }

  return (
    <ErrorBoundary>
      <CContainer fluid>
        <PageHero
          kicker="Fuel"
          icon={cilDollar}
          title={isNew ? 'New Fuel Price' : 'Edit Fuel Price'}
        />

        <CCard className="mb-4 shadow-sm">
          <CCardHeader>
            <strong>{isNew ? 'Create' : 'Edit'} Fuel Price</strong>
          </CCardHeader>
          <CCardBody>
            <FuelPriceFormComponent
              value={form}
              disabled={saving}
              errors={validationErrors}
              setTouched={setTouched}
              setField={setField}
              hasError={hasError}
              weeks={weeks}
            />
          </CCardBody>
          <CCardFooter className="d-flex justify-content-end gap-2">
            <CButton color="secondary" variant="outline" onClick={() => navigate('/fuel/fuel-price')} disabled={saving}>
              Cancel
            </CButton>
            <CButton color="warning" variant="outline" onClick={handleReset} disabled={saving}>
              <CIcon icon={cilReload} className="me-2" />
              Reset
            </CButton>
            <CButton color="primary" className="text-white" onClick={handleSubmit} disabled={saving}>
              <CIcon icon={cilSave} className="me-2" />
              {saving ? 'Saving...' : 'Save'}
            </CButton>
          </CCardFooter>
        </CCard>

        <ErrorMessageModal
          showErrorModal={showErrorModal}
          setShowErrorModal={setShowErrorModal}
          errorMessage={typeof errors === 'string' ? errors : (errors as any)?.message ?? 'An unexpected error occurred'}
        />
      </CContainer>
    </ErrorBoundary>
  )
}

export default FuelPriceEditPage
