import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CContainer,
  CSpinner,
  CLink,
} from '@coreui/react-pro'
import * as yup from 'yup'
import PageHero from 'src/components/PageHero'
import { useDispatch, useSelector } from 'react-redux'
import { set, type AppDispatch, type RootState } from '../../../store'
import {
  bootstrapEquipmentRequestEdit,
  loadAssignedTrips,
  saveEquipmentRequest,
  deleteRequirementsBatch,
  deleteRequest,
  actions,
} from '../store/equipmentRequest.slice'
import { Counter } from '../components/Counter'
import { Switches } from '../components/Switches'
import { RequestTopForm } from '../components/RequestTopForm'
import { EquipmentRequestTable } from '../components/EquipmentRequestTable'
import {
  CHASSIS_LABEL_KEY,
  CHASSIS_SIZE_ID_KEY,
  CONTAINER_LABEL_KEY,
  CONTAINER_SIZE_ID_KEY,
  DELETE_ALL_ACTION,
  DELETE_MANY_ACTION,
  DECREMENT_ACTION,
  EQUIPMENT_OWNER_KEYS_ARRAY,
  EQUIPMENT_SIZE_ID_KEYS_ARRAY,
  GENSET_LABEL_KEY,
  INCREMENT_ACTION,
  PLACEHOLDER,
  TRIP_LABEL_KEY,
} from '../components/feConstants'
import SuccesModalWithActions from 'src/components/SuccesModalWithActions'
import ErrorMessageModal from 'src/components/ErrorMessageModal'
import { EquipmentRequestForm, EquipmentRequirement, Option } from '../types'
import CIcon from '@coreui/icons-react'
import { cilArrowThickFromRight, cilSave, cilHistory, cilPaperclip } from '@coreui/icons'
import { useLocation } from 'react-router-dom'

type ErrorsMap = Record<string, string>

const invalidChars = /[?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]/

function buildErrorsMap(err: yup.ValidationError): ErrorsMap {
  const map: ErrorsMap = {}
  err.inner.forEach((e) => {
    if (e.path && !map[e.path]) map[e.path] = e.message
  })
  return map
}

function getTripAttributeId(requestTypes: any[]): number | null {
  const trip = requestTypes.find((rt: any) => rt.flat_name_id === 'trip')
  return trip?.attributeItemId ?? null
}

function getEquipmentSizeOptions(sizes: any[]): [Option[], Option[]] {
  const container = sizes.filter((s: any) => s.equipmentTypeId === 2)
  const chassis = sizes.filter((s: any) => s.equipmentTypeId === 1)
  const toOpt = (s: any) => ({ label: s.sizeType, value: s.sizeEquipmentId, relatedSizes: s.EqSizeRelationships })
  return [container.map(toOpt), chassis.map(toOpt)]
}

export default function EquipmentRequestEditPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const params = useParams()

  console.log('params', params)

  const rawId = params.id
  const isInsert = !rawId || rawId === 'new' || Number.isNaN(Number(rawId))
  const id = !isInsert ? Number(rawId) : null
  const isEdit = !isInsert

  const { current, lookups, trips, loading, error } = useSelector((state: RootState) => state.equipmentRequest);


  const [draft, setDraft] = useState<EquipmentRequestForm | null>(null)
  console.log('draft', draft)
  const [original, setOriginal] = useState<EquipmentRequestForm | null>(null)
  const [deletedIds, setDeletedIds] = useState<number[]>([])
  const [switches, setSwitches] = useState<[boolean, boolean, boolean]>([false, false, false])
  const [counter, setCounter] = useState<[number, number, number]>([1, 1, 1])
  const [counterAction, setCounterAction] = useState<[number | null, string | null]>([null, null])
  const [errorsMap, setErrorsMap] = useState<ErrorsMap>({})
  const [requirementsError, setRequirementsError] = useState<string>('')

  const [errorModalOpen, setErrorModalOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [savedData, setSavedData] = useState<any>({})
  const [tripsSearch, setTripsSearch] = useState(false)

  const tripAttrId = useMemo(() => getTripAttributeId(lookups.requestTypes), [lookups.requestTypes])
  const isTripRequest = !!(draft?.requestDetails.requestTypeId && tripAttrId && draft.requestDetails.requestTypeId === tripAttrId)

  const sizeOptions = useMemo(() => getEquipmentSizeOptions(lookups.sizes), [lookups.sizes]);
  const location = useLocation()
  const viewMode = new URLSearchParams(location.search).get('mode') === 'view' || Boolean(location.state?.viewMode)
  const isView = viewMode

  const attrContainerTypes = useMemo(() => {
    return (lookups.attrContainerTypes || [])
      .filter((c) => c && c.attribute_item_id !== undefined && c.attribute_item_id !== null && c.name)
      .map((c) => ({ value: Number(c.attribute_item_id), label: String(c.name) }))
  }, [lookups.attrContainerTypes])


  // bootstrap
  useEffect(() => {
    dispatch(bootstrapEquipmentRequestEdit({ id: id ?? undefined }))
  }, [dispatch, id])

  const loadData = () => {
  if (current) {
    console.log('current', current)
    console.log('structuredClone current', structuredClone(current))

    setDraft(structuredClone(current))

    const req0 = current.requirements[0]
    const clientOwnedContainer = (req0?.equipmentClientContainer ?? 0) === 1
    const clientOwnedChassis = (req0?.equipmentClientChassis ?? 0) === 1
    const clientOwnedGenset = (req0?.equipmentClientGenset ?? 0) === 1
    setSwitches([clientOwnedContainer, clientOwnedChassis, clientOwnedGenset])

    let lastContainer = 0
    let lastChassis = 0
    let lastGenset = 0

    for (let i = 0; i < current.requirements.length; i++) {
      const r = current.requirements[i]

      const hasContainer = r.containerSizeId != null && r.containerSizeId !== 0
      const hasChassis = r.chassisSizeId != null && r.chassisSizeId !== 0
      const hasGenset = (r.genset ?? 0) === 1

      if (hasContainer) lastContainer = i + 1
      if (hasChassis) lastChassis = i + 1
      if (hasGenset) lastGenset = i + 1
    }

    const nextCounter: [number, number, number] = [
      Math.max(1, lastContainer),
      Math.max(1, lastChassis),
      Math.max(0, lastGenset),
    ]

    setCounter(nextCounter)
    setCounterAction([null, null])
  }
}

  // sync store->local draft
  useEffect(() => {
  if (!current) return
  loadData()
  //setDraft((prev) => prev ?? structuredClone(current))
}, [current])

  /* useEffect(() => {
    if (error){ 
      setErrorModalOpen(true) 
      setErrorMessage(error) 
    }
  }, [error]) */

  useEffect(() => {
    console.log('error --Z', error)
      if (error && Array.isArray(error.errors)) {
        setErrorModalOpen(true);
        setErrorMessage(error.errors[0].message);
      }
  
      if (typeof error === "string") {
        setErrorModalOpen(true);
        setErrorMessage(error);
      }
    }, [error]);

  const schema = useMemo(() => {
    const requestDetails = yup.object({
      requestTypeId: yup
        .number()
        .typeError('Request type is required')
        .required('Request type is required'),
      clientId: yup
        .number()
        .typeError('Client is required')
        .required('Client is required'),
      referenceNumberBooking: yup
        .string()
        .required('Reference number is required')
        .test('no-invalid-chars', 'Contains invalid characters', (v) => !invalidChars.test(v ?? '')),
      workOrderId: yup.number().nullable().transform((v, o) => (o === '' ? null : v)),
      consignee: yup.string().nullable(),
      vesselCode: yup.string().nullable(),
      voyage: yup.string().nullable(),
      comments: yup.string().nullable(),
    })

    const requirementSchema = yup.object({
      tripId: isTripRequest ? yup.number().typeError('Trip is required').required('Trip is required') : yup.number().nullable(),
    })

    return yup.object({
      requestDetails,
      requirements: yup.array().of(requirementSchema),
    })
  }, [isTripRequest])

function buildValueMapByLabel(
  source: any[],
  target: any[]
): Map<number, number> {
  const targetByLabel = new Map<string, number>()

  for (const item of target) {
    targetByLabel.set(item.label.trim().toLowerCase(), item.value)
  }

  const result = new Map<number, number>()

  for (const item of source) {
    const sourceId = Number(item.value)
    const targetId = targetByLabel.get(item.label.trim().toLowerCase())

    if (!Number.isNaN(sourceId) && targetId !== undefined) {
      result.set(sourceId, targetId)
    }
  }

  return result
}

function getDefaultForm (): EquipmentRequestForm {
  const defaultRequirement: EquipmentRequirement = {
    tripId: null,
    equipmentClientContainer: 0,
    containerSizeId: null,
    equipmentClientChassis: 0,
    chassisSizeId: null,
    equipmentClientGenset: 0,
    genset: 1,
    containerlabel: 'Click here to add',
    chassislabel: 'Click here to add',
    triplabel: 'Click here to add',
    gensetlabel: 'Yes',
  }

  return {
    requestDetails: {
      equipmentRequestId: null,
      clientId: null,
      workOrderId: null,
      requestTypeId: null,
      referenceNumberBooking: null,
      consignee: null,
      vesselCode: null,
      voyage: null,
      comments: null,
    },
    requirements: [defaultRequirement],
  }
}

useEffect(() => {
  if (Array.isArray(trips) && trips.length > 0 && !isEdit) {
      setDraft((prev) => {
        if (!prev) return prev

        const next = structuredClone(prev)

        next.requestDetails.clientId = trips[0]?.clientid ?? next.requestDetails.clientId
        next.requestDetails.requestTypeId = 1526
        next.requestDetails.referenceNumberBooking =
          trips[0]?.refNumber ?? next.requestDetails.referenceNumberBooking
        next.requestDetails.workOrderId =
          trips[0]?.workorderid ?? next.requestDetails.workOrderId

        const emptyRequirement = {
            "tripId": null,
            "equipmentClientContainer": 0,
            "containerSizeId": null,
            "equipmentClientChassis": 0,
            "chassisSizeId": null,
            "equipmentClientGenset": 0,
            "genset": 0,
            "containerlabel": "Click here to add",
            "chassislabel": "Click here to add",
            "triplabel": "Click here to add",
            "gensetlabel": ""
        }

        const newRequirements: any[] = []

        const containerMap = buildValueMapByLabel(attrContainerTypes, sizeOptions[0]);
        console.log('🔍 [useEffect] containerMap:', containerMap)
        console.log('🔍 [useEffect] TRIPS:', trips)
        console.log('🔍 [useEffect] SIZES:', lookups.sizes)

        let containers = trips.length;
        let chassis = trips.length;
        let genset = 0;

        trips.forEach((trip) => {
          
          const containerSizeId = containerMap.get(trip.containertypeid as any) ?? null
          const container = lookups.sizes.find((s: any) => Number(s.sizeEquipmentId) === Number(containerSizeId))
          newRequirements.push({
            ...emptyRequirement, 
            tripId: trip.tripsid,
            containerSizeId,
            containerlabel: container?.sizeType ?? "Click here to add",
            genset: container?.fridge ?? 0,
            gensetlabel: container?.fridge ? "Yes" : "No"
          })

          genset = container?.fridge === 1 ? genset + 1 : genset;
        })

        function sortGensetFirst(items: any[]) {
        return [...items].sort((a, b) => b.genset - a.genset)
        }

        next.requirements = sortGensetFirst(newRequirements)

        console.log('🔍 [useEffect] next.requirements:', next.requirements)

        setDraft(next)
        setCounter([containers, chassis, genset])

        return next
      })
  } else if (
    Array.isArray(trips) &&
    trips.length === 0 &&
    !isEdit &&
    tripsSearch &&
    draft?.requestDetails.workOrderId !== null
) {
  const defaultForm = getDefaultForm()
  defaultForm.requestDetails.workOrderId = draft?.requestDetails.workOrderId ?? null
  setDraft(defaultForm)
  setCounter([1, 1, 1])
}
  
}, [trips])

  const onTopChange = async (name: string, value: string) => {
  const isId = name.toLowerCase().endsWith('id')
  const isWorkOrderId = name === 'workOrderId'

  if (isWorkOrderId) {
    const cleaned = value.replace(/[^0-9]/g, '')
    const workOrderId = cleaned === '' ? null : Number(cleaned)

    setDraft((prev) => {
      if (!prev) return prev

      const next = structuredClone(prev)
      next.requestDetails.workOrderId = workOrderId

      // clear trips when work order changes
      next.requirements = next.requirements.map((r) => ({
        ...r,
        tripId: null,
        triplabel: PLACEHOLDER,
      }))

      return next
    })

    if (workOrderId) {
      await dispatch(loadAssignedTrips(workOrderId)).unwrap().catch(() => null)
    }

    if (workOrderId === null) {
      dispatch(actions.loadDefaultRequest())
    }

    setTripsSearch(true)

    return
  }

  setDraft((prev) => {
    if (!prev) return prev

    const next = structuredClone(prev)

    if (isId) {
      const nextValue = value === '' ? null : Number(value)
      ;(next.requestDetails as any)[name] = nextValue

      // if switching away from trip request, clear selected trips
      if (name === 'requestTypeId' && tripAttrId && nextValue !== tripAttrId) {
        next.requirements = next.requirements.map((r) => ({
          ...r,
          tripId: null,
          triplabel: PLACEHOLDER,
        }))
      }
    } else {
      ;(next.requestDetails as any)[name] = value
    }

    return next
  })
}

  const setSingleColumnValue = (sizeKey: string, sizeValue: string, labelKey: string, label: string) => {
    if (!draft) return
    const next = structuredClone(draft)
    next.requirements = next.requirements.map((r) => {
      if ((r as any)[labelKey] === PLACEHOLDER) {
        ;(r as any)[sizeKey] = sizeValue === '' ? null : Number(sizeValue)
        ;(r as any)[labelKey] = label
      }
      return r
    })
    setDraft(next)
  }

  const onCellChange = (rowIndex: number, field: string, value: string) => {
    if (!draft) return

    const next = structuredClone(draft)
    const row = next.requirements[rowIndex]
    if (!row) return

    if (field === CONTAINER_LABEL_KEY) {
      // legacy behavior: row 0 can apply to all placeholder rows
      if (rowIndex === 0 && row.containerSizeId == null) {
        const opt = sizeOptions[0].find((o) => String(o.value) === value)
        setSingleColumnValue(CONTAINER_SIZE_ID_KEY, value, CONTAINER_LABEL_KEY, opt?.label ?? PLACEHOLDER)
        return
      }
      row.containerSizeId = value === '' ? null : Number(value)
      row.containerlabel = sizeOptions[0].find((o) => String(o.value) === value)?.label ?? PLACEHOLDER
    }

    if (field === CHASSIS_LABEL_KEY) {
      if (rowIndex === 0 && row.chassisSizeId == null) {
        const opt = sizeOptions[1].find((o) => String(o.value) === value)
        setSingleColumnValue(CHASSIS_SIZE_ID_KEY, value, CHASSIS_LABEL_KEY, opt?.label ?? PLACEHOLDER)
        return
      }
      row.chassisSizeId = value === '' ? null : Number(value)
      row.chassislabel = sizeOptions[1].find((o) => String(o.value) === value)?.label ?? PLACEHOLDER
    }

    if (field === TRIP_LABEL_KEY) {
      row.tripId = value === '' ? null : Number(value)
      row.triplabel = value === '' ? PLACEHOLDER : value
    }

    setDraft(next)
  }

  const onSwitchChange = (index: number, checked: boolean) => {
    if (!draft) return
    const next = structuredClone(draft)
    const ownerKey = EQUIPMENT_OWNER_KEYS_ARRAY[index]
    const sizeKey = EQUIPMENT_SIZE_ID_KEYS_ARRAY[index]

    next.requirements = next.requirements.map((r) => {
      if (checked) {
        const hasSize = (r as any)[sizeKey] != null && (r as any)[sizeKey] !== 0 && !Number.isNaN(Number((r as any)[sizeKey]))
        ;(r as any)[ownerKey] = hasSize ? 1 : 0
      } else {
        ;(r as any)[ownerKey] = 0
      }
      return r
    })

    const nextSwitches = [...switches] as [boolean, boolean, boolean]
    nextSwitches[index] = checked
    setSwitches(nextSwitches)
    setDraft(next)
  }

  const onIncrement = (equipmentIndex: number) => {
    const next = [...counter] as [number, number, number]
    next[equipmentIndex] += 1
    setCounter(next)
    setCounterAction([equipmentIndex, INCREMENT_ACTION])
  }

  const onDecrement = (equipmentIndex: number) => {
    const next = [...counter] as [number, number, number]
    if (next[equipmentIndex] <= 0) return
    next[equipmentIndex] -= 1
    setCounter(next)
    setCounterAction([equipmentIndex, DECREMENT_ACTION])
  }

  const onCounterChange = (equipmentIndex: number, raw: string) => {
    const currentValue = counter[equipmentIndex]
    const newValue = Math.max(0, Number(raw) || 0)

    const next = [...counter] as [number, number, number]
    next[equipmentIndex] = newValue

    let actionType: string | null = null
    if (newValue === 0) actionType = DELETE_ALL_ACTION
    else if (currentValue > newValue) actionType = DELETE_MANY_ACTION
    else if (currentValue < newValue) actionType = INCREMENT_ACTION

    setCounter(next)
    setCounterAction([equipmentIndex, actionType])
  }

  const onDeleteRow = (rowIndex: number) => {
    if (!draft) return

    const next = structuredClone(draft)
    const nextDeleted = [...deletedIds]
    const row = next.requirements[rowIndex]

    if (row?.requestId) nextDeleted.push(row.requestId)

    next.requirements.splice(rowIndex, 1)

    // adjust counters (legacy)
    const nextCounter = [...counter] as [number, number, number]
    nextCounter.forEach((c, i) => {
      if (rowIndex + 1 <= c) nextCounter[i] = Math.max(0, c - 1)
    })

    setDeletedIds(nextDeleted)
    setCounter(nextCounter)
    setCounterAction([null, null])
    setDraft(next)
  }

  const clearEmptyRequirements = (reqs: EquipmentRequirement[]) => {
    const next = [...reqs]
    const emptyIdx: number[] = []

    next.forEach((r, idx) => {
      const nullContainer = r.containerSizeId == null
      const nullChassis = r.chassisSizeId == null
      const nullGenset = r.genset == null || r.genset === 0
      if (nullContainer && nullChassis && nullGenset) emptyIdx.push(idx)
    })

    emptyIdx.sort((a, b) => b - a)
    for (const idx of emptyIdx) next.splice(idx, 1)
    return next
  }

  const save = async () => {
    if (!draft) return

    setErrorsMap({})
    setRequirementsError('')

    const nextDraft = structuredClone(draft)
    nextDraft.requirements = clearEmptyRequirements(nextDraft.requirements)
    setDraft(nextDraft)

    // requirement trip validation message (legacy-style)
    if (isTripRequest) {
      const anyMissingTrip = nextDraft.requirements.some((r) => !r.tripId)
      if (anyMissingTrip) {
        setErrorMessage('Please fill in all required trips');
        setErrorModalOpen(true)
        return
      }
    }

    try {
      await schema.validate(nextDraft, { abortEarly: false })
    } catch (err: any) {
      setErrorsMap(buildErrorsMap(err))
      return
    }

    // Handle deletions first (legacy behavior)
    if (deletedIds.length > 0) {
      const allRequirementsDeleted = nextDraft.requirements.length === 0
      const reqId = nextDraft.requestDetails.equipmentRequestId

      if (allRequirementsDeleted && reqId) {
        await dispatch(deleteRequest(reqId)).unwrap().catch(() => null)
        setSuccessModalOpen(true)
        return
      }

      await dispatch(deleteRequirementsBatch([...deletedIds].sort((a, b) => b - a))).unwrap().catch(() => null)
      setDeletedIds([])
    }

    await dispatch(saveEquipmentRequest(nextDraft)).unwrap().then((resp) => {
      console.log("response: ",resp)
      setSavedData(resp?.requestDetails)
      setSuccessModalOpen(true)
      setSuccessMessage(isInsert ? 'Equipment request created successfully.' : 'Equipment request updated successfully.')
    }).catch(() => null)
  }

  const title = isInsert ? 'Add Equipment Request' : isView ? `View Equipment Request #${id}` : `Edit Equipment Request #${id}`

  if (!draft || loading.lookups || loading.current) {
    return (
      <CContainer fluid>
        <PageHero kicker="Depot" icon="cilTruck" title={title} subtitle="Loading..." />
        <div className="d-flex justify-content-center mt-4">
          <CSpinner />
        </div>
      </CContainer>
    )
  }

  return (
    <CContainer fluid>
      <PageHero
        kicker="Depot"
        icon="cilTruck"
        title={title}
        subtitle="Create and manage requirements"
        highlights={
          draft.requestDetails.workOrderId
            ? [{ label: 'Work Order', value: String(draft.requestDetails.workOrderId) }]
            : undefined
        }
        actions={ trips.length > 0 &&
          <div className="d-flex align-items-center">
          <Link
              to={`/operations/workorders/order/${draft.requestDetails.workOrderId}`}
              className="text-decoration-none font-weight-bold"
            >
               See Work Order <strong className="text-primary">#{draft.requestDetails.workOrderId}</strong>
            </Link>
          </div>
        }
      />
      

      <CCard className="mt-3">
        <CCardBody>
          <RequestTopForm
            clients={lookups.clients}
            requestTypes={lookups.requestTypes}
            value={draft.requestDetails}
            errors={errorsMap}
            onChange={onTopChange}
            isView={isView}
            isTripRequest={isTripRequest}
            isEdit={isEdit}
          />

          <br />
          <br />
          <br />

        <div className={`eq-wrap ${isTripRequest ? 'with-trip' : 'no-trip'}`}>

          <Switches value={switches} onChange={onSwitchChange} isTripRequest={isTripRequest} isView={isView} isEdit={isEdit}/>
          <Counter
            value={counter}
            isTripRequest={isTripRequest}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onChange={onCounterChange}
            isView={isView}
            isEdit={isEdit}
          />
      

          <EquipmentRequestTable
            rows={draft.requirements}
            setRows={(r) => setDraft({ ...draft, requirements: r })}
            deletedIds={deletedIds}
            setDeletedIds={setDeletedIds}
            counter={counter}
            counterAction={counterAction}
            isTripRequest={isTripRequest}
            sizeOptions={sizeOptions}
            trips={trips}
            onCellChange={onCellChange}
            onDeleteRow={onDeleteRow}
            errors={requirementsError}
            isView={isView}
            isEdit={isEdit}
          /></div>
        </CCardBody>
        <CCardFooter className="d-flex justify-content-end gap-2">
          <CButton color="secondary" className="text-white" 
            onClick={() => navigate("/depot-main/equipment-request")}>
            <CIcon icon={cilArrowThickFromRight} className="me-2" />
            Go Back
          </CButton>
          {!isView && <CButton color="primary" className="text-white" onClick={save} style={{marginLeft: "3px"}}>
            <CIcon icon={cilSave} className="me-2" />
            {loading.saving ? 'Saving...' : 'Save Request'}
          </CButton>}
          {!isView && <CButton
            color="warning"
            className="me-2"
            //variant="outline"
            onClick={() => {
              loadData()
            }}
          >
            <CIcon icon={cilHistory} className="me-2" />
            Reset Edition
          </CButton>}
        </CCardFooter>
      </CCard>

      <ErrorMessageModal
        showErrorModal={errorModalOpen}
        setShowErrorModal={setErrorModalOpen}
        errorMessage={errorMessage}
      />
      <SuccesModalWithActions
        showSuccessModal={successModalOpen}
        setShowSuccessModal={setSuccessModalOpen}
        savedData={savedData}
        recordIdKey="equipmentRequestId"
        isEdit={isEdit}
        successMessage={successMessage}
        onClickCreateAnother = {() => navigate(0)}
        onClickContinueEditing = {() => {
          navigate(`/depot-main/equipment-request/${savedData.equipmentRequestId}`)
          setSuccessModalOpen(false)
        }}
        onClickBackToOverview = {() => navigate('/depot-main/equipment-request')}
      />
    </CContainer>
  )
}
