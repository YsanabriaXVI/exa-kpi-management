import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { EquipmentParts, FixedEquipmentParts, EquipmentType, EquipmentSize, DefaultPart, EquipmentPartImage } from '../types'
import { partsAndSectionsAPI } from '../api/partsAndSecs.api'
import fixListPageData from '../helpers/fixListPageData'
import { stat } from 'fs';


interface PartsAndSecsState {
  list: FixedEquipmentParts[]
  equipmentTypesList: EquipmentType[]
  equipmentSizesList: EquipmentSize[]
  gensetTypesList: any[]
  part: EquipmentParts | DefaultPart | boolean
  errors: string | null
  isLoading: boolean,
  total: number,
  imageFile: EquipmentPartImage | null
}

const initialState: PartsAndSecsState = {
  list: [],
  equipmentTypesList: [],
  equipmentSizesList: [],
  gensetTypesList: [],
  part: false,
  errors: null,
  isLoading: false,
  total: 0,
  imageFile: null
}


const getApiErrorMessage = (error: any, fallback: string) => {
  console.log("error -->", error);
  // Your backend: { errors: [{ message: "..." }] }
  const msgFromArray = error?.response?.data?.errors?.[0]?.message;

  // Common alternatives
  const msgFromMessage = error?.response?.data?.message;
  const msgFromError = error?.message;

  return msgFromArray || msgFromMessage || msgFromError || fallback;
};

export const loadPartsList = createAsyncThunk(
  '/equipment-service/parts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await partsAndSectionsAPI.loadPartsList()
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load parts and sections')
    }
  }
)

export const loadPart = createAsyncThunk(
  '/equipment-service/parts/:id',
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      const response = await partsAndSectionsAPI.loadPart(id)
      return response.part
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load part')
    }
  }
)

export const loadPartImage = createAsyncThunk<
  EquipmentPartImage | null,
  { id: number },
  { rejectValue: string }
>(
  'partsAndSections/loadPartImage',
  async ({ id }, { rejectWithValue }) => {
    try {
      // this calls the class method you just built
      return await partsAndSectionsAPI.loadEquipmentPartImage(id);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load part image');
    }
  },
);

export const loadEquipmentTypes = createAsyncThunk(
  '/equipment-service',
  async(_, { rejectWithValue }) => {
    try {
      return await partsAndSectionsAPI.loadEquipmentTypes()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment types')
    }
  }
)

export const loadSizesList = createAsyncThunk(
  '/equipment-service/size',
  async(_, { rejectWithValue }) => {
    try {
      return await partsAndSectionsAPI.loadSizesList()
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load equipment sizes')
    }
  }
)

// Create P & S
export const addPartAndSections = createAsyncThunk(
 '/equipment-service/createPart',
  async (psData: Partial<any>, { rejectWithValue }) => {
    try {
      const response = await partsAndSectionsAPI.addPartAndSections(psData);
      console.log("addPartAndSections response:", response)
      return response;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to create part"));
    }
  }
)

// Update P & S
export const savePartAndSections = createAsyncThunk(
  "/equipment-service/updateParts",
  async ({ id, psData }: { id: number; psData: any }, { rejectWithValue }) => {
    try {
      const response = await partsAndSectionsAPI.savePartAndSections(id, psData); // { checklist }
      return response;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to update part"));
    }
  }
);

export const deletePart = createAsyncThunk(
 '/equipment-service/deletePart',
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      console.log("Attempting to delete")
      await partsAndSectionsAPI.deletePart(id)
      return id;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to delete part"));
    }
  }
)

export const deleteSection = createAsyncThunk(
 '/equipment-service/deleteSection',
  async ({ id }: { id: number }, { rejectWithValue }) => {
    try {
      console.log("Attempting to delete section")
      await partsAndSectionsAPI.deleteSection(id)
      return id;
    } catch (error: any) {
      return rejectWithValue(getApiErrorMessage(error, "Failed to delete section"));
    }
  }
)


export const loadAttributeItems = createAsyncThunk(
  'equipment-service/loadAttributeItems',
  async (args: { attributeFlatNameId: string | number; moduleFlatNameId: string | number; propertyName: string }, { rejectWithValue }) => {
    try {
      const res = await partsAndSectionsAPI.loadAttributeItems(args.attributeFlatNameId, args.moduleFlatNameId)
      return { ...res, propertyName: args.propertyName }
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load attributes'))
    }
  }
)

export const loadGensetTypes = createAsyncThunk(
  'equipment-service/loadGensetTypes',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const res = await dispatch(loadAttributeItems({ attributeFlatNameId: 'genset_type', moduleFlatNameId: 'genset', propertyName: 'gensetTypesList' })).unwrap()
      return res;
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load genset types'))
    }
  }
)


const sectionsDefault = {
    sectionID: '',
    code: 'Click to Edit...',
    isoCode: 'Click to Edit...',
    coordinates: 'Click to Edit...',
    description: 'Click to Edit...',
  };

  const defaultPartObj = {
    partName: null,
    description: null,
    equipmentTypeId: null,
    sizeEquipmentId: null,
    gensetTypeId: null,
    sections_data: [{ ...sectionsDefault }],
    status: 1,
  };



const PartsAndSectionSlice = createSlice({
  name: 'trips',
  initialState,
  reducers: {
    clearErrors: (state) => {
      state.errors = null
    },
    clearCurrentPart: (state) => {
      state.part = false
    },
    setDefaultPart: (state) => {
      state.part = defaultPartObj
      state.imageFile = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPartsList.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadPartsList.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = action.payload.list
        state.total = action.payload.total
      })
      .addCase(loadPartsList.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
      .addCase(loadPart.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadPart.fulfilled, (state, action) => {
        state.part = action.payload
        state.errors = null
      })
      .addCase(loadPart.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
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
      .addCase(loadSizesList.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadSizesList.fulfilled, (state, action) => {
        state.equipmentSizesList = action.payload.equipmentSizesList
        state.errors = null
      })
      .addCase(loadSizesList.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
      // Create p&s
      .addCase(addPartAndSections.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(addPartAndSections.fulfilled, (state, action) => {
        state.isLoading = false;
        const created = fixListPageData([action.payload]); // <- API response (should include PK)
        state.list.unshift(created[0]);
        state.part = created[0] as any;
      })
      .addCase(addPartAndSections.rejected, (state, action) => {
        state.isLoading = false
        state.errors = action.payload as string
      })
      // Update p&s
      .addCase(savePartAndSections.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(savePartAndSections.fulfilled, (state, action) => {
        state.isLoading = false
        console.log("save actions", action)
        action.payload = action.meta.arg.psData;
        const index = state.list.findIndex((c) => c.equipmentPartId === action.payload.equipmentPartId)
        if (index !== -1) {
          const fixedElem = fixListPageData([action.payload])
          state.list[index] = fixedElem[0]
        }
        state.part = action.payload
      })
      .addCase(savePartAndSections.rejected, (state, action) => {
        console.log("save actions rejected", action)
        state.isLoading = false
        state.errors = action.payload as string
      })
      //image
       .addCase(loadPartImage.pending, (state) => {
        state.isLoading = true;
        state.errors = null;
        // optional: keep previous image or clear it:
        // state.image = null;
      })
      .addCase(loadPartImage.fulfilled, (state, action) => {
          state.isLoading = false;
          //action.payload = action.meta.arg;
          state.imageFile = action.payload;
        },
      )
      .addCase(loadPartImage.rejected, (state, action) => {
        state.isLoading = false;
        state.errors = action.payload || 'Failed to load part image';
      })
      .addCase(deletePart.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deletePart.fulfilled, (state, action) => {
        state.isLoading = false
        state.list = state.list.filter((part) => part.equipmentPartId !== action.payload)
      })
      .addCase(deletePart.rejected, (state, action) => {
        state.isLoading = false
        state.errors = (action.payload as string) || 'Failed to delete other asset'
      })
      .addCase(deleteSection.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(deleteSection.fulfilled, (state, action) => {
        state.isLoading = false
        let indexItem;
        const item = state.part.sections_data.find((record:any, i:number) => {
        const isFind = record.sectionId === action.payload;

        if (isFind) {
          indexItem = i;
        }

        return isFind;
      });
        state.part.sections_data.splice(indexItem, 1);
      })
      .addCase(deleteSection.rejected, (state, action) => {
        state.isLoading = false
        state.errors = (action.payload as string) || 'Failed to delete other asset'
      })
      .addCase(loadGensetTypes.pending, (state) => {
        state.isLoading = true
        state.errors = null
      })
      .addCase(loadGensetTypes.fulfilled, (state, action) => {
        console.log("loadGensetTypes", action)
        state.isLoading = false
        state.gensetTypesList = action.payload.items
      })
      .addCase(loadGensetTypes.rejected, (state, a) => {
        state.isLoading = false
        // ignore aborts
        if ((a.payload as string) !== 'aborted') state.errors = a.payload as string
      })
  },
})


export const { clearErrors, clearCurrentPart, setDefaultPart } = PartsAndSectionSlice.actions;
export default PartsAndSectionSlice.reducer;
