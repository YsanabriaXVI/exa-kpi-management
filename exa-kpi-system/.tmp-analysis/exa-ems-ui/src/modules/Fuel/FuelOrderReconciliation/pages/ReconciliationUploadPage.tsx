import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCloudUpload, cilDrop } from '@coreui/icons'

import type { AppDispatch } from '../../../../store'
import PageHero from '../../../../components/PageHero'

import {
  validateReconciliationData,
  setReconciliationData,
  selectReconciliationErrors,
  selectReconciliationLoadingData,
} from '../store/fuelOrderReconciliation.slice'

import { selectFuelOrderGasStores, loadGasStores } from '../../FuelOrder/store/fuelOrder.slice'

const REQUIRED_COLUMNS = [
  'transactionId',
  'documentNumber',
  'dateTime',
  'measureUnit',
  'fuelType',
  'paymentMethod',
  'unitPrice',
  'quantity',
  'currency',
  'amount',
  'licensePlate',
  'fuelOrderId',
]

const ReconciliationUploadPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  const gasStores = useSelector(selectFuelOrderGasStores)
  const errors = useSelector(selectReconciliationErrors)
  const loading = useSelector(selectReconciliationLoadingData)

  const [gasStationId, setGasStationId] = useState<number | null>(null)
  const [gasStationName, setGasStationName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<Record<string, any>[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dispatch(loadGasStores())
  }, [dispatch])

  const handleGasStationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value) || null
    setGasStationId(id)
    const store = gasStores.find((s: any) => s.gasStationsId === id)
    setGasStationName(store?.name ?? '')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setParseErrors([])
    setParsedData(null)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setParseErrors(result.errors.map((e) => `Row ${e.row}: ${e.message}`))
          return
        }

        const headers = Object.keys(result.data[0] ?? {})
        const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col))
        if (missing.length > 0) {
          setParseErrors([`Missing required columns: ${missing.join(', ')}`])
          return
        }

        const rows = result.data as Record<string, any>[]
        const rowErrors: string[] = []
        rows.forEach((row, i) => {
          const rowNum = i + 2
          if (!row.transactionId && !row.documentNumber) {
            rowErrors.push(`Row ${rowNum}: missing both transactionId and documentNumber`)
          }
          if (row.unitPrice && isNaN(Number(row.unitPrice))) {
            rowErrors.push(`Row ${rowNum}: unitPrice "${row.unitPrice}" is not a number`)
          }
          if (row.quantity && isNaN(Number(row.quantity))) {
            rowErrors.push(`Row ${rowNum}: quantity "${row.quantity}" is not a number`)
          }
          if (row.amount && isNaN(Number(row.amount))) {
            rowErrors.push(`Row ${rowNum}: amount "${row.amount}" is not a number`)
          }
        })
        if (rowErrors.length > 0) {
          setParseErrors(rowErrors.slice(0, 10))
          if (rowErrors.length > 10) {
            setParseErrors((prev) => [...prev, `... and ${rowErrors.length - 10} more errors`])
          }
          return
        }

        setParsedData(rows)
      },
      error: (err) => {
        setParseErrors([err.message])
      },
    })
  }

  const handleSubmit = async () => {
    if (!gasStationId) {
      setParseErrors(['Please select a gas station'])
      return
    }
    if (!parsedData || parsedData.length === 0) {
      setParseErrors(['Please upload and parse a valid CSV file first'])
      return
    }

    const result = await dispatch(
      validateReconciliationData({
        data: parsedData,
        gasStationId,
        gasStationName,
      }),
    )

    if (validateReconciliationData.fulfilled.match(result)) {
      dispatch(
        setReconciliationData({
          data: result.payload,
          gasStationId,
          gasStationName,
        }),
      )
      navigate('/fuel/fuelorderreconciliation/review/new')
    }
  }

  const handleBack = () => navigate('/fuel/fuelorderreconciliation')

  return (
    <CContainer fluid>
      <PageHero
        kicker="Fuel"
        icon={cilDrop}
        title="Upload Reconciliation File"
        actions={
          <CButton color="secondary" variant="outline" onClick={handleBack}>
            <CIcon icon={cilArrowLeft} className="me-2" /> Back
          </CButton>
        }
      />

      <CCard className="mb-4 shadow-sm">
        <CCardHeader>
          <strong>Upload CSV</strong>
        </CCardHeader>
        <CCardBody>
          {errors && (
            <CAlert color="danger" className="mb-3">
              {typeof errors === 'string' ? errors : 'Validation failed'}
            </CAlert>
          )}
          {parseErrors.length > 0 && (
            <CAlert color="warning" className="mb-3">
              {parseErrors.map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </CAlert>
          )}

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>Gas Station *</CFormLabel>
              <CFormSelect
                value={gasStationId ?? ''}
                onChange={handleGasStationChange}
              >
                <option value="">Select gas station...</option>
                {gasStores.map((store: any) => (
                  <option key={store.gasStationsId} value={store.gasStationsId}>
                    {store.name}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>

          <CRow className="mb-3">
            <CCol md={6}>
              <CFormLabel>CSV File *</CFormLabel>
              <input
                ref={fileInputRef}
                type="file"
                className="form-control"
                accept=".csv"
                onChange={handleFileChange}
              />
              <div className="form-text">
                Required columns: {REQUIRED_COLUMNS.join(', ')}
              </div>
            </CCol>
          </CRow>

          {parsedData && (
            <CAlert color="success" className="mb-3">
              Parsed {parsedData.length} rows successfully.
            </CAlert>
          )}

          <CButton
            color="primary"
            className="text-white"
            onClick={handleSubmit}
            disabled={loading || !parsedData || !gasStationId}
          >
            {loading ? (
              <CSpinner size="sm" className="me-2" />
            ) : (
              <CIcon icon={cilCloudUpload} className="me-2" />
            )}
            Continue to Preview
          </CButton>
        </CCardBody>
      </CCard>
    </CContainer>
  )
}

export default ReconciliationUploadPage
