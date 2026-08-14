import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { ChecklistBuilderOverviewRow, ChecklistBuilder, ChecklistForm } from '../types'
import { checklistBuilderAPI } from '../api/checklistBuilder.api'

interface ChecklistBuilderState {
  list: ChecklistBuilderOverviewRow[]
  checklist: Partial<ChecklistForm> | null
  errors: string | null
  isLoading: boolean
  total: number
  gateTypesList: any[]
  equipmentTypesList: any[]
  equipmentSizesList: any[]
  depotsList: any[]
  gensetTypesList: any[]
}

const defaultChecklist: Partial<ChecklistForm> = {
  equipmentTypeId: null,
  gensetTypeId: null,
  sizeEquipmentId: null,
  ownedEquipment: 0,
  defaultConfig: 0,
  clientIds: [],
  depotIds: [],
  part: {},
  parts: [],
}

const initialState: ChecklistBuilderState = {
  list: [],
  checklist: null,
  errors: null,
  isLoading: false,
  total: 0,
  gateTypesList: [],
  equipmentTypesList: [],
  equipmentSizesList: [],
  depotsList: [],
  gensetTypesList: [],
}

/* ---------------- Thunks ---------------- */

const getApiErrorMessage = (error: any, fallback: string) => {
  // Your backend: { errors: [{ message: "..." }] }
  const msgFromArray = error?.response?.data?.errors?.[0]?.message;

  // Common alternatives
  const msgFromMessage = error?.response?.data?.message;
  const msgFromError = error?.message;

  return msgFromArray || msgFromMessage || msgFromError || fallback;
};


export const loadChecklists = createAsyncThunk(
  "checklistBuilder/loadList",
  async (_, { rejectWithValue }) => {
    try {
      return await checklistBuilderAPI.loadCheckLists(); // { list, total }
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load checklists"));
    }
  }
);

export const loadChecklist = createAsyncThunk(
  "checklistBuilder/loadOne",
  async (id: string | number, { rejectWithValue }) => {
    try {
      const res = await checklistBuilderAPI.loadChecklist(id); // { checklist }
      return res.checklist;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load checklist"));
    }
  }
);

export const addChecklist = createAsyncThunk(
  "checklistBuilder/add",
  async (form: ChecklistForm, { rejectWithValue }) => {
    try {
      const res = await checklistBuilderAPI.addChecklist(form); // { checklist }
      return res.checklist;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to add checklist"));
    }
  }
);

export const saveChecklist = createAsyncThunk(
  "checklistBuilder/save",
  async (form: ChecklistForm, { rejectWithValue }) => {
    try {
      const res = await checklistBuilderAPI.saveChecklist(form); // { checklist }
      return res.checklist;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to save checklist"));
    }
  }
);

export const deleteChecklist = createAsyncThunk(
  "checklistBuilder/delete",
  async (id: number, { rejectWithValue }) => {
    try {
      console.log("Deleting checklist", id);
      await checklistBuilderAPI.deleteChecklist(id);
      return id;
    } catch (error: any) {
      console.log("Failed to delete checklist", error);
      return rejectWithValue(getApiErrorMessage(error, "Failed to delete checklist"));
    }
  }
);

export const loadGateTypes = createAsyncThunk(
  "checklistBuilder/loadGateTypes",
  async (_, { rejectWithValue }) => {
    try {
      return await checklistBuilderAPI.loadAttributeItems("gate", "gate");
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load gate types"));
    }
  }
);

export const loadGensetTypes = createAsyncThunk(
  "checklistBuilder/loadGensetTypes",
  async (_, { rejectWithValue }) => {
    try {
      return await checklistBuilderAPI.loadAttributeItems("genset_type", "genset");
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load genset types"));
    }
  }
);

export const loadEquipmentTypes = createAsyncThunk(
  "/equipment-service",
  async (_, { rejectWithValue }) => {
    try {
      return await checklistBuilderAPI.loadEquipmentTypes();
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load equipment types"));
    }
  }
);

export const loadEquipmentSizes = createAsyncThunk(
  "/equipment-service/size",
  async (_, { rejectWithValue }) => {
    try {
      return await checklistBuilderAPI.loadEquipmentSizesList();
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load equipment sizes"));
    }
  }
);

export const loadDepots = createAsyncThunk(
  "/depot-service/loadList",
  async (_, { rejectWithValue }) => {
    try {
      return await checklistBuilderAPI.loadDepotsList();
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to load depots"));
    }
  }
);

/* ---------------- Slice ---------------- */

const checklistBuilderSlice = createSlice({
  name: 'checklistBuilder',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.errors = null
    },
    clearChecklist: (state) => {
      state.checklist = null
    },
    setDefaultChecklist: (state) => {
      state.checklist = defaultChecklist
      state.errors = null
    },
    // optional helper if you want to set checklist directly
    setChecklist: (state, action: PayloadAction<ChecklistBuilder | null>) => {
      state.checklist = action.payload
    },
  },
  extraReducers: (builder) => {
    /* loadChecklists */
    builder
      .addCase(loadChecklists.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadChecklists.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.list
        state.total = action.payload.total
      })
      .addCase(loadChecklists.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* loadChecklist */
    builder
      .addCase(loadChecklist.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadChecklist.fulfilled, (state, action) => {
        state.isLoading = false
        state.checklist = action.payload
      })
      .addCase(loadChecklist.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* addChecklist */
    builder
      .addCase(addChecklist.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(addChecklist.fulfilled, (state, action) => {
        state.isLoading = false
        // keep new record at top (like old code list.unshift)
        state.list.unshift(action.payload as any)
        state.total = state.list.length
        state.checklist = action.payload as any
      })
      .addCase(addChecklist.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* saveChecklist */
    builder
      .addCase(saveChecklist.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(saveChecklist.fulfilled, (state, action) => {
        state.isLoading = false
        state.checklist = action.payload as any

        // update list item if present (like old code splice)
        const updatedId = (action.payload as any)?.checkListBuilderId
        const idx = state.list.findIndex((x: any) => x.checkListBuilderId === updatedId)
        if (idx !== -1) state.list.splice(idx, 1, action.payload as any)
      })
      .addCase(saveChecklist.rejected, (state, action) => {
        console.log('saveChecklist.rejected', action)
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* deleteChecklist */
    builder
      .addCase(deleteChecklist.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteChecklist.fulfilled, (state, action) => {
        state.isLoading = false
        const id = action.payload
        state.list = state.list.filter((x: any) => x.checkListBuilderId !== id)
        state.total = state.list.length

        // if the currently loaded checklist is the one deleted, clear it
        if ((state.checklist as any)?.checkListBuilderId === id) {
          state.checklist = null
        }
      })
      .addCase(deleteChecklist.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })

    /* loadGateTypes */
    builder
      .addCase(loadGateTypes.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadGateTypes.fulfilled, (state, action) => {
        state.isLoading = false
        state.gateTypesList = action.payload
      })
      .addCase(loadGateTypes.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
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
    builder
      .addCase(loadEquipmentTypes.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadEquipmentTypes.fulfilled, (state, action) => {
        state.equipmentTypesList = action.payload.equipmentTypesList
        state.errors = null
      })
      .addCase(loadEquipmentTypes.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
    builder
      .addCase(loadEquipmentSizes.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadEquipmentSizes.fulfilled, (state, action) => {
        state.equipmentSizesList = action.payload.equipmentSizesList
        state.errors = null
      })
      .addCase(loadEquipmentSizes.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
    builder
    .addCase(loadDepots.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadDepots.fulfilled, (state, action) => {
        state.depotsList = action.payload.depotsList
        state.errors = null
      })
      .addCase(loadDepots.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
  },
})

export const {
  clearErrors,
  clearChecklist,
  setDefaultChecklist,
  setChecklist,
} = checklistBuilderSlice.actions

export default checklistBuilderSlice.reducer
