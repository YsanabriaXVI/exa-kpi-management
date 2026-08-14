// src/modules/Depots/pages/DepotsEditPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { loadLocations } from '../../Locations/store/locationsSlice';
import type { RootState } from '../../../store'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CContainer,
  CRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilArrowLeft, cilSave, cilLocationPin } from '@coreui/icons'

import PageHero from '../../../components/PageHero'
import type { AppDispatch } from '../../../store'
import DepotsForm, { DepotsFormValues } from '../components/DepotsForm'

import {
  addDepot,
  saveDepot,
  fetchDepots,
  loadDefaultDepot,
  loadDepotFromList,
  resetStatuses,
  selectDepotsCurrent,
  selectDepotsErrors,
  selectDepotsSaving,
  selectDepotsStatuses,
} from '../store/depots.slice'

type LocationOption = { value: string; label: string }

const toOption = (loc: any): LocationOption => {
  const id = loc?.locationId ?? loc?.location_id ?? loc?.id
  const name = loc?.name ?? ''
  const cityName = loc?.city?.name
  const label = cityName ? `${name}, ${cityName}` : name
  return { value: String(id ?? ''), label: label || `#${id}` }
}

const uniqByValue = (opts: LocationOption[]) => {
  const seen = new Set<string>()
  return opts.filter((o) => {
    if (!o.value) return false
    if (seen.has(o.value)) return false
    seen.add(o.value)
    return true
  })
}

const toFormValues = (depot: any | null): DepotsFormValues => {
  if (!depot) {
    return { depotName: '', depotCode: '', location: '', active: '1' }
  }

  // legacy: cuando se carga, location debe ser locationId (string)
  const locationId = depot.locationId ?? depot.location?.locationId ?? depot.location?.id
  const active = depot.active !== undefined && depot.active !== null ? String(depot.active) : '1'

  return {
    depotId: depot.depotId,
    depotName: depot.depotName ?? '',
    depotCode: depot.depotCode ?? depot.depot_code ?? '',
    location: locationId ? String(locationId) : '',
    active,
  }
}

const fixFormPayload = (form: DepotsFormValues) => {
  // legacy _fixForm
  return {
    locationId: parseInt(form.location, 10),
    depotName: form.depotName,
    depotCode: form.depotCode,
    active: parseInt(form.active, 10),
    status: 1,
  }
}

const getErrorMessage = (payload: any): string => {
  if (!payload) return 'Something went wrong!'

  // string directo
  if (typeof payload === 'string') return payload

  // backend: { errors: [{ message }] }
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const first = payload.errors[0]
    if (typeof first?.message === 'string') return first.message
  }

  // backend: [{ message }]
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0]
    if (typeof first?.message === 'string') return first.message
  }

  // backend: { message }
  if (typeof payload?.message === 'string') return payload.message

  return 'Something went wrong!'
}


const DepotsEditPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const params = useParams()

  const isNew = params.id === 'new' || !params.id
  const idNum = !isNew ? Number(params.id) : 0

  const current = useSelector(selectDepotsCurrent)
  const saving = useSelector(selectDepotsSaving)
  const errors = useSelector(selectDepotsErrors)
  const statuses = useSelector(selectDepotsStatuses)

  const { locations } = useSelector((state: RootState) => state.locations);

  const [form, setForm] = useState<DepotsFormValues>(() => toFormValues(null))

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const locationOptions: LocationOption[] = useMemo(() => {
    const base = Array.isArray(locations) ? locations : []

    // 1) mapear + ordenar (equivalente a renderOptions)
    let opts = base
      .map(toOption)
      .filter((o) => o.value && o.label)
      .sort((a, b) => a.label.localeCompare(b.label))

    // 2) si el depot tiene location embebida y no está en el catálogo, agregarla
    const currentLocObj = (current as any)?.locationObj ?? (current as any)?.location
    if (currentLocObj) {
      const extra = toOption(currentLocObj)
      const exists = opts.some((o) => o.value === extra.value)
      if (!exists && extra.value) {
        opts = [...opts, extra].sort((a, b) => a.label.localeCompare(b.label))
      }
    }

    return uniqByValue(opts)
  }, [locations, current])

  useEffect(() => {
    dispatch(loadLocations())
    dispatch(fetchDepots())

    if (isNew) {
      dispatch(loadDefaultDepot())
      return
    }

    if (Number.isFinite(idNum) && idNum > 0) {
      dispatch(loadDepotFromList(idNum))
    }
  }, [dispatch, isNew, idNum])


  useEffect(() => {
    setForm(toFormValues(current))
  }, [current])

  useEffect(() => {
    if (!errors) return
    const toast = (window as any).exaToast
    const msg = typeof errors === 'string' ? errors : 'An error occurred saving Depot'
    toast?.error ? toast.error('Error', msg) : console.error(msg)
  }, [errors])

  useEffect(() => {
    if (!statuses) return
    const toast = (window as any).exaToast

    if (statuses.updated) toast?.success?.('Success', 'Depot was Updated')
    if (statuses.added) toast?.success?.('Success', 'Depot was Added')

    if (statuses.updated || statuses.added) {
      dispatch(resetStatuses())
      navigate('/depot/depots')
    }
  }, [statuses, dispatch, navigate])

  const handleBack = () => navigate('/depot/depots')

  const handleSubmit = async () => {
    try {
      const payload = fixFormPayload(form)

      let result: any
      if (isNew) {
        result = await dispatch(addDepot(payload as any))
      } else {
        if (!form.depotId) return
        result = await dispatch(saveDepot({ depotId: form.depotId, ...payload } as any))
      }

      if (result?.meta?.requestStatus === 'rejected') {
        const msg = getErrorMessage(result?.payload)
        setErrorMessage(msg)
        setShowErrorModal(true)
        return
      }

      if (result?.meta?.requestStatus === 'fulfilled') {
        navigate('/depot/depots')
        return
      }

      throw new Error(getErrorMessage(result?.payload))
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err))
      setShowErrorModal(true)
    }
  }

  const title = isNew ? 'Add Depot' : 'Edit Depot'

  return (
    <CContainer fluid>
      <PageHero
        kicker="Depots"
        icon={cilLocationPin}
        title={title}
      />

      <CRow>
        <CCol lg={12}>
          <CCard>
            <CCardHeader>
              <strong>{title}</strong>
            </CCardHeader>

            <CCardBody>
              <DepotsForm
                value={form}
                onChange={setForm}
                onSubmit={handleSubmit}
                disabled={saving}
                locationOptions={locationOptions}
              />
            </CCardBody>

            <CCardFooter className="d-flex justify-content-end gap-2">
              <CButton color="secondary" variant="outline" onClick={handleBack} disabled={saving}>
                Cancel
              </CButton>

              <CButton color="primary" className="text-white" onClick={handleSubmit} disabled={saving}>
                <CIcon icon={cilSave} className="me-2" />
                Save
              </CButton>
            </CCardFooter>
          </CCard>
        </CCol>
      </CRow>
      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </CContainer>
  )
}

export default DepotsEditPage