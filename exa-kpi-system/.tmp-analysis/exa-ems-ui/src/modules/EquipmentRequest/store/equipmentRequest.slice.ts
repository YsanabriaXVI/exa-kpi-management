import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { equipmentRequestAPI } from '../api/equipmentRequest.api'
import { EquipmentRequirement, EquipmentRequestForm, EquipmentRequestLookups } from '../types'
import { equipmentSizeApi } from '../../EquipmentSize/api/equipmentSize.api'
import { clientsAPI } from '../../Assets/Clients/api/clients.api';
import { workOrderHelpers } from '../../WorkOrders/api/workorders.api';


const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

type LoadingState = {
  requirements: boolean
  current: boolean
  lookups: boolean
  trips: boolean
  saving: boolean
  deleting: boolean
  list: boolean
  listUnassigned: boolean
}

type EquipmentRequestState = {
  requirements: EquipmentRequirement[]
  current: EquipmentRequestForm | null
  lookups: Omit<EquipmentRequestLookups, 'trips'>
  trips: EquipmentRequestLookups['trips']
  loading: LoadingState
  error: string | null
  list: any[]
  listUnassigned: any[]
}

const initialState: EquipmentRequestState = {
  requirements: [],
  current: null,
  lookups: { clients: [], requestTypes: [], sizes: [], attrContainerTypes: [] },
  trips: [],
  loading: {
    requirements: false,
    current: false,
    lookups: false,
    trips: false,
    saving: false,
    deleting: false,
    list: false,
    listUnassigned: false
  },
  error: null,
  list: [],
  listUnassigned: [],
}

export const loadEquipmentRequestLookups = createAsyncThunk(
  'equipmentRequest/loadLookups',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // Keep orchestration in thunks, not pages. Sequential makes error handling simpler.
      const clients = await clientsAPI.getClients()
      const requestTypes = await equipmentRequestAPI.loadRequestTypes()
      const sizes = await equipmentSizeApi.fetchSizes()
      const wo_attrs = await workOrderHelpers.getAttributesWithItems()
      const attrContainerTypes = wo_attrs.find((a: any) => Number(a.attribute_id) === 77)?.items
      return { clients, requestTypes, sizes, attrContainerTypes }
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load lookups'))
    }
  }
)

export const loadRequirementsList = createAsyncThunk(
  'equipmentRequest/loadRequirementsList',
  async (_, { rejectWithValue }) => {
    try {
      return await equipmentRequestAPI.loadRequirementsList()
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load requirements list'))
    }
  }
)

export const loadUnassignedRequirementsList = createAsyncThunk(
  'equipmentRequest/loadUnassignedRequirementsList',
  async (_, { rejectWithValue }) => {
    try {
      const list = await equipmentRequestAPI.loadUnassignedRequestsList()
      console.log('slice loadUnassignedRequirementsList', list);
      return list
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load requirements list'))
    }
  }
)

export const loadEquipmentRequest = createAsyncThunk(
  'equipmentRequest/loadRequest',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      const { request, workOrderId } = await equipmentRequestAPI.loadRequest(id)
      if (workOrderId != null && !Number.isNaN(Number(workOrderId))) {
        dispatch(loadAssignedTrips(Number(workOrderId)))
      }
      return request
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load request'))
    }
  }
)

export const loadTripEquipmentRequest = createAsyncThunk(
  'equipmentRequest/loadTripRequest',
  async (workorderid: number, { dispatch, rejectWithValue }) => {
    try {
      const { request, workOrderId } = await equipmentRequestAPI.loadTripRequest(workorderid)
      return request
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load request'))
    }
  }
)

export const loadAssignedTrips = createAsyncThunk(
  'equipmentRequest/loadTrips',
  async (workOrderId: number, { rejectWithValue }) => {
    try {
      return await equipmentRequestAPI.loadAssignedTrips(workOrderId)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load assigned trips'))
    }
  }
)

export const createEquipmentRequest = createAsyncThunk(
  'equipmentRequest/create',
  async (form: EquipmentRequestForm, { rejectWithValue }) => {
    try {
      return await equipmentRequestAPI.createRequest(form)
    } catch (e: any) {
      console.log("error caught -->", e);
      return rejectWithValue(getApiErrorMessage(e, 'Failed to create request'))
    }
  }
)

export const updateEquipmentRequest = createAsyncThunk(
  'equipmentRequest/update',
  async (form: EquipmentRequestForm, { rejectWithValue }) => {
    try {
      return await equipmentRequestAPI.updateRequest(form)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to update request'))
    }
  }
)

export const saveEquipmentRequest = createAsyncThunk(
  'equipmentRequest/save',
  async (form: EquipmentRequestForm, { dispatch, rejectWithValue }) => {
    try {
      const id = form.requestDetails.equipmentRequestId

      const saved = id
        ? await equipmentRequestAPI.updateRequest(form)
        : await equipmentRequestAPI.createRequest(form)

      dispatch(loadRequirementsList())

      return saved
    } catch (e: any) {
      console.log('AXIOS ERROR:', e)
      console.log('AXIOS RESPONSE DATA:', e?.response?.data)
      console.log('AXIOS RESPONSE STATUS:', e?.response?.status)

      return rejectWithValue(getApiErrorMessage(e, 'Failed to save request'))
    }
  }
)

export const deleteRequest = createAsyncThunk(
  'equipmentRequest/deleteRequest',
  async (id: number, { dispatch, rejectWithValue }) => {
    try {
      await equipmentRequestAPI.deleteRequest(id)
      dispatch(loadRequirementsList())
      return id
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to delete request'))
    }
  }
)

export const deleteRequirement = createAsyncThunk(
  'equipmentRequest/deleteRequirement',
  async (requestId: number, { dispatch, rejectWithValue }) => {
    try {
      await equipmentRequestAPI.deleteRequirement(requestId)
      dispatch(loadRequirementsList())
      return requestId
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to delete requirement'))
    }
  }
)

export const deleteRequirementsBatch = createAsyncThunk(
  'equipmentRequest/deleteRequirementsBatch',
  async (requestIds: number[], { rejectWithValue }) => {
    try {
      // sequential to avoid thundering herd + easier error handling
      for (const id of requestIds) {
        await equipmentRequestAPI.deleteRequirement(id)
      }
      return requestIds
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to delete one or more requirements'))
    }
  }
)

export const bootstrapEquipmentRequestEdit = createAsyncThunk(
  'equipmentRequest/bootstrapEdit',
  async (
    args: { id?: number | null },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await dispatch(loadEquipmentRequestLookups()).unwrap()
      if (args.id) {
        await dispatch(loadEquipmentRequest(args.id)).unwrap()
      } else {
        dispatch(actions.loadDefaultRequest())
        dispatch(actions.resetTrips())
      }
      return true
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load page data'))
    }
  }
)

export const bootstrapWorkOrderEquipmentRequestEdit = createAsyncThunk(
  'equipmentRequest/bootstrapEditTripRequest',
  async (
    args: { id?: number | null },
    { dispatch, rejectWithValue }
  ) => {
    try {
      await dispatch(loadEquipmentRequestLookups()).unwrap()
      if (args.id) {
        await dispatch(loadTripEquipmentRequest(args.id)).unwrap()
      } else {
        dispatch(actions.loadDefaultRequest())
        dispatch(actions.resetTrips())
      }
      return true
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load page data'))
    }
  }
)

export const loadRequestsList = createAsyncThunk(
  'equipmentRequest/loadRequestsList',
  async (_, { rejectWithValue }) => {
    try {
      const list = await equipmentRequestAPI.loadRequestsList();
      console.log('slice loadRequestsList', list);
      return list;
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load requests list'))
    }
  }
)

export const getDefaultForm = (): EquipmentRequestForm => {
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

const slice = createSlice({
  name: 'equipmentRequest',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearCurrent: (state) => {
      state.current = null
    },
    loadDefaultRequest: (state) => {
      state.current = getDefaultForm()
      state.error = null
    },
    resetTrips: (state) => {
      state.trips = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadEquipmentRequestLookups.pending, (state) => {
        state.loading.lookups = true
        state.error = null
      })
      .addCase(loadEquipmentRequestLookups.fulfilled, (state, action) => {
        state.loading.lookups = false
        state.lookups = action.payload
      })
      .addCase(loadEquipmentRequestLookups.rejected, (state, action) => {
        state.loading.lookups = false
        state.error = action.payload as string
      })

      .addCase(loadRequirementsList.pending, (state) => {
        state.loading.requirements = true
        state.error = null
      })
      .addCase(loadRequirementsList.fulfilled, (state, action) => {
        state.loading.requirements = false
        state.requirements = action.payload.list
      })
      .addCase(loadRequirementsList.rejected, (state, action) => {
        state.loading.requirements = false
        state.error = action.payload as string
      })

      .addCase(loadEquipmentRequest.pending, (state) => {
        state.loading.current = true
        state.error = null
      })
      .addCase(loadEquipmentRequest.fulfilled, (state, action: PayloadAction<EquipmentRequestForm>) => {
        state.loading.current = false
        state.current = action.payload
      })
      .addCase(loadEquipmentRequest.rejected, (state, action) => {
        state.loading.current = false
        state.error = action.payload as string
      })
      .addCase(loadTripEquipmentRequest.pending, (state) => {
        state.loading.current = true
        state.error = null
      })
      .addCase(loadTripEquipmentRequest.fulfilled, (state, action: PayloadAction<EquipmentRequestForm>) => {
        state.loading.current = false
        state.current = action.payload
      })
      .addCase(loadTripEquipmentRequest.rejected, (state, action) => {
        state.loading.current = false
        state.error = action.payload as string
      })

      .addCase(loadAssignedTrips.pending, (state) => {
        state.loading.trips = true
      })
      .addCase(loadAssignedTrips.fulfilled, (state, action) => {
        state.loading.trips = false
        state.trips = action.payload
      })
      .addCase(loadAssignedTrips.rejected, (state, action) => {
        state.loading.trips = false
        state.error = action.payload as string
      })

      .addCase(saveEquipmentRequest.pending, (state) => {
        state.loading.saving = true
        state.error = null
      })
      .addCase(saveEquipmentRequest.fulfilled, (state, action) => {
        state.loading.saving = false
        state.current = action.payload
      })
      .addCase(saveEquipmentRequest.rejected, (state, action) => {
        state.loading.saving = false
        state.error = action.payload as string
      })

      .addCase(deleteRequest.pending, (state) => {
        state.loading.deleting = true
        state.error = null
      })
      .addCase(deleteRequest.fulfilled, (state) => {
        state.loading.deleting = false
      })
      .addCase(deleteRequest.rejected, (state, action) => {
        state.loading.deleting = false
        state.error = action.payload as string
      })

      .addCase(deleteRequirement.pending, (state) => {
        state.loading.deleting = true
        state.error = null
      })
      .addCase(deleteRequirement.fulfilled, (state) => {
        state.loading.deleting = false
      })
      .addCase(deleteRequirement.rejected, (state, action) => {
        state.loading.deleting = false
        state.error = action.payload as string
      })

      .addCase(deleteRequirementsBatch.pending, (state) => {
        state.loading.deleting = true
        state.error = null
      })
      .addCase(deleteRequirementsBatch.fulfilled, (state, action) => {
        state.loading.deleting = false
        // Keep UI responsive: optimistic remove from current requirements (if loaded)
        if (state.current) {
          const remove = new Set(action.payload)
          state.current.requirements = state.current.requirements.filter((r) => !r.requestId || !remove.has(r.requestId))
        }
      })
      .addCase(deleteRequirementsBatch.rejected, (state, action) => {
        state.loading.deleting = false
        state.error = action.payload as string
      })
      .addCase(loadRequestsList.pending, (state) => {
        state.loading.list = true
        state.error = null
      })
      .addCase(loadRequestsList.fulfilled, (state, action) => {
        state.loading.list = false
        state.list = action.payload.list
      })
      .addCase(loadRequestsList.rejected, (state, action) => {
        state.loading.list = false
        state.error = action.payload as string
      })
      .addCase(loadUnassignedRequirementsList.pending, (state) => {
        state.loading.listUnassigned = true
        state.error = null
      })
      .addCase(loadUnassignedRequirementsList.fulfilled, (state, action) => {
        state.loading.listUnassigned = false
        state.listUnassigned = action.payload.list
      })
      .addCase(loadUnassignedRequirementsList.rejected, (state, action) => {
        state.loading.listUnassigned = false
        state.error = action.payload as string
      })
  },
})

export const actions = slice.actions
export default slice.reducer
