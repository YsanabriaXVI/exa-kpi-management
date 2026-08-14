import React from 'react'
import {
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormSwitch,
  CRow,
  CButton,
  CCollapse
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilArrowThickFromBottom, cilPlus } from '@coreui/icons'

import CreateTruckForm from './CreateTruckForm'
import type { GateType, GateTruckDraft, LastTripInfo, NewDriverObject, SelectOption, NewTruckObject } from '../types'
import { AutoSuggest } from 'src/components'
import apiClient from 'src/services/api/axios.config'
import { AutoSuggestOption } from 'src/components/AutoSuggest'


type Props = {
  gateType: GateType
  value: GateTruckDraft
  haulageTypeOptions: SelectOption[]
  lastTripInfo?: LastTripInfo | null
  containerLoaded?: boolean
  containerHaulageId?: number | string | null
  containerControlsEnabled?: boolean
  onChangeContainerLoaded?: (next: boolean) => void
  onChangeContainer?: any
  showCreateForm: boolean
  toggleCreateForm: any
  newDriverValue: NewDriverObject
  newTruckErrors?: Record<string, string>
  newDriverErrors?: Record<string, string>
  onSaveNewTruckAndDriver: () => void
  errors?: Record<string, string>
  onChange: (name: keyof GateTruckDraft, value: any) => void
  viewMode?: boolean
  isTripRequest?: boolean
  containerData?: any
  colorOptions: any[]
  subdivisionOptions: any[]
  newTruckValue: NewTruckObject
  onChangeNewTruck: any
  containerErrors: any
}

export default function TruckForm({
  gateType,
  value,
  haulageTypeOptions,
  lastTripInfo,
  containerControlsEnabled,
  showCreateForm,
  toggleCreateForm,
  newTruckErrors,
  newDriverErrors,
  onSaveNewTruckAndDriver,
  onChange,
  viewMode,
  isTripRequest,
  containerData,
  colorOptions,
  subdivisionOptions,
  newTruckValue,
  onChangeNewTruck,
  newDriverValue,
  containerErrors,
  onChangeContainer
}: Props) {

  console.log("truck form viewMode", viewMode)

  const searchTruckOptions = async (query: string): Promise<AutoSuggestOption[]> => {
  const response = await apiClient.get(`/assets-service/truck-unfiltered/search?query=${query}`)
  return response.data.map((container: any) => ({
    value: container.value,
    label: container.label,
    data: container  // Optional: full object for later use
  }))
}

  const searchDriverOptions = async (query: string): Promise<AutoSuggestOption[]> => {
  const response = await apiClient.get(`/assets-service/driver-unfiltered/search?query=${query}`)
  return response.data.map((container: any) => ({
    value: container.value,
    label: container.label,
    data: container  // Optional: full object for later use
  }))
}

// Fetch by ID - called for pre-population (optional)
const fetchTruckById = async (id: number): Promise<AutoSuggestOption | null> => { //api/assets-service
  console.log("fetchTruckById", id)
  const response = await apiClient.get(`/assets-service/truck-unfiltered/search?query=${id}`)
  const container = (response.data || []).find((container: any) => container.value === id)

  return {
    value: container.value,
    label: container.label,
    data: container
  }
}

const fetchDriverById = async (id: number): Promise<AutoSuggestOption | null> => { //api/assets-service
  console.log("fetchDriverById", id)
  const response = await apiClient.get(`/assets-service/driver-unfiltered/search?query=${id}`)
  const driver = (response.data || []).find((driver: any) => driver.value === id)

  return {
    value: driver.value,
    label: driver.label,
    data: driver
  }
}



  return (
    <CCard>
      <CCardBody>
        <CRow className="g-3" style={{ marginBottom: 20 }}>
          <CCol sm={12} xl={5}>
            <AutoSuggest
              key={value?.truckId ?? 'no-truck'}
              label="Truck"
              name='truckId'
              value={value?.truckId ?? ''}
              onChange={(option) =>  onChange({ target: {...option, name: 'truckId'} } as any, "4")}
              onSearch={searchTruckOptions}
              onFetchById={fetchTruckById}
              placeholder="Search Truck..."
              minCharacters={2}
              disabled={viewMode || isTripRequest}
              //invalid={!truckId}
              //feedbackInvalid="Chassis is required"
            />
            <AutoSuggest
              key={value?.driverId ?? 'no-driver'}
              label="Driver"
              name='driverId'
              value={value?.driverId ?? ''}
              onChange={(option) =>  onChange({ target: {...option, name: 'driverId'} } as any, "4")}
              onSearch={searchDriverOptions}
              onFetchById={fetchDriverById}
              placeholder="Search Driver..."
              minCharacters={2}
              disabled={viewMode || isTripRequest}
              //invalid={!driverId}
              //feedbackInvalid="Chassis is required"
            />

            {gateType === 'IN' && !viewMode && (
              <div >
                <br />
                <br />
                 <CButton color="secondary" className="text-white" onClick={() => toggleCreateForm(4, !showCreateForm)}>
                    <CIcon icon={showCreateForm ? cilArrowThickFromBottom : cilPlus} className="me-2" />
                    {showCreateForm ? 'Hide New Truck Form' : 'Add New Truck'}
                  </CButton>
              </div>
            )}
          </CCol>

          <CCol sm={12} xl={2}>
            <CCard>
            <CCardBody>
            <div style={{ fontWeight: 500, color: '#17C2F9', textAlign: 'center' }}><strong>Last Trip Information</strong></div>
            <br />
            <div><strong>Trip ID</strong> <span style={{ color: '#99a7ac' }}>{lastTripInfo?.tripId}</span></div>
            <div><strong>Client</strong> <span style={{ color: '#99a7ac' }}>{lastTripInfo?.client}</span></div>
            <div><strong>Route</strong> <span style={{ color: '#99a7ac' }}>{lastTripInfo?.route}</span></div>
            <div><strong>Status</strong> <span style={{ color: '#99a7ac' }}>{lastTripInfo?.status}</span></div>
            </CCardBody>
            </CCard>
          </CCol>

          <CCol sm={12} xl={5}>
            {containerControlsEnabled ? (
              <div>
                <CRow className="align-items-center mb-2">
                  <CCol>
                    <CFormSelect
                      name="haulage"
                      label="Haulage Type"
                      onChange={onChangeContainer}
                      value={containerData.haulage ?? ''}
                      options={haulageTypeOptions as any}
                      disabled={viewMode}
                      invalid={containerErrors?.haulage && typeof containerErrors.haulage === 'string'}
                      feedbackInvalid={containerErrors?.haulage}
                    />
                  </CCol>
                </CRow>
                <CRow className="align-items-center mb-2">
                  <CCol >
                    <CFormSwitch
                      label="Loaded"
                      name="loaded"
                      checked={containerData.loaded ?? false}
                      onChange={onChangeContainer}
                      disabled={viewMode}
                      size='lg'
                    />
                  </CCol>
                </CRow>
              </div>
            ) : null}
          </CCol>
        </CRow>
          <CCollapse visible={showCreateForm && gateType === 'IN' && !viewMode}>
          <CreateTruckForm
            truck={newTruckValue}
            driver={newDriverValue}
            truckErrors={newTruckErrors}
            driverErrors={newDriverErrors}
            onChange={onChangeNewTruck}
            onSave={onSaveNewTruckAndDriver}
            onClose={() => toggleCreateForm(4, false)}
            colorOptions={colorOptions}
            subdivisionOptions={subdivisionOptions}
          />
          </CCollapse>
      
      </CCardBody>
    </CCard>
  )
}