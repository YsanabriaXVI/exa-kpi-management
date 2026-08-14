import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { companiesAPI } from '../api/companies.api'
import type { CompaniesState, Company } from '../types'
import { ACTIVE_STATUS_ID, DEFAULT_STATUS_ID, TAB_STORAGE_KEY } from '../constants'

const getStoredTab = (): CompaniesState['activeTab'] => {
  if (typeof localStorage === 'undefined') return 'all'
  const stored = localStorage.getItem(TAB_STORAGE_KEY)
  if (stored === 'active' || stored === 'inactive' || stored === 'all') return stored
  return 'all'
}

const saveTab = (tab: CompaniesState['activeTab']) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TAB_STORAGE_KEY, tab)
}

const buildDefaultCompany = (): Company => ({
  name: '',
  description: '',
  address: '',
  phone: '',
  reference: '',
  status: DEFAULT_STATUS_ID,
})

const initialState: CompaniesState = {
  companies: [],
  currentCompany: buildDefaultCompany(),
  loading: false,
  error: null,
  total: 0,
  activeTab: getStoredTab(),
}

export const loadCompanies = createAsyncThunk('companies/loadCompanies', async (_, { rejectWithValue }) => {
  try {
    return await companiesAPI.getCompanies()
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to load companies')
  }
})

export const loadCompany = createAsyncThunk(
  'companies/loadCompany',
  async (id: number, { rejectWithValue, getState, dispatch }) => {
    try {
      const state: any = getState()
      const existing = state?.companies?.companies?.find((c: Company) => c.company_id === id || c.id === id)
      if (existing) return existing
      const all = await companiesAPI.getCompanies()
      if (Array.isArray(all.data) && all.data.length) {
        dispatch(setCompanies(all.data))
      }
      const found = all.data.find((c: Company) => c.company_id === id || c.id === id)
      if (found) return found
      throw new Error('Company not found')
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load company')
    }
  }
)

export const createCompany = createAsyncThunk('companies/createCompany', async (company: Company, { rejectWithValue }) => {
  try {
    return await companiesAPI.createCompany(company)
  } catch (error: any) {
    return rejectWithValue(error.message || 'Failed to create company')
  }
})

export const updateCompany = createAsyncThunk(
  'companies/updateCompany',
  async ({ id, company }: { id: number; company: Company }, { rejectWithValue }) => {
    try {
      return await companiesAPI.updateCompany(id, company)
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update company')
    }
  }
)

export const deleteCompany = createAsyncThunk('companies/deleteCompany', async (id: number, { rejectWithValue }) => {
  try {
    await companiesAPI.deleteCompany(id)
    return id
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return id
    }
    return rejectWithValue(error.message || 'Failed to delete company')
  }
})

export const uploadCompanyLogo = createAsyncThunk(
  'companies/uploadLogo',
  async ({ id, filename, file }: { id: number; filename: string; file: File }, { rejectWithValue }) => {
    try {
      await companiesAPI.uploadLogo(id, filename, file)
      return { id, filename }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to upload logo')
    }
  }
)

const companiesSlice = createSlice({
  name: 'companies',
  initialState,
  reducers: {
    clearCurrentCompany: (state) => {
      state.currentCompany = null
    },
    setDefaultCompany: (state) => {
      state.currentCompany = buildDefaultCompany()
      state.error = null
    },
    setCurrentCompany: (state, action) => {
      state.currentCompany = action.payload
    },
    clearCompanyError: (state) => {
      state.error = null
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload
      saveTab(action.payload)
    },
    setCompanies: (state, action) => {
      state.companies = action.payload || []
      state.total = state.companies.length
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCompanies.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadCompanies.fulfilled, (state, action) => {
        state.loading = false
        state.companies = action.payload.data
        state.total = action.payload.total ?? action.payload.data.length
      })
      .addCase(loadCompanies.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to load companies'
      })
      .addCase(loadCompany.fulfilled, (state, action) => {
        state.currentCompany = action.payload
        if (action.payload?.company_id) {
          const exists = state.companies.some((c) => c.company_id === action.payload.company_id)
          state.companies = exists
            ? state.companies.map((c) => (c.company_id === action.payload.company_id ? action.payload : c))
            : [...state.companies, action.payload]
        }
      })
      .addCase(loadCompany.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to load company'
      })
      .addCase(createCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createCompany.fulfilled, (state, action) => {
        state.loading = false
        state.currentCompany = action.payload
        state.companies = [...state.companies, action.payload]
      })
      .addCase(createCompany.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to create company'
      })
      .addCase(updateCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateCompany.fulfilled, (state, action) => {
        state.loading = false
        state.currentCompany = action.payload
        state.companies = state.companies.map((company) =>
          company.company_id === action.payload.company_id ? action.payload : company
        )
      })
      .addCase(updateCompany.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to update company'
      })
      .addCase(deleteCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteCompany.fulfilled, (state, action) => {
        state.loading = false
        state.companies = state.companies.filter((c) => c.company_id !== action.payload)
      })
      .addCase(deleteCompany.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload as string) || 'Failed to delete company'
      })
  },
})

export const {
  clearCurrentCompany,
  setDefaultCompany,
  setCurrentCompany,
  clearCompanyError,
  setActiveTab,
  setCompanies,
} = companiesSlice.actions
export default companiesSlice.reducer
