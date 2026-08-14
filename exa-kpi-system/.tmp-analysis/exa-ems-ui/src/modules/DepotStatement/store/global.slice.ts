import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { statementAPI } from '../api/global.api'
import type { AttributeItem, DepotStatementRecord, StatementState } from '../types/global.types';

const initialState: StatementState = {
  invoiceLines: [],
  list: [],
  depotStatementsList: [],
  isLoading: false,
  errors: null,
  lookups: {}
}

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback

const fixListPageData = (data: { list: any[] }): { list: DepotStatementRecord[] } => {
  return {
    ...data,
    list: data?.list?.map((item: any) => ({
      ...item,
      clientName: item.client_data?.name ?? "",
      statementTypeName : item.statement_type?.name ?? "",
    })),
  };
};

export const loadDepotStatementsList = createAsyncThunk<
  { list: DepotStatementRecord[] },
  void,
  { rejectValue: unknown }
>('statement/loadDepotStatementsList', async (_, thunkApi) => {
  try {
    const list = await statementAPI.loadDepotStatementsList()
    const fixedList = fixListPageData(list)
    return fixedList;
  } catch (error: any) {
     return thunkApi.rejectWithValue(getApiErrorMessage(error, 'Failed to load depot statements'));
  }
})


export const loadAttributeItems = createAsyncThunk(
  'statement/loadAttributeItems',
  async (args: { attributeFlatNameId: string | number; moduleFlatNameId: string | number; propertyName: string }, { rejectWithValue }) => {
    try {
      const res = await statementAPI.loadAttributeItems(args.attributeFlatNameId, args.moduleFlatNameId)
      return { ...res, propertyName: args.propertyName }
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load attributes'))
    }
  }
)

export const loadLookups = createAsyncThunk(
  'statement/loadStatementLookups',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'depot_statement_type', moduleFlatNameId: 'depot_statement', propertyName: 'statementTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'job_type', moduleFlatNameId: 'clients', propertyName: 'jobTypesList' })).unwrap()
      return true
    } catch (e: any) {
      // If any individual lookup fails, surface a single message
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load lookups'))
    }
  }
)

const statementSlice = createSlice({
  name: 'statement',
  initialState,
  reducers: {
    resetStatementState: () => initialState,
    clearStatementErrors(state) {
      state.errors = null
    },
    setDepotStatementsList(state, action: PayloadAction<DepotStatementRecord[]>) {
      state.list = action.payload
      state.depotStatementsList = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDepotStatementsList.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadDepotStatementsList.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.list
        state.depotStatementsList = action.payload.list
        state.errors = null
      })
      .addCase(loadDepotStatementsList.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload ?? action.error
      })
      .addCase(loadAttributeItems.fulfilled, (state, action) => {
        state.lookups[action.payload.propertyName] = action.payload.items
        state.errors = null
      })
      .addCase(loadAttributeItems.rejected, (state, action) => {
        state.errors = action.payload ?? action.error
      })
      .addCase(loadLookups.pending, (s) => {
        s.isLoading = true
        s.error = null
      })
      .addCase(loadLookups.fulfilled, (s) => {
        s.isLoading = false
      })
      .addCase(loadLookups.rejected, (s, a) => {
        s.isLoading = false
        // ignore aborts
        if ((a.payload as string) !== 'aborted') s.error = a.payload as any
      })
  },
})

export const {
  resetStatementState,
  clearStatementErrors,
  setDepotStatementsList,
} = statementSlice.actions

export default statementSlice.reducer