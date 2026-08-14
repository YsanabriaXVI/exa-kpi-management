import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { jobsAPI, type JobRatesForm, type JobRateRow, type AttributeItem } from '../api/jobs.api'
import { current } from "@reduxjs/toolkit";

/* ---------------- State ---------------- */

export interface JobsState {
  // list shown in “setup jobs list” screens (old: state.jobs.list)
  list: JobRateRow[]

  // current “job rates group” being edited (old: state.jobs.job)
  job: JobRatesForm | null

  // dropdown lists (old: jobOptionsList / gensetTypesList)
  jobOptionsList: AttributeItem[]
  gensetTypesList: AttributeItem[]

  errors: string | null
  isLoading: boolean

  // optional flags that your old reducers used
  errMessage: string | null
  wasAdded: boolean
  wasUpdated: boolean
}

const initialState: JobsState = {
  list: [],
  job: null,
  jobOptionsList: [],
  gensetTypesList: [],
  errors: null,
  isLoading: false,
  errMessage: null,
  wasAdded: false,
  wasUpdated: false,
}

/* ---------------- Error helper ---------------- */

const getApiErrorMessage = (error: any, fallback: string) => {
  const msgFromArray = error?.response?.data?.errors?.[0]?.message
  const msgFromMessage = error?.response?.data?.message
  const msgFromError = error?.message
  return msgFromArray || msgFromMessage || msgFromError || fallback
}

/* ---------------- Thunks ---------------- */

/** old: loadAttributeItems('job_type','clients','jobOptionsList') */
export const loadJobOptions = createAsyncThunk(
  'jobs/loadJobOptions',
  async (_, { rejectWithValue }) => {
    try {
      return await jobsAPI.loadAttributeItems('job_type', 'clients')
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load job options'))
    }
  },
)

/** old: loadAttributeItems('genset_type','genset','gensetTypesList') */
export const loadGensetTypes = createAsyncThunk(
  'jobs/loadGensetTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await jobsAPI.loadAttributeItems('genset_type', 'genset')
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load genset types'))
    }
  },
)

/** old: loadJobRateslist(setupId) */
export const loadJobRatesList = createAsyncThunk(
  'jobs/loadJobRatesList',
  async (setupId: number, { rejectWithValue }) => {
    try {
      return await jobsAPI.loadJobRatesList(setupId) // { list }
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load job rates list'))
    }
  },
)

/** old: loadJobRatesGroup(setupId, sizeId) */
export const loadJobRatesGroup = createAsyncThunk(
  'jobs/loadJobRatesGroup',
  async (
    args: { setupId: number; sizeId: number },
    { rejectWithValue },
  ) => {
    try {
      const res = await jobsAPI.loadJobRatesGroup(args.setupId, args.sizeId) // { job }
      return res.job
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to load job rates group'))
    }
  },
)

/** old: loadDefaultJob(setupId) */
export const loadDefaultJob = createAsyncThunk(
  'jobs/loadDefaultJob',
  async (setupId: number) => {
    // no API call; matches old behavior
    return jobsAPI.getDefaultJob(setupId)
  },
)

/** old: addJobRates(form) */
export const addJobRates = createAsyncThunk(
  'jobs/addJobRates',
  async (form: JobRatesForm, { rejectWithValue }) => {
    try {
      return await jobsAPI.addJobRates(form) // { job, stats }
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to save job rates'))
    }
  },
)

/** old: deleteJobRates(id) */
export const deleteJobRate = createAsyncThunk(
  'jobs/deleteJobRate',
  async ({ jobRateId: id }: { jobRateId: number }, { rejectWithValue }) => {
    try {
      await jobsAPI.deleteJobRates({ jobRateId: id })
      return id
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to delete job rate'))
    }
  },
)

/** old: deleteJobRatesGroup(setupId, sizeId) */
export const deleteJobRatesGroup = createAsyncThunk(
  'jobs/deleteJobRatesGroup',
  async (args: { setupId: number; sizeId: number }, { rejectWithValue }) => {
    try {
      await jobsAPI.deleteJobRatesGroup(args.setupId, args.sizeId)
      return args
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to delete job rates group'))
    }
  },
)

/* ---------------- Slice ---------------- */

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.errors = null
      state.errMessage = null
    },
    resetStatuses: (state) => {
      // mirrors old RESET_STATUSES intent
      state.errMessage = null
      state.errors = null
      state.wasAdded = false
      state.wasUpdated = false
    },
    clearJob: (state) => {
      state.job = null
    },
    setJob: (state, action: PayloadAction<JobRatesForm | null>) => {
      state.job = action.payload
    },
    // handy local reducer for UI edits (optional)
    setJobRows: (state, action: PayloadAction<JobRateRow[]>) => {
      if (!state.job) return
      ;(state.job as any).jobs_data = action.payload as any
    },
  },
  extraReducers: (builder) => {
    /* loadJobOptions */
    builder
      .addCase(loadJobOptions.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadJobOptions.fulfilled, (state, action) => {
        state.isLoading = false
        state.jobOptionsList = action.payload
      })
      .addCase(loadJobOptions.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* loadGensetTypes */
    builder
      .addCase(loadGensetTypes.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadGensetTypes.fulfilled, (state, action) => {
        state.isLoading = false
        state.gensetTypesList = action.payload
      })
      .addCase(loadGensetTypes.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* loadJobRatesList */
    builder
      .addCase(loadJobRatesList.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadJobRatesList.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.list
      })
      .addCase(loadJobRatesList.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* loadJobRatesGroup */
    builder
      .addCase(loadJobRatesGroup.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadJobRatesGroup.fulfilled, (state, action) => {
        state.isLoading = false
        state.job = action.payload as any
      })
      .addCase(loadJobRatesGroup.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* loadDefaultJob */
    builder
      .addCase(loadDefaultJob.pending, (state) => {
        state.isLoading = false
        state.errors = null
      })
      .addCase(loadDefaultJob.fulfilled, (state, action) => {
        state.job = action.payload as any
      })
      .addCase(loadDefaultJob.rejected, (state, action) => {
        state.errors = action.payload as string
      })

    /* addJobRates */
    builder
      .addCase(addJobRates.pending, (state) => {
        state.isLoading = true
        state.errors = null
        state.errMessage = null
        state.wasAdded = false
        state.wasUpdated = false
      })
      .addCase(addJobRates.fulfilled, (state, action) => {
        state.isLoading = false

        state.job = action.payload.job as any
        state.wasAdded = Boolean(action.payload.stats?.wasAdded)
        state.wasUpdated = Boolean(action.payload.stats?.wasUpdated)

        // Old thunk did: list.push(record) (but record was array)
        // Here, we’ll refresh list by merging best-effort:
        // If API returned an array, append it; otherwise leave list unchanged.
        console.log('action.payload.job', action.payload.job)
        console.log('state.list', current(state.list))
        const payloadJob = action.payload.job as any
        if (Array.isArray(payloadJob)) {
          state.list = [...state.list, ...payloadJob]
        }
      })
      .addCase(addJobRates.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* deleteJobRate */
    builder
      .addCase(deleteJobRate.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteJobRate.fulfilled, (state, action) => {
        state.isLoading = false

        const deletedId = String(action.meta.arg.jobRateId)
        console.log("current state", current(state.job))

        if (Array.isArray(state.job?.jobs_data)) {
          state.job.jobs_data = state.job.jobs_data.filter(
            (r: any) => String(r.jobRateId) !== deletedId
          )
        }

        console.log("filtered state", current(state.job))

        state.list = state.list.filter(
          (r: any) => String(r.jobRateId) !== deletedId
        )

      })
      .addCase(deleteJobRate.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* deleteJobRatesGroup */
    builder
      .addCase(deleteJobRatesGroup.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteJobRatesGroup.fulfilled, (state, action) => {
        state.isLoading = false
        const { setupId, sizeId } = action.payload

        // Remove from list items that match the group
        state.list = state.list.filter(
          (r: any) => !(r.setupId === setupId && r.equipmentSizeId === sizeId),
        )

        // If current job matches the group, clear it
        if ((state.job as any)?.setupId === setupId) {
          const currentSize = (state.job as any)?.equipmentSizeId ?? (state.job as any)?.gensetTypeId
          if (Number(currentSize) === Number(sizeId)) {
            state.job = null
          }
        }
      })
      .addCase(deleteJobRatesGroup.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
  },
})

export const { clearErrors, resetStatuses, clearJob, setJob, setJobRows } = jobsSlice.actions
export default jobsSlice.reducer
