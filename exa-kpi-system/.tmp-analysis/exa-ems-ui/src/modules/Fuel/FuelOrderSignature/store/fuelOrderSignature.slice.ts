import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  SignatureUser,
  SignatureFile,
  FuelOrderSignatureErrors,
} from '../types/fuelOrderSignature.types'
import { fuelOrderSignatureApi } from '../api/fuelOrderSignature.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelOrderSignatureState {
  list: SignatureUser[]
  user: SignatureUser | null
  signature: SignatureFile | null
  errors: FuelOrderSignatureErrors
  statuses: StatusFlags
  loadingList: boolean
  loadingSignature: boolean
  uploading: boolean
}

const initialState: FuelOrderSignatureState = {
  list: [],
  user: null,
  signature: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingSignature: false,
  uploading: false,
}

export const fetchSignaturesList = createAsyncThunk<
  SignatureUser[],
  void,
  { rejectValue: FuelOrderSignatureErrors }
>('fuelOrderSignature/fetchList', async (_arg, thunkAPI) => {
  try {
    const data = await fuelOrderSignatureApi.fetchSignaturesList()
    return data?.users ?? []
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const fetchUserSignature = createAsyncThunk<
  SignatureFile,
  number,
  { rejectValue: FuelOrderSignatureErrors }
>('fuelOrderSignature/fetchUserSignature', async (userId, thunkAPI) => {
  try {
    return await fuelOrderSignatureApi.fetchUserSignature(userId)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

export const uploadSignature = createAsyncThunk<
  SignatureFile,
  { file: File; userId: number },
  { rejectValue: FuelOrderSignatureErrors }
>('fuelOrderSignature/upload', async ({ file, userId }, thunkAPI) => {
  try {
    return await fuelOrderSignatureApi.uploadSignature(file, userId)
  } catch (err: any) {
    const errors =
      err?.response?.data?.errors ?? err?.data?.errors ?? err.message
    return thunkAPI.rejectWithValue(errors)
  }
})

const fuelOrderSignatureSlice = createSlice({
  name: 'fuelOrderSignature',
  initialState,
  reducers: {
    loadUserFromList(state, action: PayloadAction<number>) {
      const userid = action.payload
      state.user = state.list.find((u) => u.userid === userid) ?? null
    },
    clearSignature(state) {
      state.signature = null
    },
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
      state.errors = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSignaturesList.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchSignaturesList.fulfilled, (state, action) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchSignaturesList.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(fetchUserSignature.pending, (state) => {
        state.loadingSignature = true
        state.errors = null
      })
      .addCase(fetchUserSignature.fulfilled, (state, action) => {
        state.loadingSignature = false
        state.signature = action.payload
      })
      .addCase(fetchUserSignature.rejected, (state, action) => {
        state.loadingSignature = false
        state.errors = action.payload ?? action.error
      })

    builder
      .addCase(uploadSignature.pending, (state) => {
        state.uploading = true
        state.errors = null
      })
      .addCase(uploadSignature.fulfilled, (state, action) => {
        state.uploading = false
        state.signature = action.payload
        state.statuses.added = true
      })
      .addCase(uploadSignature.rejected, (state, action) => {
        state.uploading = false
        state.errors = action.payload ?? action.error
      })
  },
})

export const { loadUserFromList, clearSignature, resetStatuses } =
  fuelOrderSignatureSlice.actions

export default fuelOrderSignatureSlice.reducer

export const selectSignatureList = (s: RootState) =>
  s.fuelOrderSignature.list
export const selectSignatureUser = (s: RootState) =>
  s.fuelOrderSignature.user
export const selectSignature = (s: RootState) =>
  s.fuelOrderSignature.signature
export const selectSignatureErrors = (s: RootState) =>
  s.fuelOrderSignature.errors
export const selectSignatureStatuses = (s: RootState) =>
  s.fuelOrderSignature.statuses
export const selectSignatureLoadingList = (s: RootState) =>
  s.fuelOrderSignature.loadingList
export const selectSignatureLoadingSignature = (s: RootState) =>
  s.fuelOrderSignature.loadingSignature
export const selectSignatureUploading = (s: RootState) =>
  s.fuelOrderSignature.uploading
