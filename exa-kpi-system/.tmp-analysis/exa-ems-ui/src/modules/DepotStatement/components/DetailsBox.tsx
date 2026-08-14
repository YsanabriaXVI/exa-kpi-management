import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
  CMultiSelect
} from '@coreui/react-pro'

type OptionValue = string | number | boolean

export interface SelectOption {
  value: OptionValue
  label: string
  disabled?: boolean
}

export interface DetailsBoxData {
  statementType?: number | string | null
  clientId?: number | string | null
  weeks?: Array<number | string>
  startDate?: number | string | null
  endDate?: number | string | null
  exchangeRate?: number | string | null
  createDate?: number | string | null
  comments?: string | null
  [key: string]: unknown
}

interface DetailsBoxProps {
  clientOptions: SelectOption[]
  weekOptions: SelectOption[]
  statementTypeOptions: SelectOption[]
  data: DetailsBoxData
}

const toInputValue = (value?: string | number | null): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

const toMultiSelectValue = (value?: Array<number | string>): string[] => {
  if (!Array.isArray(value)) return []
  return value.map(String)
}

const formatDateInputValue = (value?: number | string | null): string => {
  if (value === null || value === undefined || value === '') return ''

  let date: Date

  if (typeof value === 'number') {
    date = new Date(value * 1000)
  } else {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return String(value)
    date = parsed
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const formatDateTimeInputValue = (value?: number | string | null): string => {
  if (value === null || value === undefined || value === '') return ''

  let date: Date

  if (typeof value === 'number') {
    date = new Date(value * 1000)
  } else {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return String(value)
    date = parsed
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const DetailsBox: React.FC<DetailsBoxProps> = ({
  clientOptions,
  weekOptions,
  data,
  statementTypeOptions,
}) => {
  console.log('DetailsBox data', data)
  return (
    <CCard>
      <CCardHeader>
        <i className="fa fa-pencil-square-o fa-lg me-2" />
        <strong>Details</strong>
      </CCardHeader>

      <CCardBody>
        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="statementType">Statement Type</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormSelect
              id="statementType"
              name="statementType"
              value={data?.statementType as any}
              disabled
              options={statementTypeOptions as any}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="clientId">Client</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormSelect
              id="clientId"
              name="clientId"
              value={data?.clientId as any}
              disabled
              options={clientOptions as any}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel htmlFor="weeks">Weeks</CFormLabel>
          </CCol>
          <CCol md={9}>
          <CMultiSelect
              id="weeks"
              name="weeks"
              multiple
              value={data?.weeks as any}
              disabled
              options={weekOptions as any}
          /></CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="startDate">Start Date</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormInput
              id="startDate"   
              disabled
              type="text"
              name="startDate"
              value={formatDateInputValue(data?.startDate)}
              //onChange={onPickDate}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="endDate">End Date</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormInput
              id="endDate"   
              disabled
              type="text"
              name="endDate"
              value={formatDateInputValue(data?.endDate)}
              //onChange={onPickDate}
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="exchangeRate">Exchange Rate</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormInput
              id="exchangeRate"
              name="exchangeRate"
              value={toInputValue(data?.exchangeRate)}
              disabled
            />
          </CCol>
        </CRow>

        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="createDate">Statement Date</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormInput
              id="createDate"
              name="createDate"
              type="text"
              value={formatDateTimeInputValue(data?.createDate)}
              disabled
            />
          </CCol>
        </CRow>
        
        <CRow className="mb-3 align-items-center">
          <CCol md={3}>
            <CFormLabel htmlFor="createUserName">Created By</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormInput
              id="createUserName"
              name="createUserName"
              type="text"
              value={data?.createUserName as any}
              disabled
            />
          </CCol>
        </CRow>
        <CRow className="mb-3">
          <CCol md={3}>
            <CFormLabel htmlFor="comments">Notes</CFormLabel>
          </CCol>
          <CCol md={9}>
            <CFormTextarea
              id="comments"
              name="comments"
              value={toInputValue(data?.comments)}
              disabled
              rows={4}
            />
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default DetailsBox