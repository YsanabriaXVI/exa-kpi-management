import React, { useCallback, useEffect, useMemo, useState} from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react-pro'
import { cilLocationPin } from '@coreui/icons'
import PageHero from '../../../../components/PageHero'
import AddDepotForm from '../components/AddDepotForm'
import { clientsAPI } from '../api/clients.api'
import { depotsAPI } from '../../../Depots/api/depots.api'
import { depotSetupAPI } from '../api/depotSetups.api'
import { equipmentSizeApi } from '../../../EquipmentSize/api/equipmentSize.api'
import { jobsAPI } from '../api/jobs.api' // <- if you have an endpoint for genset list; if not, remove
import SuccesModalWithActions from 'src/components/SuccesModalWithActions'
import ErrorMessageModal from 'src/components/ErrorMessageModal'


type DepotSetupApi = {
  setupId: number
  clientId: number
  depotId: number
  ediGateCode?: string
  ediBookingCode?: string
  taxRate?: string | number
  emailNotification?: number | string | boolean
  imagesOnEmail?: number | string | boolean
  jobs_data?: JobRateRow[]
}

type JobRateRow = {
  jobRateId: number
  equipmentSizeId: number | null
  gensetTypeId: number | null
  setupId: number
  jobId: number
  MHEmpty?: string
  MHLoaded?: string
  CHEmpty?: string
  CHLoaded?: string
  PriceOrQty?: string
}

type FormState = {
  clientId?: number | string
  depotId?: string | number
  ediGateCode?: string
  ediBookingCode?: string
  taxRate?: string
  emailNotification?: string | number | boolean
  imagesOnEmail?: string | number | boolean
}

interface ErrorWithResponse {
  response?: {
    data?: {
      message?: string
    }
  }
  message?: string
}

const defaultFormState: FormState = {
  depotId: '',
  ediGateCode: '',
  ediBookingCode: '',
  taxRate: '',
  emailNotification: '0',
  imagesOnEmail: '0',
}

const toFlagValue = (v: any) => (v === true || v === 1 || v === '1' ? '1' : '0')

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

const AddDepotEditPage: React.FC = () => {
  const navigate = useNavigate()
  const { clientId, setupId } = useParams<{ clientId: string; setupId?: string }>()

  const isEdit = Boolean(setupId && setupId !== 'new')

  const [client, setClient] = useState<any>(null)
  const [formData, setFormData] = useState<FormState>({ ...defaultFormState, clientId })
  const [depots, setDepots] = useState<any[]>([])
  const [clientSetups, setClientSetups] = useState<any[]>([])
  const [sizesList, setSizesList] = useState<any[]>([])
  const [gensetTypesList, setGensetTypesList] = useState<any[]>([])
  const [jobsData, setJobsData] = useState<JobRateRow[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [savedData, setSavedData] = useState<any>({})

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const location = useLocation()
  const viewMode = Boolean(location.state?.viewMode)


  // ✅ memoized, so useEffect won't rerun due to function identity changes
  const loadData = useCallback(async () => {
    if (!clientId) {
      setLoading(false)
      setShowErrorModal(true)
      setErrorMessage('Missing clientId in route.')
      return
    }

    setLoading(true)
    setShowErrorModal(false)
    setErrorMessage('')

    try {
      const [clientResp, depotsResp, setupsResp, sizesResp, gensetTypesResp] = await Promise.all([
        clientsAPI.getClient(clientId).catch(() => null),
        depotsAPI.getDepots().catch(() => []),
        depotSetupAPI.getClientSetups(clientId).catch(() => []),
        equipmentSizeApi.fetchSizes().catch(() => []),
        jobsAPI.loadAttributeItems('genset_type', 'genset').catch(() => []),
      ])

      setClient(clientResp)
      setDepots(Array.isArray(depotsResp) ? depotsResp : [])
      setClientSetups(Array.isArray(setupsResp) ? setupsResp : [])
      setSizesList(Array.isArray(sizesResp) ? sizesResp : [])
      setGensetTypesList(Array.isArray(gensetTypesResp) ? gensetTypesResp : [])

      // NEW mode
      if (!isEdit || !setupId) {
        setFormData({ ...defaultFormState, clientId })
        setJobsData([])
        return
      }

      // EDIT mode
      const setupResp = await depotSetupAPI.getDepotSetup(setupId)

      // ✅ your API returns array [ { setup... } ]
      const setup: DepotSetupApi | null = Array.isArray(setupResp)
        ? (setupResp[0] as DepotSetupApi) ?? null
        : (setupResp as DepotSetupApi) ?? null

      if (!setup) {
        setShowErrorModal(true)
        setErrorMessage('Depot setup not found.')
        setJobsData([])
        return
      }

      setFormData({
        clientId: setup.clientId ?? clientId,
        depotId: setup.depotId != null ? String(setup.depotId) : '',
        ediGateCode: setup.ediGateCode ?? '',
        ediBookingCode: setup.ediBookingCode ?? '',
        taxRate: setup.taxRate != null ? String(setup.taxRate) : '',
        emailNotification: toFlagValue(setup.emailNotification),
        imagesOnEmail: toFlagValue(setup.imagesOnEmail),
      })

      // ✅ THIS populates Size Charges table
      setJobsData(Array.isArray(setup.jobs_data) ? setup.jobs_data : [])
    } catch (e) {
      console.error(e)
      setShowErrorModal(true)
      setErrorMessage('Unable to load depot setup data.')
    } finally {
      setLoading(false)
    }
  }, [clientId, isEdit, setupId])

  // ✅ effect depends only on memoized loadData
  useEffect(() => {
    loadData()
  }, [loadData])

  const usedDepotIds = useMemo(() => {
    const currentSetupId = String(setupId ?? '')
    return new Set(
      (clientSetups ?? [])
        .filter((s: any) => String(s.setupId) !== currentSetupId)
        .map((s: any) => String(s.depotId ?? s.depot?.depotId ?? '')),
    )
  }, [clientSetups, setupId])

  const depotOptions: SelectOption[] = useMemo(() => {
    return (depots ?? []).map((d: any) => {
      const value = d.depotId ?? d.depot_id ?? d.id ?? d.value
      const label = d.depotName || d.name || `Depot ${value}`
      return {
        value: String(value),
        label,
        disabled: usedDepotIds.has(String(value)),
      }
    })
  }, [depots, usedDepotIds])

  const handleChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

const getErrorMessage = (err: any, fallback = "Something went wrong.") => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    (typeof err === "string" ? err : fallback)
  )
}


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!clientId) return

  if (!formData.depotId) {
    setErrorMessage("Please select a depot before saving.")
    setShowErrorModal(true)
    return
  }

  try {
    setSaving(true)
    setErrorMessage("")
    setShowErrorModal(false)

    const payload = {
      clientId: Number(clientId),
      depotId: Number(formData.depotId),
      ediGateCode: formData.ediGateCode || null,
      ediBookingCode: formData.ediBookingCode || null,
      taxRate: formData.taxRate ? Number(formData.taxRate) : null,
      emailNotification: toFlagValue(formData.emailNotification) === "1" ? 1 : 0,
      imagesOnEmail: toFlagValue(formData.imagesOnEmail) === "1" ? 1 : 0,
      status: 1,
      active: 1,
    }

    if (isEdit && setupId) {
      const saved = await depotSetupAPI.updateDepotSetup(setupId, payload as any)
      setSavedData(saved)
    } else {
      const saved = await depotSetupAPI.createDepotSetup(payload as any)
      setSavedData(saved)
    }

    setShowSuccessModal(true)
    setSuccessMessage('Depot setup saved successfully.')
  } catch (err: any) {
    console.error(err)

    const message = getErrorMessage(
      err,
      "Unable to save the depot setup. Please try again."
    )

    setErrorMessage(message)
    setShowErrorModal(true)
  } finally {
    setSaving(false)
  }
}


  const handleCancel = () => {
    navigate(`/assets/clients/${clientId}`)
  }

  const goToSizeChargesPage = (id: number | null = null) => {
    if (!clientId) return
    if (!setupId) return

    if (typeof id !== 'number') {
      navigate(`/assets/clients/${clientId}/depot-setup/${setupId}/size-charges/new`)
    } else {
      navigate(`/assets/clients/${clientId}/depot-setup/${setupId}/size-charges/${id}`)
    }
  }

  const goToSizeChargesPageOnViewMode = (id: number | null = null) => {
    navigate(`/assets/clients/${clientId}/depot-setup/${setupId}/size-charges/${id}`, { state: { viewMode: true } })
  }

  // same behavior as old deleteJobs(sizeId)
const deleteJobs = async (sizeId: number) => {
  if (!setupId) return

  try {
    const deleted = await jobsAPI.deleteJobRatesGroup(Number(setupId), sizeId)

    if (deleted) {
      // ✅ update UI state
      setJobsData((prev) =>
        prev.filter((r) => {
          const key = r.equipmentSizeId ?? r.gensetTypeId
          return !(String(r.setupId) === String(setupId) && String(key) === String(sizeId))
        })
      )

      setSavedData({ recordIdKey: "setupId" })
      setSuccessMessage("Size charges deleted successfully.")
      setShowSuccessModal(true)
    }
  } catch (e: ErrorWithResponse | any) {
    const msg =
      typeof e === "string"
        ? e
        : e?.response?.data?.message ||
          e?.message ||
          "Failed to delete size charges."

    setErrorMessage(msg)
    setShowErrorModal(true)
  }
}


  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: 240 }}>
        <CSpinner color="primary" className="mb-3" />
        <div className="fw-semibold">Loading depot setup…</div>
      </div>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Client Management"
        icon={cilLocationPin}
        title={isEdit ? 'Edit Depot Setup' : 'Add Depot Setup'}
        subtitle={client ? `${client.name || 'Client'} • ID #${client.client_id ?? clientId}` : `Client #${clientId}`}
      />

      <AddDepotForm
        saving={saving}
        isEdit={isEdit}
        formData={formData}
        handleChange={handleChange as any}
        handleSubmit={handleSubmit}
        handleCancel={handleCancel}
        depotOptions={depotOptions}
        goToSizeChargesPage={goToSizeChargesPage}
        goToSizeChargesPageOnViewMode={goToSizeChargesPageOnViewMode}
        jobs_data={jobsData}
        sizesList={sizesList}
        gensetTypesList={gensetTypesList}
        deleteJobs={deleteJobs}
        viewMode={viewMode}
      />
      <SuccesModalWithActions 
        showSuccessModal={showSuccessModal} 
        setShowSuccessModal={setShowSuccessModal}
        successMessage={successMessage}
        isEdit={isEdit}
        savedData={savedData}
        recordIdKey="setupId"
        onClickCreateAnother={() => {
          navigate(0)
          setShowSuccessModal(false)
        }}
        onClickContinueEditing={() => {
          navigate(`/assets/clients/${clientId}/depot-setup/${savedData.setupId}`)
          setShowSuccessModal(false)
        }}
        onClickBackToOverview={() => {
          navigate(`/assets/clients/${clientId}`)
          setShowSuccessModal(false)
        }}
      />
      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
        
      <br />
    </CContainer>
  )
}

export default AddDepotEditPage
