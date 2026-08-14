import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
  CMultiSelect,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilCheckCircle, cilLibrary, cilSave } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import type { RootState, AppDispatch } from '../../../store'
import { loadIncident, createIncident, updateIncident, clearCurrentIncident } from '../store/incidents.slice'
import type { Incident } from '../types'
import { permissionService, UPDATE, CREATE } from '../../../services/auth/permission.service'
import { MODULE_INCIDENTS, MODULES_ID } from '../../../constants/modules'
import { loadAttributesList } from '../../Attributes/store/attributesSlice'
import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { loadSubdivisions } from '../../Assets/Subdivisions/store/subdivisions.slice'
import { loadDrivers } from '../../Assets/Drivers/store/drivers.slice'
import { loadTrucks } from '../../Assets/Trucks/store/trucks.slice'
import { loadEquipments } from '../../Assets/Equipments/store/equipments.slice'
import { attributesAPI } from '../../Attributes/api/attributes.api'
import { gasSuppliersAPI, GasSupplierOption } from '../api/gasSuppliers.api'
import Comments from '../../../components/Comments/Comments'
import Attachments from '../../../components/Attachments/Attachments'
import './IncidentForm.scss'

const defaultIncident: Incident = {
  subject: '',
  description: '',
  incident_type: '',
  incident_cause: '',
  responsible: '',
  event_date: '',
  driver_id: '',
  driver_name: '',
  truck_id: '',
  truck_plate: '',
  chassis_id: '',
  chassis_no: '',
  genset_id: '',
  genset_no: '',
  client_id: '',
  client_name: '',
  subdivision_id: '',
  subdivision_name: '',
  trip_id: '',
  gas_supplier_id: '',
  gas_supplier_name: '',
}

const ATTRIBUTE_INCIDENT_TYPE = 89
const ATTRIBUTE_INCIDENT_CAUSE = 90
const ATTRIBUTE_INCIDENT_RESPONSIBLE = 91

const IncidentFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id && id !== 'new')
  const navigate = useNavigate()
  const location = useLocation()
  const viewMode = new URLSearchParams(location.search).get('mode') === 'view'
  const dispatch = useDispatch<AppDispatch>()

  const { current, loading } = useSelector((state: RootState) => (state as any).incidents || {})
  const attributesState = useSelector((state: RootState) => (state as any).attributes || {})
  const clientsState = useSelector((state: RootState) => (state as any).clients || {})
  const subdivisionsState = useSelector((state: RootState) => (state as any).subdivisions || {})
  const driversState = useSelector((state: RootState) => (state as any).drivers || {})
  const trucksState = useSelector((state: RootState) => (state as any).trucks || {})
  const equipmentsState = useSelector((state: RootState) => (state as any).equipments || {})
  const [attributeOptions, setAttributeOptions] = useState<{ types: any[]; causes: any[]; responsibles: any[] }>({
    types: [],
    causes: [],
    responsibles: [],
  })
  const [gasSupplierOptions, setGasSupplierOptions] = useState<GasSupplierOption[]>([])
  const [contentReady, setContentReady] = useState(false)

  const [formValues, setFormValues] = useState<Incident>({ ...defaultIncident })
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const toaster = useRef<any>(null)
  const [toast, setToast] = useState<any>(null)

  const canEdit = !viewMode && permissionService.checkPermission(MODULE_INCIDENTS, isEdit ? UPDATE : CREATE)

  const showToast = (message: string, color: 'success' | 'danger' | 'warning' | 'info') => {
    setToast(
      <CToast autohide={true} delay={5000} color={color} className="text-white align-items-center">
        <div className="d-flex">
          <CToastBody>{message}</CToastBody>
          <CToastClose className="me-2 m-auto" white />
        </div>
      </CToast>
    )
  }

  useEffect(() => {
    const loadAll = async () => {
      const promises = []
      if (isEdit && id) {
        promises.push(dispatch(loadIncident(id)))
      } else {
        dispatch(clearCurrentIncident())
        setFormValues(defaultIncident)
      }
      promises.push(dispatch(loadAttributesList({ moduleId: MODULES_ID[MODULE_INCIDENTS], rows: 500, first: 0 } as any)))
      promises.push(dispatch(loadClients()))
      promises.push(dispatch(loadSubdivisions()))
      promises.push(dispatch(loadDrivers()))
      promises.push(dispatch(loadTrucks()))
      promises.push(dispatch(loadEquipments('chassis')))
      promises.push(dispatch(loadEquipments('genset')))
      promises.push(
        gasSuppliersAPI
          .getGasSuppliers()
          .then((options) => setGasSupplierOptions(options))
          .catch(() => setGasSupplierOptions([]))
      )

      try {
        await Promise.all(promises)
      } catch (error) {
        console.error('Failed to load incident data', error)
        showToast('Failed to load some data', 'warning')
      } finally {
        setContentReady(true)
      }
    }
    loadAll()
  }, [dispatch, id, isEdit])

  useEffect(() => {
    if (current) {
      setFormValues({ ...defaultIncident, ...current })
    }
  }, [current])

  const handleChange = (key: keyof Incident, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }))
  }

  const eventDateInput = useMemo(() => {
    if (!formValues.event_date) return ''
    const num = Number(formValues.event_date)
    if (!Number.isNaN(num)) {
      return new Date(num * 1000).toISOString().slice(0, 10)
    }
    const date = new Date(formValues.event_date as any)
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
  }, [formValues.event_date])

  useEffect(() => {
    const loadAttributeItems = async () => {
      const attrs = attributesState.attributes || []
      const targetIds = [ATTRIBUTE_INCIDENT_TYPE, ATTRIBUTE_INCIDENT_CAUSE, ATTRIBUTE_INCIDENT_RESPONSIBLE]
      const resolved: Record<string, any[]> = {}

      const fetchItems = async (attrId: number) => {
        const local = (attrs as any[]).find((a) => Number(a.attribute_id) === Number(attrId))
        if (local?.items?.length) return local.items
        try {
          const full = await attributesAPI.getAttribute(attrId)
          return full.items || []
        } catch {
          return []
        }
      }

      for (const attrId of targetIds) {
        const items = await fetchItems(attrId)
        resolved[String(attrId)] = items.map((it: any) => ({
          value: String(it.attribute_item_id ?? it.id ?? it.value ?? ''),
          label: it.name ?? it.value ?? '',
        }))
      }

      setAttributeOptions({
        types: resolved[String(ATTRIBUTE_INCIDENT_TYPE)] || [],
        causes: resolved[String(ATTRIBUTE_INCIDENT_CAUSE)] || [],
        responsibles: resolved[String(ATTRIBUTE_INCIDENT_RESPONSIBLE)] || [],
      })
    }

    loadAttributeItems()
  }, [attributesState.attributes])

  const parseMultiValue = (val?: string) =>
    (val ? String(val).split(',').map((v) => v.trim()).filter(Boolean) : [])

  const typeValue = parseMultiValue(formValues.incident_type)
  const causeValue = parseMultiValue(formValues.incident_cause)
  const responsibleValue = parseMultiValue(formValues.responsible)

  const typeLabel = useMemo(() => {
    if (!typeValue.length) return '—'
    return typeValue.map((v) => attributeOptions.types.find((o) => String(o.value) === String(v))?.label || String(v)).join(', ')
  }, [typeValue, attributeOptions.types])

  const causeLabel = useMemo(() => {
    if (!causeValue.length) return '—'
    return causeValue.map((v) => attributeOptions.causes.find((o) => String(o.value) === String(v))?.label || String(v)).join(', ')
  }, [causeValue, attributeOptions.causes])

  const responsibleLabel = useMemo(() => {
    if (!responsibleValue.length) return '—'
    return responsibleValue.map((v) => attributeOptions.responsibles.find((o) => String(o.value) === String(v))?.label || String(v)).join(', ')
  }, [responsibleValue, attributeOptions.responsibles])

  const clientOptions = useMemo(
    () =>
      (clientsState.list || []).map((c: any) => ({
        value: String(c.client_id ?? c.id ?? ''),
        label: c.name,
      })),
    [clientsState.list]
  )

  const subdivisionOptions = useMemo(
    () =>
      (subdivisionsState.list || []).map((s: any) => ({
        value: String(s.subdivision_id ?? s.id ?? ''),
        label: s.name,
      })),
    [subdivisionsState.list]
  )

  const driverOptions = useMemo(
    () =>
      (driversState.list || []).map((d: any) => ({
        value: String(d.asset_id ?? d.id ?? ''),
        label:
          [d.first_name ?? d.attributes?.['21'], d.last_name ?? d.attributes?.['22']]
            .filter(Boolean)
            .join(' ') ||
          d.generic_name1 ||
          d.internal_identification ||
          'Driver',
      })),
    [driversState.list]
  )

  const truckOptions = useMemo(
    () =>
      (trucksState.list || []).map((t: any) => ({
        value: String(t.asset_id ?? t.id ?? ''),
        label:
          t.attributes?.['8'] ||
          t.truck_plate ||
          t.plate ||
          t.generic_name1 ||
          t.internal_identification ||
          'Truck',
      })),
    [trucksState.list]
  )

  const chassisOptions = useMemo(
    () =>
      ((equipmentsState?.chassis?.list as any[]) || []).map((c: any) => ({
        value: String(c.asset_id ?? c.assetsid ?? c.id ?? ''),
        label: c.attributes?.['30'] || c.generic_name1 || c.identification || c.name || 'Chassis',
      })),
    [equipmentsState?.chassis?.list]
  )

  const gensetOptions = useMemo(
    () =>
      ((equipmentsState?.genset?.list as any[]) || []).map((g: any) => ({
        value: String(g.asset_id ?? g.assetsid ?? g.id ?? ''),
        label: g.attributes?.['31'] || g.generic_name1 || g.identification || g.name || 'Genset',
      })),
    [equipmentsState?.genset?.list]
  )

  const shouldVirtualScroll = (options: any[]) => options.length > 20

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    setSaving(true)
    try {
      const payload: Incident = {
        ...formValues,
      }
      if (payload.event_date && typeof payload.event_date === 'string' && payload.event_date.includes('T')) {
        payload.event_date = Math.floor(new Date(payload.event_date).getTime() / 1000)
      }
      if (isEdit && id) {
        await dispatch(updateIncident({ id, payload })).unwrap()
      } else {
        const created = await dispatch(createIncident(payload)).unwrap()
        navigate(`/operations/incidents/${created.incident_id ?? created.id}`)
      }
      setShowSuccess(true)
    } catch (error: any) {
      showToast(typeof error === 'string' ? error : error?.message || 'Failed to save incident', 'danger')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CContainer fluid>
      <CToaster ref={toaster} push={toast} placement="top-end" />
      
      {!contentReady ? (
        <div className="incident-form-loading d-flex flex-column align-items-center justify-content-center">
          <CSpinner color="primary" size="xl" className="mb-3" />
          <div className="text-center">
            <div className="fw-semibold">Loading incident information</div>
            <small className="text-body-secondary">Please wait while we fetch the latest data.</small>
          </div>
        </div>
      ) : (
        <>
          <PageHero
            kicker="Operations"
            icon={cilLibrary}
            title={viewMode ? 'View Incident' : isEdit ? 'Edit Incident' : 'Create Incident'}
            subtitle="Log incident details and responsible parties."
          />

          <CForm onSubmit={handleSubmit}>
            <CRow className="g-4">
              <CCol xs={12}>
                <CCard className="shadow-sm border-0">
                  <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
                    <div>
                      <div className="section-kicker text-uppercase fw-semibold">Details</div>
                      <div className="section-title fw-bold">Incident Information</div>
                      <small className="text-body-secondary">Subject, date, description and classifications.</small>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    <CRow className="g-3">
                      <CCol md={6}>
                        <CFormLabel>Subject</CFormLabel>
                        <CFormInput
                          value={formValues.subject ?? ''}
                          onChange={(e) => handleChange('subject', e.target.value)}
                          placeholder="Incident subject"
                          required
                          disabled={!canEdit}
                        />
                      </CCol>
                      <CCol md={6}>
                        <CFormLabel>Incident Date</CFormLabel>
                        <CFormInput
                          type="date"
                          value={eventDateInput}
                          onChange={(e) => handleChange('event_date', e.target.value)}
                          disabled={!canEdit}
                        />
                      </CCol>
                      <CCol md={12}>
                        <CFormLabel>Description</CFormLabel>
                        <CFormTextarea
                          rows={3}
                          value={formValues.description ?? ''}
                          onChange={(e) => handleChange('description', e.target.value)}
                          disabled={!canEdit}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Incident Type</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={typeLabel} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={attributeOptions.types}
                            value={typeValue}
                            onChange={(selected: any) => {
                              const opts = Array.isArray(selected) ? selected : [selected]
                              const values = (opts || []).map((o: any) => o?.value ?? o).filter(Boolean)
                              handleChange('incident_type', values.join(','))
                            }}
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            virtualScroller={shouldVirtualScroll(attributeOptions.types)}
                            multiple
                            selectionType="tags"
                            closeOnSelect={false}
                            placeholder="Select types"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Incident Cause</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={causeLabel} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={attributeOptions.causes}
                            value={causeValue}
                            onChange={(selected: any) => {
                              const opts = Array.isArray(selected) ? selected : [selected]
                              const values = (opts || []).map((o: any) => o?.value ?? o).filter(Boolean)
                              handleChange('incident_cause', values.join(','))
                            }}
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            virtualScroller={shouldVirtualScroll(attributeOptions.causes)}
                            multiple
                            selectionType="tags"
                            closeOnSelect={false}
                            placeholder="Select causes"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Responsible</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={responsibleLabel} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={attributeOptions.responsibles}
                            value={responsibleValue}
                            onChange={(selected: any) => {
                              const opts = Array.isArray(selected) ? selected : [selected]
                              const values = (opts || []).map((o: any) => o?.value ?? o).filter(Boolean)
                              handleChange('responsible', values.join(','))
                            }}
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            virtualScroller={shouldVirtualScroll(attributeOptions.responsibles)}
                            multiple
                            selectionType="tags"
                            closeOnSelect={false}
                            placeholder="Select responsible parties"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol xs={12}>
                <CCard className="shadow-sm border-0">
                  <CCardHeader className="truck-section-header d-flex justify-content-between align-items-center">
                    <div>
                      <div className="section-kicker text-uppercase fw-semibold">Links</div>
                      <div className="section-title fw-bold">Assets & References</div>
                      <small className="text-body-secondary">Reference related assets to this incident.</small>
                    </div>
                  </CCardHeader>
                  <CCardBody>
                    <CRow className="g-3">
                      <CCol md={4}>
                        <CFormLabel>Driver</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.driver_name || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={driverOptions}
                            value={formValues.driver_id ? String(formValues.driver_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('driver_id', opt?.value ?? '')
                              handleChange('driver_name', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(driverOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select driver"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Truck Plate</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.truck_plate || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={truckOptions}
                            value={formValues.truck_id ? String(formValues.truck_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('truck_id', opt?.value ?? '')
                              handleChange('truck_plate', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(truckOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select truck"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Chassis</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.chassis_no || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={chassisOptions}
                            value={formValues.chassis_id ? String(formValues.chassis_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('chassis_id', opt?.value ?? '')
                              handleChange('chassis_no', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(chassisOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select chassis"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Genset</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.genset_no || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={gensetOptions}
                            value={formValues.genset_id ? String(formValues.genset_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('genset_id', opt?.value ?? '')
                              handleChange('genset_no', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(gensetOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select genset"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Trip #</CFormLabel>
                        <CFormInput
                          value={formValues.trip_id ?? ''}
                          onChange={(e) => handleChange('trip_id', e.target.value)}
                          disabled={!canEdit}
                          readOnly={viewMode}
                        />
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Client</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.client_name || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={clientOptions}
                            value={formValues.client_id ? String(formValues.client_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('client_id', opt?.value ?? '')
                              handleChange('client_name', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(clientOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select client"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Subdivision</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.subdivision_name || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={subdivisionOptions}
                            value={formValues.subdivision_id ? String(formValues.subdivision_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('subdivision_id', opt?.value ?? '')
                              handleChange('subdivision_name', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(subdivisionOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select subdivision"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                      <CCol md={4}>
                        <CFormLabel>Gas Supplier</CFormLabel>
                        {viewMode ? (
                          <CFormInput value={formValues.gas_supplier_name || '—'} readOnly />
                        ) : (
                          <CMultiSelect
                            className="multiselect-teal"
                            options={gasSupplierOptions}
                            value={formValues.gas_supplier_id ? String(formValues.gas_supplier_id) : ''}
                            onChange={(selected: any) => {
                              const opt = Array.isArray(selected) ? selected[0] : selected
                              handleChange('gas_supplier_id', opt?.value ?? '')
                              handleChange('gas_supplier_name', opt?.label ?? '')
                            }}
                            virtualScroller={shouldVirtualScroll(gasSupplierOptions)}
                            multiple={false}
                            selectionType="tags"
                            dropdownStyle={{ maxHeight: 260, overflowY: 'auto' }}
                            placeholder="Select gas supplier"
                            disabled={!canEdit}
                          />
                        )}
                      </CCol>
                    </CRow>
                  </CCardBody>
                </CCard>
              </CCol>

              <CCol xs={12}>
                <div className="truck-form-actions d-flex justify-content-between align-items-center flex-wrap gap-2 mb-5">
                  <CButton color="secondary" variant="ghost" type="button" onClick={() => navigate('/operations/incidents')} disabled={saving}>
                    <CIcon icon={cilArrowLeft} className="me-2" />
                    Back
                  </CButton>
                  {canEdit && (
                    <CButton color="primary" type="submit" className="text-white" disabled={saving}>
                      {saving ? <CSpinner size="sm" className="me-2" /> : <CIcon icon={cilSave} className="me-2" />}
                      {isEdit ? 'Save Changes' : 'Create Incident'}
                    </CButton>
                  )}
                </div>
              </CCol>
            </CRow>
          </CForm>

          {formValues.incident_id && (
            <>
              <Comments
                moduleId={MODULES_ID[MODULE_INCIDENTS]}
                itemId={Number(formValues.incident_id)}
                canAdd={canEdit}
                canEdit={canEdit}
                canDelete={canEdit}
              />
              <Attachments
                moduleId={MODULES_ID[MODULE_INCIDENTS]}
                itemId={Number(formValues.incident_id)}
                canAdd={canEdit}
                canDelete={canEdit}
                canView={true}
              />
            </>
          )}

          <CToast autohide visible={false} />

          <CToast
            autohide={false}
            visible={showSuccess}
            onClose={() => setShowSuccess(false)}
            color="success"
            className="text-white"
          >
            <CToastBody>
              <CIcon icon={cilCheckCircle} className="me-2" />
              Incident saved successfully.
            </CToastBody>
          </CToast>
        </>
      )}
    </CContainer>
  )
}

export default IncidentFormPage
