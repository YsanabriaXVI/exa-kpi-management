import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../../../../store'
import type {
  FuelPrice,
  FuelPriceForm,
  FuelPriceErrors,
  CountryOption,
  DepartmentOption,
  CityOption,
  FuelTypeOption,
  UnitTypeOption,
} from '../types/fuelPrice.types'
import { fuelPriceApi } from '../api/fuelPrice.api'

interface StatusFlags {
  added: boolean
  updated: boolean
  deleted: boolean
}

interface FuelPriceState {
  list: FuelPrice[]
  current: FuelPrice | null
  errors: FuelPriceErrors
  statuses: StatusFlags
  loadingList: boolean
  loadingCurrent: boolean
  saving: boolean
  deleting: boolean
  countries: CountryOption[]
  departments: DepartmentOption[]
  cities: CityOption[]
  fuelTypes: FuelTypeOption[]
  unitTypes: UnitTypeOption[]
}

const initialState: FuelPriceState = {
  list: [],
  current: null,
  errors: null,
  statuses: { added: false, updated: false, deleted: false },
  loadingList: false,
  loadingCurrent: false,
  saving: false,
  deleting: false,
  countries: [],
  departments: [],
  cities: [],
  fuelTypes: [],
  unitTypes: [],
}

const extractError = (err: any) => {
  const errors = err?.response?.data?.errors ?? err?.data?.errors
  if (Array.isArray(errors) && errors.length > 0) {
    return errors[0]?.message ?? errors[0] ?? err.message
  }
  return errors ?? err.message
}

export const fetchFuelPrices = createAsyncThunk(
  'fuelPrice/fetchList',
  async (_, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchList()
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const fetchFuelPriceById = createAsyncThunk(
  'fuelPrice/fetchById',
  async (id: number, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchById(id)
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const addFuelPrice = createAsyncThunk(
  'fuelPrice/add',
  async (form: FuelPriceForm, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.create(form)
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const saveFuelPrice = createAsyncThunk(
  'fuelPrice/save',
  async (form: FuelPriceForm, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState
      const current = (state as any).fuelPrice.current as FuelPrice | null
      return await fuelPriceApi.update(form, current)
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const deleteFuelPrice = createAsyncThunk(
  'fuelPrice/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await fuelPriceApi.remove(id)
      return id
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const loadCountries = createAsyncThunk(
  'fuelPrice/loadCountries',
  async (_, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchCountries()
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const loadDepartments = createAsyncThunk(
  'fuelPrice/loadDepartments',
  async (countryId: number, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchDepartments(countryId)
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const loadCities = createAsyncThunk(
  'fuelPrice/loadCities',
  async (departmentId: number, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchCities(departmentId)
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const loadFuelTypes = createAsyncThunk(
  'fuelPrice/loadFuelTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchFuelTypes()
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

export const loadUnitTypes = createAsyncThunk(
  'fuelPrice/loadUnitTypes',
  async (_, { rejectWithValue }) => {
    try {
      return await fuelPriceApi.fetchUnitTypes()
    } catch (err: any) {
      return rejectWithValue(extractError(err))
    }
  },
)

const fuelPriceSlice = createSlice({
  name: 'fuelPrice',
  initialState,
  reducers: {
    resetStatuses(state) {
      state.statuses = { added: false, updated: false, deleted: false }
    },
    clearCurrent(state) {
      state.current = null
    },
    clearDepartments(state) {
      state.departments = []
    },
    clearCities(state) {
      state.cities = []
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchList
      .addCase(fetchFuelPrices.pending, (state) => {
        state.loadingList = true
        state.errors = null
      })
      .addCase(fetchFuelPrices.fulfilled, (state, action: PayloadAction<FuelPrice[]>) => {
        state.loadingList = false
        state.list = action.payload
      })
      .addCase(fetchFuelPrices.rejected, (state, action) => {
        state.loadingList = false
        state.errors = action.payload as FuelPriceErrors
      })
      // fetchById
      .addCase(fetchFuelPriceById.pending, (state) => {
        state.loadingCurrent = true
        state.errors = null
      })
      .addCase(fetchFuelPriceById.fulfilled, (state, action: PayloadAction<FuelPrice>) => {
        state.loadingCurrent = false
        state.current = action.payload
      })
      .addCase(fetchFuelPriceById.rejected, (state, action) => {
        state.loadingCurrent = false
        state.errors = action.payload as FuelPriceErrors
      })
      // add
      .addCase(addFuelPrice.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(addFuelPrice.fulfilled, (state) => {
        state.saving = false
        state.statuses.added = true
      })
      .addCase(addFuelPrice.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload as FuelPriceErrors
      })
      // save
      .addCase(saveFuelPrice.pending, (state) => {
        state.saving = true
        state.errors = null
      })
      .addCase(saveFuelPrice.fulfilled, (state) => {
        state.saving = false
        state.statuses.updated = true
      })
      .addCase(saveFuelPrice.rejected, (state, action) => {
        state.saving = false
        state.errors = action.payload as FuelPriceErrors
      })
      // delete
      .addCase(deleteFuelPrice.pending, (state) => {
        state.deleting = true
        state.errors = null
      })
      .addCase(deleteFuelPrice.fulfilled, (state) => {
        state.deleting = false
        state.statuses.deleted = true
      })
      .addCase(deleteFuelPrice.rejected, (state, action) => {
        state.deleting = false
        state.errors = action.payload as FuelPriceErrors
      })
      // countries
      .addCase(loadCountries.fulfilled, (state, action) => {
        state.countries = action.payload
      })
      // departments
      .addCase(loadDepartments.fulfilled, (state, action) => {
        state.departments = action.payload
      })
      // cities
      .addCase(loadCities.fulfilled, (state, action) => {
        state.cities = action.payload
      })
      // fuelTypes
      .addCase(loadFuelTypes.fulfilled, (state, action) => {
        state.fuelTypes = action.payload
      })
      // unitTypes
      .addCase(loadUnitTypes.fulfilled, (state, action) => {
        state.unitTypes = action.payload
      })
  },
})

export const { resetStatuses, clearCurrent, clearDepartments, clearCities } =
  fuelPriceSlice.actions

export const selectFuelPriceList = (state: RootState) => (state as any).fuelPrice.list
export const selectFuelPriceLoadingList = (state: RootState) => (state as any).fuelPrice.loadingList
export const selectFuelPriceCurrent = (state: RootState) => (state as any).fuelPrice.current
export const selectFuelPriceLoadingCurrent = (state: RootState) => (state as any).fuelPrice.loadingCurrent
export const selectFuelPriceSaving = (state: RootState) => (state as any).fuelPrice.saving
export const selectFuelPriceErrors = (state: RootState) => (state as any).fuelPrice.errors
export const selectFuelPriceStatuses = (state: RootState) => (state as any).fuelPrice.statuses
export const selectFuelPriceCountries = (state: RootState) => (state as any).fuelPrice.countries
export const selectFuelPriceDepartments = (state: RootState) => (state as any).fuelPrice.departments
export const selectFuelPriceCities = (state: RootState) => (state as any).fuelPrice.cities
export const selectFuelPriceFuelTypes = (state: RootState) => (state as any).fuelPrice.fuelTypes
export const selectFuelPriceUnitTypes = (state: RootState) => (state as any).fuelPrice.unitTypes

export default fuelPriceSlice.reducer
