// src/modules/Reset/components/ResetResults.tsx

import React, { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { CCard, CCardHeader, CSmartTable, CFormInput, CButton, CCardBody } from '@coreui/react-pro'
import { CIcon } from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'

export default function ResetResults() {
  const reset = useSelector((state: any) => state.reset.current)

  const displayNumber = (value: any) => {
    if (value === null || value === undefined) return '-'
    if (typeof value === 'number' && isNaN(value)) return '-'
    return Number(value).toLocaleString()
  }

  // 🔹 Valores base seguros
  const lastKms = reset?.lastSession?.kms
  const currentKms = reset?.currentSession?.kms

  const diffKms = lastKms !== undefined && currentKms !== undefined ? currentKms - lastKms : null

  const lastGallons = reset?.lastSession?.gallons
  const currentGallons = reset?.currentSession?.gallons

  const diffGallons =
    lastGallons !== undefined && currentGallons !== undefined ? currentGallons - lastGallons : null

  const emsKms = diffKms
  const emsGallons = diffGallons

  const tankConsumption = diffGallons

  const diffEcmEmsKms = diffKms !== null && emsKms !== null ? emsKms - diffKms : null
  const diffEcmEmsGallons =
    diffGallons !== null && emsGallons !== null ? emsGallons - diffGallons : null

  const safeDivide = (a: number | null, b: number | null) => {
    if (!a || !b) return 0
    return a / b
  }

  const columns = [
    { key: 'type', label: '' },
    { key: 'lastEcm', label: 'Last ECM' },
    { key: 'currentEcm', label: 'Current ECM' },
    { key: 'diff', label: 'DIFF' },
    { key: 'ems', label: 'EMS' },
    { key: 'tankConsumption', label: 'Tank Consumption' },
    { key: 'diffEcmEms', label: 'DIFF ECM/EMS' },
  ]

  const getDiffClass = (value: number) => {
    if (value > 0) return 'text-success fw-bold'
    if (value < 0) return 'text-danger fw-bold'
    return 'text-muted'
  }

  const summaryText = () => {
    if (!reset || diffKms === null || diffGallons === null) {
      return 'No data available.'
    }

    const km = diffKms
    const gallons = diffGallons
    const liters = gallons * 3.785
    const efficiency = safeDivide(km, gallons)

    return `De acuerdo con la lectura del odómetro y sin diferencias entre el ECM y EMS, el equipo recorrió ${km} km, registrando un consumo de ${gallons} galones (${liters.toFixed(
      2,
    )} litros), lo que equivale a un rendimiento de ${efficiency.toFixed(2)} km/galón.`
  }

  const warningMessage = () => {
    if (Math.abs(diffEcmEmsGallons) > 5) {
      return '⚠️ Hay una diferencia significativa entre ECM y EMS'
    }
    return null
  }

  const items = [
    {
      type: 'KMS',
      lastEcm: lastKms,
      currentEcm: currentKms,
      diff: diffKms,
      ems: emsKms,
      tankConsumption: null,
      diffEcmEms: diffEcmEmsKms,
    },
    {
      type: 'Gallons',
      lastEcm: lastGallons,
      currentEcm: currentGallons,
      diff: diffGallons,
      ems: emsGallons,
      tankConsumption: tankConsumption,
      diffEcmEms: diffEcmEmsGallons,
    },
  ]

  return (
    <CCard className="mb-3">
      <CCardHeader>
        <strong>Results</strong>
      </CCardHeader>

      <CCardBody>
        <CSmartTable
          columns={columns}
          items={items}
          pagination={false}
          columnFilter={false}
          columnSorter={false}
          tableProps={{
            striped: true,
            hover: true,
            responsive: true,
            className: 'align-middle text-center',
          }}
          scopedColumns={{
            type: (item: any) => (
              <td>
                <span className="badge bg-primary">{item.type}</span>
              </td>
            ),

            diff: (item: any) => (
              <td>
                <span className={getDiffClass(item.diff)}>{displayNumber(item.diff)}</span>
              </td>
            ),

            lastEcm: (item: any) => <td>{displayNumber(item.lastEcm)}</td>,
            currentEcm: (item: any) => <td>{displayNumber(item.currentEcm)}</td>,
            ems: (item: any) => <td>{displayNumber(item.ems)}</td>,
            tankConsumption: (item: any) => (
              <td>{item.tankConsumption === null ? '-' : displayNumber(item.tankConsumption)}</td>
            ),
            diffEcmEms: (item: any) => <td>{displayNumber(item.diffEcmEms)}</td>,
          }}
        />

        {/* 🔹 Metrics */}
        <div className="row text-center mt-4">
          {[
            {
              label: 'ECM KMS/Gallons',
              value: safeDivide(diffKms, diffGallons),
            },
            {
              label: 'ECM KMS/Liters',
              value: safeDivide(diffKms, diffGallons) * 3.785,
            },
            {
              label: 'EMS KMS/Gallons',
              value: safeDivide(emsKms, emsGallons),
            },
            {
              label: 'EMS KMS/Liters',
              value: safeDivide(emsKms, emsGallons) * 3.785,
            },
          ].map((item, i) => (
            <div className="col-md-3" key={i}>
              <div className="p-3 border rounded bg-light">
                <small className="text-muted">{item.label}</small>
                <h5 className="fw-bold">{item.value.toFixed(2)}</h5>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 border rounded bg-primary bg-opacity-10 text-muted">
          {summaryText()}
          {warningMessage() && (
            <div className="alert alert-warning mt-2" role="alert">
              {warningMessage()}
            </div>
          )}
        </div>
      </CCardBody>
    </CCard>
  )
}
