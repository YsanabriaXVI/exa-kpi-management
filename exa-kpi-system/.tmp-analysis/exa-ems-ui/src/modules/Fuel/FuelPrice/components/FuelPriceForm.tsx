import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  CCol,
  CForm,
  CFormInput,
  CFormSelect,
  CRow,
  CCard,
  CCardBody,
  CCardHeader,
} from '@coreui/react-pro'

import type { AppDispatch } from '../../../../store'
import type { FuelPriceForm as FormValues } from '../types/fuelPrice.types'
import {
  loadCountries,
  loadDepartments,
  loadCities,
  loadFuelTypes,
  loadUnitTypes,
  clearDepartments,
  clearCities,
  selectFuelPriceCountries,
  selectFuelPriceDepartments,
  selectFuelPriceCities,
  selectFuelPriceFuelTypes,
  selectFuelPriceUnitTypes,
} from '../store/fuelPrice.slice'
import { loadWeeks } from '../../../Weeks/store/weeksSlice'

interface FuelPriceFormProps {
  value: FormValues
  disabled: boolean
  errors: Record<string, string>
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  setField: (field: string, value: any) => void
  hasError: (field: string) => boolean
  weeks: Array<{ week_id?: number; id?: number; week_no?: number; week_year?: number }>
}

const FuelPriceFormComponent: React.FC<FuelPriceFormProps> = ({
  value,
  disabled,
  errors,
  setTouched,
  setField,
  hasError,
  weeks,
}) => {
  const dispatch = useDispatch<AppDispatch>()

  const countries = useSelector(selectFuelPriceCountries)
  const departments = useSelector(selectFuelPriceDepartments)
  const cities = useSelector(selectFuelPriceCities)
  const fuelTypes = useSelector(selectFuelPriceFuelTypes)
  const unitTypes = useSelector(selectFuelPriceUnitTypes)

  useEffect(() => {
    dispatch(loadCountries())
    dispatch(loadFuelTypes())
    dispatch(loadUnitTypes())
    dispatch(loadWeeks())
  }, [dispatch])

  useEffect(() => {
    if (value.countryId) {
      dispatch(loadDepartments(Number(value.countryId)))
    } else {
      dispatch(clearDepartments())
    }
  }, [value.countryId, dispatch])

  useEffect(() => {
    if (value.departmentId) {
      dispatch(loadCities(Number(value.departmentId)))
    } else {
      dispatch(clearCities())
    }
  }, [value.departmentId, dispatch])

  const handleCountryChange = (countryId: string) => {
    setField('countryId', countryId ? Number(countryId) : null)
    setField('departmentId', null)
    setField('cityId', null)
  }

  const handleDepartmentChange = (departmentId: string) => {
    setField('departmentId', departmentId ? Number(departmentId) : null)
    setField('cityId', null)
  }

  const handlePriceChange = (fuelTypeId: number, unitTypeId: number, val: string) => {
    const key = `${fuelTypeId}_${unitTypeId}`
    const newPrices = { ...value.prices, [key]: val }

    const GALLON_TO_LITER = 3.78541
    if (val && !isNaN(parseFloat(val))) {
      const numVal = parseFloat(val)
      if (unitTypeId === 1) {
        const siblingKey = `${fuelTypeId}_2`
        newPrices[siblingKey] = (numVal * GALLON_TO_LITER).toFixed(2)
      } else if (unitTypeId === 2) {
        const siblingKey = `${fuelTypeId}_1`
        newPrices[siblingKey] = (numVal / GALLON_TO_LITER).toFixed(2)
      }
    }

    setField('prices', newPrices)
  }

  const handlePriceFocus = (fuelTypeId: number, unitTypeId: number) => {
    const key = `${fuelTypeId}_${unitTypeId}`
    const current = value.prices[key]
    if (current === '0' || current === '0.00' || parseFloat(current) === 0) {
      const newPrices = { ...value.prices, [key]: '' }
      setField('prices', newPrices)
    }
  }

  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }))

  return (
    <CForm>
      <CRow className="mb-3">
        <CCol md={6}>
          <CFormSelect
            label="Week *"
            value={value.weekId ?? ''}
            onChange={(e) => { setField('weekId', e.target.value ? Number(e.target.value) : null); touch('weekId') }}
            onBlur={() => touch('weekId')}
            disabled={disabled}
            invalid={hasError('weekId')}
            feedbackInvalid={errors.weekId}
          >
            <option value="">Select a week...</option>
            {weeks.map((w) => {
              const id = w.week_id ?? w.id
              return (
                <option key={id} value={id}>
                  {w.week_year} - W {w.week_no}
                </option>
              )
            })}
          </CFormSelect>
        </CCol>
        <CCol md={6}>
          <CFormInput
            label="Exchange Rate"
            type="number"
            step="0.01"
            value={value.exchangeRate}
            onChange={(e) => setField('exchangeRate', e.target.value)}
            onBlur={() => touch('exchangeRate')}
            disabled={disabled}
          />
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol md={4}>
          <CFormSelect
            label="Country *"
            value={value.countryId ?? ''}
            onChange={(e) => { handleCountryChange(e.target.value); touch('countryId') }}
            onBlur={() => touch('countryId')}
            disabled={disabled}
            invalid={hasError('countryId')}
            feedbackInvalid={errors.countryId}
          >
            <option value="">Select country...</option>
            {countries.map((c) => (
              <option key={c.countryId} value={c.countryId}>{c.name}</option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormSelect
            label="Department *"
            value={value.departmentId ?? ''}
            onChange={(e) => { handleDepartmentChange(e.target.value); touch('departmentId') }}
            onBlur={() => touch('departmentId')}
            disabled={disabled || !value.countryId}
            invalid={hasError('departmentId')}
            feedbackInvalid={errors.departmentId}
          >
            <option value="">Select department...</option>
            {departments.map((d) => (
              <option key={d.deparmentid} value={d.deparmentid}>{d.name}</option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol md={4}>
          <CFormSelect
            label="City *"
            value={value.cityId ?? ''}
            onChange={(e) => { setField('cityId', e.target.value ? Number(e.target.value) : null); touch('cityId') }}
            onBlur={() => touch('cityId')}
            disabled={disabled || !value.departmentId}
            invalid={hasError('cityId')}
            feedbackInvalid={errors.cityId}
          >
            <option value="">Select city...</option>
            {cities.map((c) => (
              <option key={c.citieid} value={c.citieid}>{c.name}</option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      {fuelTypes.length > 0 && unitTypes.length > 0 && (
        <CCard className="mt-4">
          <CCardHeader>
            <strong>Fuel Prices</strong>
          </CCardHeader>
          <CCardBody>
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Fuel Type</th>
                    {unitTypes.map((u) => (
                      <th key={u.unitTypeId}>{u.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fuelTypes.map((ft) => (
                    <tr key={ft.attributeItemid}>
                      <td className="fw-semibold">{ft.name}</td>
                      {unitTypes.map((ut) => {
                        const key = `${ft.attributeItemid}_${ut.unitTypeId}`
                        const priceError = errors[`prices.${key}`]
                        return (
                          <td key={key}>
                            <CFormInput
                              type="number"
                              step="0.01"
                              size="sm"
                              value={value.prices[key] ?? ''}
                              onChange={(e) => handlePriceChange(ft.attributeItemid, ut.unitTypeId, e.target.value)}
                              onFocus={() => handlePriceFocus(ft.attributeItemid, ut.unitTypeId)}
                              disabled={disabled}
                              placeholder="0.00"
                              invalid={!!priceError}
                              feedbackInvalid={priceError}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CCardBody>
        </CCard>
      )}
    </CForm>
  )
}

export default FuelPriceFormComponent
