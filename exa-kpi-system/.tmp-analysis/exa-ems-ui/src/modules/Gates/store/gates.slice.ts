import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { gatesAPI } from '../api/gates.api'
import type { GateForm, GateRecord, GatesState, GateDetailsObj, TripInfo } from '../types'

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.errors?.[0]?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback


const getDefaultGateDetails = (gateTypeId: number): GateDetailsObj[] => {
  return [
  {
    gateDetailId: null,
    ownedEquipment: 0,
    equipmentTypeId: 1,
    sizeEquipmentId: null,
    equipmentId: null,
    clientId: null,
    remarks: '',
    gensetTypeId: null,
    fuelLevel: null,
    engineHours: null,
    status: null,
    showEquipment: gateTypeId === 1492 ? 1 : 0,
    inTransit: 0,
    gateDamageData: [
      {
        gateDamageDataId: null,
        damageId: null,
        equipmentPartId: null,
        equipmentPartd: {
          equipmentPartId: null,
          partName: '',
          description: '',
        },
        sectionId: null,
        sectionsd: {
          sectionId: null,
          code: '',
          description: '',
        },
        remarks: '',
      },
    ],
    gateChecklistData: [
      {
        gateChecklistDataId: null,
        checkListBuilderId: null,
        checkListSectiond: [
          {
            checkListBuilderId: null,
            partSectionId: null,
            instruction: '',
          },
          {
            checkListBuilderId: null,
            partSectionId: null,
            instruction: '',
          },
        ],
        equipmentPartId: null,
        equipmentPartd: [
          {
            equipmentPartId: null,
            partName: '',
            description: '',
            sections_data: [
              {
                sectionId: null,
                equipmentPartId: null,
                code: '',
                isoCode: '',
                coordinates: '',
                description: '',
              },
            ],
          },
        ],
        sectionId: null,
        conditionId: null,
        remarks: '',
      },
    ],
  },
  {
    gateDetailId: null,
    ownedEquipment: 0,
    equipmentTypeId: 2,
    sizeEquipmentId: null,
    equipmentId: null,
    clientId: null,
    remarks: '',
    gensetTypeId: null,
    fuelLevel: null,
    engineHours: null,
    status: null,
    showEquipment: gateTypeId === 1492 ? 1 : 0,
    loaded: 0,
    gateDamageData: [
      {
        gateDamageDataId: null,
        damageId: null,
        equipmentPartId: null,
        equipmentPartd: {
          equipmentPartId: null,
          partName: '',
          description: '',
        },
        sectionId: null,
        sectionsd: {
          sectionId: null,
          code: '',
          description: '',
        },
        remarks: '',
      },
    ],
    gateChecklistData: [
      {
        gateChecklistDataId: null,
        checkListBuilderId: null,
        checkListSectiond: [
          {
            checkListBuilderId: null,
            partSectionId: null,
            instruction: '',
          },
          {
            checkListBuilderId: null,
            partSectionId: null,
            instruction: '',
          },
        ],
        equipmentPartId: null,
        equipmentPartd: [
          {
            equipmentPartId: null,
            partName: '',
            description: '',
            sections_data: [
              {
                sectionId: null,
                equipmentPartId: null,
                code: '',
                isoCode: '',
                coordinates: '',
                description: '',
              },
            ],
          },
        ],
        sectionId: null,
        conditionId: null,
        remarks: '',
      },
    ],
  },
  {
    gateDetailId: null,
    ownedEquipment: 0,
    equipmentTypeId: 3,
    sizeEquipmentId: null,
    equipmentId: null,
    clientId: null,
    remarks: '',
    gensetTypeId: null,
    fuelLevel: null,
    engineHours: null,
    status: null,
    showEquipment: gateTypeId === 1492 ? 1 : 0,
    inTransit: 0,
    gateDamageData: [
      {
        gateDamageDataId: null,
        damageId: null,
        equipmentPartId: null,
        equipmentPartd: {
          equipmentPartId: null,
          partName: '',
          description: '',
        },
        sectionId: null,
        sectionsd: {
          sectionId: null,
          code: '',
          description: '',
        },
        remarks: '',
      },
    ],
    gateChecklistData: [
      {
        gateChecklistDataId: null,
        checkListBuilderId: null,
        checkListSectiond: [
          {
            checkListBuilderId: null,
            partSectionId: null,
            instruction: '',
          },
          {
            checkListBuilderId: null,
            partSectionId: null,
            instruction: '',
          },
        ],
        equipmentPartId: null,
        equipmentPartd: [
          {
            equipmentPartId: null,
            partName: '',
            description: '',
            sections_data: [
              {
                sectionId: null,
                equipmentPartId: null,
                code: '',
                isoCode: '',
                coordinates: '',
                description: '',
              },
            ],
          },
        ],
        sectionId: null,
        conditionId: null,
        remarks: '',
      },
    ],
  },
];
};

const getDefaultGateData = (gateTypeId: number): Partial<GateRecord> => ({
  gateId: null,
  depotId: null,
  gateTypeId,
  requestId: null,
  truckId: null,
  driverId: null,
  tripId: null,
  subdivisionId: null,
  signatureDriver: null,
  signatureInspector: null,
  gateDetails: getDefaultGateDetails(gateTypeId) as any, 
  gateIdTemp: null,
  requirementSize: {
    containerSize: null,
    chassisSize: null,
    genset: null,
  },
  requiredOwner: {
    chassisOwner: null,
    chassisModule: null,
    containerOwner: null,
    containerModule: null,
    gensetOwner: null,
    gensetModule: null,
  },
});

export const notFoundTrip: TripInfo = {
  tripId: "Not Found",
  driverId: "Not Found",
  subdivisionId: "Not Found",
  client: "Not Found",
  clientId: "Not Found",
  route: "Not Found",
  tripstatusId: "Not Found",
  tripstatus: "Not Found",
};


const initialState: GatesState = {
  list: [],
  total: 0,
  current: null,
  checkListBuilder: {
    checkListBuilderId: null,
    equipmentParts: [],
    rejected: false,
  },
  currentEquipmentTypeId: null,
  driver: null,
  tiresGate: null,
  haulage: null,
  trip: null,
  lookups: {},
  images: [],
  loading: {
    list: false,
    current: false,
    saving: false,
    deleting: false,
    checklist: false,
    lookups: false,
    image: false,
    aux: false,
    imgsInfo: false
  },
  error: null,
  newAsset: null,
  imageFile: null,
  imagesInfo: null
}

export const loadGatesList = createAsyncThunk('gates/loadList', async (_, { rejectWithValue }) => {
  try {
    return await gatesAPI.loadList()
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to load gates list'))
  }
})

export const loadGateInList = createAsyncThunk('gates/loadGateInList', async (_, { rejectWithValue }) => {
  try {
    return await gatesAPI.loadGateInList()
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to load gate in list'))
  }
})

export const loadGateOutList = createAsyncThunk('gates/loadGateOutList', async (_, { rejectWithValue }) => {
  try {
    return await gatesAPI.loadGateOutList()
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to load gate in list'))
  }
})

export const loadGateById = createAsyncThunk('gates/loadOne', async (id: number, { rejectWithValue }) => {
  try {
    const gate = await gatesAPI.loadOne(id)
    console.log('slice loadGateById', gate);
    return gate;
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to load gate'))
  }
})

export const createGate = createAsyncThunk('gates/create', async (form: GateForm, { rejectWithValue }) => {
  try {
    return await gatesAPI.create(form)
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to create gate'))
  }
})

export const updateGate = createAsyncThunk(
  'gates/update',
  async (args: { id: number; form: GateForm }, { rejectWithValue }) => {
    try {
      return await gatesAPI.update(args.id, args.form)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to update gate'))
    }
  }
)

export const deleteGate = createAsyncThunk('gates/delete', async (id: number, { rejectWithValue }) => {
  try {
    return await gatesAPI.delete(id)
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to delete gate'))
  }
})

export const loadChecklist = createAsyncThunk(
  'gates/loadChecklist',
  async (
    params: {
      clientId: number | null
      depotId: number | null
      gateId: number | null
      equipmentType: number | null
      equipmentSizeId: number | null
      ownedEquipment: number | 0 | 1
    },
    { rejectWithValue }
  ) => {
    try {
      return await gatesAPI.loadChecklist(params)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load checklist'))
    }
  }
)

export const loadAttributeItems = createAsyncThunk(
  'gates/loadAttributeItems',
  async (args: { attributeFlatNameId: string | number; moduleFlatNameId: string | number; propertyName: string }, { rejectWithValue }) => {
    try {
      const res = await gatesAPI.loadAttributeItems(args.attributeFlatNameId, args.moduleFlatNameId)
      return { ...res, propertyName: args.propertyName }
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load attributes'))
    }
  }
)


export const loadGatesLookups = createAsyncThunk(
  'gates/loadGatesLookups',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Mirrors legacy GatesEditPage lookups
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'gate', moduleFlatNameId: 'gate', propertyName: 'typeList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'genset_type', moduleFlatNameId: 'genset', propertyName: 'gensetTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'genset_type', moduleFlatNameId: 'other_assets', propertyName: 'OAGensetTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'equipment_condition', moduleFlatNameId: 'gate', propertyName: 'conditionTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'color', moduleFlatNameId: 'other_assets', propertyName: 'colorsList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'request_type', moduleFlatNameId: 'equipment_request', propertyName: 'requestTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'haulage_type', moduleFlatNameId: 'gate', propertyName: 'haulageTypesList' })).unwrap()
      await dispatch(loadAttributeItems({ attributeFlatNameId: 'request_type', moduleFlatNameId: 'equipment_request', propertyName: 'requestTypesList' })).unwrap()
      return true
    } catch (e: any) {
      // If any individual lookup fails, surface a single message
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load Gates lookups'))
    }
  }
)

export const uploadDamageImage = createAsyncThunk(
  'gates/uploadDamageImage',
  async (args: { gateIdTemp: string; file: File }, { rejectWithValue }) => {
    try {
      return await gatesAPI.uploadDamageImage(args.gateIdTemp, args.file)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to upload image'))
    }
  }
)

export const deleteDamageImage = createAsyncThunk(
  'gates/deleteDamageImage',
  async (args: { imageId: number; gateIdTemp: string }, { rejectWithValue }) => {
    try {
      return await gatesAPI.deleteDamageImage(args.imageId, args.gateIdTemp)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to delete image'))
    }
  }
)

export const checkTireData = createAsyncThunk(
  'gates/checkTireData',
  async (args: { id: number; gateTypeId: number; chassisId: number }, { rejectWithValue }) => {
    try {
      return await gatesAPI.checkTireData(args.id, args.gateTypeId, args.chassisId)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to validate tire data'))
    }
  }
)

export const loadDriver = createAsyncThunk('gates/loadDriver', async (driverId: number, { rejectWithValue }) => {
  try {
    return await gatesAPI.loadDriver(driverId)
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to load driver'))
  }
})

export const loadHaulageType = createAsyncThunk(
  'gates/loadHaulageType',
  async (
    args: { clientId: number; tripClientId: number; depotId: number; gateTypeId: number; containerSizeId: number },
    { rejectWithValue }
  ) => {
    try {
      return await gatesAPI.loadHaulageType(args)
    } catch (e: any) {
      return rejectWithValue(getApiErrorMessage(e, 'Failed to load haulage type'))
    }
  }
)

export const loadLastTrip = createAsyncThunk('gates/loadLastTrip', async (args: {id: number, filter: string}, { rejectWithValue }) => {
  try {
    if (args.filter === 'truck') {
      return await gatesAPI.loadLastTruckTrip(args.id)
    }

    if (args.filter === 'trip') {
      return await gatesAPI.loadTrip(args.id)
    }
    
  } catch (e: any) {
    return rejectWithValue(getApiErrorMessage(e, 'Failed to load last trip'))
  }
})

/**
 * Bootstrap thunk for the edit page:
 * - keeps orchestration OUT of the page (so no Promise.all there)
 * - you can expand this later when we build pages/components
 */
export const bootstrapGateEdit = createAsyncThunk(
  'gates/bootstrapEdit',
  async (args: { gateId?: number; lookups?: Array<{ attributeFlatNameId: number; moduleFlatNameId: number; propertyName: string }> }, { dispatch }) => {
    if (args.lookups?.length) {
      for (const l of args.lookups) {
        await dispatch(loadAttributeItems(l))
      }
    }
    if (args.gateId) {
      await dispatch(loadGateById(args.gateId))
    }
    return true
  }
)

export const createOtherAsset = createAsyncThunk<any, any, { rejectValue: string }>(
  'otherAssetsGate/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res =  await gatesAPI.createOtherAsset(payload);
      console.log("API RESPONSE: ", res);
      return res;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to create other asset')
    }
  }
)

export const createRelatedOtherAssets = createAsyncThunk<any, any, { rejectValue: string }>(
  'otherAssetsGate/createRelated',
  async (payload, { rejectWithValue }) => {
    try {
      const res =  await gatesAPI.createAssetAndRelatedAsset(payload);
      console.log("related assets API RESPONSE: ", res);
      return res;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || error.message || 'Failed to create other asset')
    }
  } 
)

export const loadGateImage = createAsyncThunk<
  any | null,
  { id: number, key: string },
  { rejectValue: string }
>(
  'gates/loadImage',
  async ({ id, key }, { rejectWithValue }) => {
    try {
      // this calls the class method you just built
      return await gatesAPI.loadGateImage(id, key);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load part image');
    }
  },
);

export const loadGateImagesData = createAsyncThunk<
  any | null,
  { id: number },
  { rejectValue: string }
>(
  'gates/loadImagesInfo',
  async ({ id }, { rejectWithValue }) => {
    try {
      // this calls the class method you just built
      return await gatesAPI.loadGateImagesData(id);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load part image');
    }
  },
);


const gatesSlice = createSlice({
  name: 'gates',
  initialState,
  reducers: {
    clearCurrent: (state) => {
      state.current = null
      state.checkListBuilder = null
      state.currentEquipmentTypeId = null
      state.driver = null
      state.tiresGate = null
      state.haulage = null
      state.trip = null
      state.images = []
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    clearAsset: (state) => {
      state.newAsset = null
    },
    clearImage: (state) => {
      state.imageFile = null
    },
    cleanChecklist: (state, action) => {
      state.currentEquipmentTypeId = action.payload.equipmentTypeId;
      state.checkListBuilder = initialState.checkListBuilder
    },
    loadDefaultGate: (state, action) => {
      const data = getDefaultGateData(action.payload.gateTypeId)
      console.log('loadDefaultGate loaded', data);
      state.current = data as any
    },
    cleanTrip: (state) => {
      state.haulage = null
      state.trip = {
        tripId: "",
        driverId: "",
        subdivisionId: "",
        client: "",
        clientId: "",
        route: "",
        tripstatusId: "",
        tripstatus: ""
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // list
      .addCase(loadGatesList.pending, (s) => {
        s.loading.list = true
        s.error = null
      })
      .addCase(loadGatesList.fulfilled, (s, a) => {
        s.loading.list = false
        s.list = a.payload.list
        s.total = a.payload.total
      })
      .addCase(loadGatesList.rejected, (s, a) => {
        s.loading.list = false
        s.error = a.payload as any
      })
      // gate in list
      .addCase(loadGateInList.pending, (s) => {
        s.loading.list = true
        s.error = null
      })
      .addCase(loadGateInList.fulfilled, (s, a) => {
        s.loading.list = false
        s.list = a.payload.list
        s.total = a.payload.total
      })
      .addCase(loadGateInList.rejected, (s, a) => {
        s.loading.list = false
        s.error = a.payload as any
      })
      // gate out list
      .addCase(loadGateOutList.pending, (s) => {
        s.loading.list = true
        s.error = null
      })
      .addCase(loadGateOutList.fulfilled, (s, a) => {
        s.loading.list = false
        s.list = a.payload.list
        s.total = a.payload.total
      })
      .addCase(loadGateOutList.rejected, (s, a) => {
        s.loading.list = false
        s.error = a.payload as any
      })
      // current
      .addCase(loadGateById.pending, (s) => {
        s.loading.current = true;
        s.current = null; // prevents UI showing old gate while loading new one
        s.error = null;
      })
      .addCase(loadGateById.fulfilled, (s, a) => {
        console.log('loadGateById fulfilled', a.payload);
        s.loading.current = false
        s.current = a.payload.gate
      })
      .addCase(loadGateById.rejected, (s, a) => {
        console.log('loadGateById rejected', a.payload);
        s.loading.current = false
        s.error = a.payload as any
      })
      // create/update
      .addCase(createGate.pending, (s) => {
        s.loading.saving = true
        s.error = null
      })
      .addCase(createGate.fulfilled, (s, a) => {
        s.loading.saving = false
        s.current = a.payload.gate
      })
      .addCase(createGate.rejected, (s, a) => {
        s.loading.saving = false
        s.error = a.payload as any
      })
      .addCase(updateGate.pending, (s) => {
        s.loading.saving = true
        s.error = null
      })
      .addCase(updateGate.fulfilled, (s, a) => {
        s.loading.saving = false
        s.current = a.payload.gate
      })
      .addCase(updateGate.rejected, (s, a) => {
        s.loading.saving = false
        s.error = a.payload as any
      })
      // delete
      .addCase(deleteGate.pending, (s) => {
        s.loading.deleting = true
        s.error = null
      })
      .addCase(deleteGate.fulfilled, (s, a) => {
        s.loading.deleting = false
        // Remove all rows belonging to gateId (since list is flattened)
        s.list = s.list.filter((r) => r.gateId !== a.payload.id)
        s.total = s.list.length
      })
      .addCase(deleteGate.rejected, (s, a) => {
        s.loading.deleting = false
        s.error = a.payload as any
      })
      // checklist
      .addCase(loadChecklist.pending, (s, a) => {
        s.loading.checklist = true;
        s.error = null;

        // Clear immediately to avoid showing stale UI
        s.checkListBuilder = { checkListBuilderId: null, equipmentParts: [] };

        // IMPORTANT: remember which equipment checklist is being loaded
        s.currentEquipmentTypeId = a.meta.arg.equipmentType ?? null;
      })
      .addCase(loadChecklist.fulfilled, (s, a) => {
        s.loading.checklist = false;
        s.checkListBuilder = a.payload.checkListBuilder;
        console.log('checklist loaded', s.checkListBuilder);

        // Either use payload or keep the meta arg (payload is fine)
        s.currentEquipmentTypeId = a.payload.currentEquipmentTypeId ?? s.currentEquipmentTypeId;
      })
      .addCase(loadChecklist.rejected, (s, a) => {
        s.loading.checklist = false;

        // Empty checklist so UI clears
        s.checkListBuilder = { checkListBuilderId: null, equipmentParts: [], rejected: true };

        // IMPORTANT: keep the equipment type that failed
        s.currentEquipmentTypeId = a.meta.arg.equipmentType ?? s.currentEquipmentTypeId;

        s.error = a.payload as any;
      })

      // attributes
      
      // gates lookups (bundled)
      .addCase(loadGatesLookups.pending, (s) => {
        s.loading.lookups = true
        s.error = null
      })
      .addCase(loadGatesLookups.fulfilled, (s) => {
        s.loading.lookups = false
      })
      .addCase(loadGatesLookups.rejected, (s, a) => {
        s.loading.lookups = false
        // ignore aborts
        if ((a.payload as string) !== 'aborted') s.error = a.payload as any
      })
      .addCase(loadAttributeItems.pending, (s) => {
        s.loading.lookups = true
        s.error = null
      })
      .addCase(loadAttributeItems.fulfilled, (s, a) => {
        s.loading.lookups = false
        s.lookups[a.payload.propertyName] = a.payload.items
      })
      .addCase(loadAttributeItems.rejected, (s, a) => {
        s.loading.lookups = false
        s.error = a.payload as any
      })
      // images
      .addCase(uploadDamageImage.pending, (s) => {
        s.loading.images = true
        s.error = null
      })
      .addCase(uploadDamageImage.fulfilled, (s, a) => {
        s.loading.images = false
        s.images.unshift(a.payload.image)
      })
      .addCase(uploadDamageImage.rejected, (s, a) => {
        s.loading.images = false
        s.error = a.payload as any
      })
      .addCase(deleteDamageImage.pending, (s) => {
        s.loading.images = true
        s.error = null
      })
      .addCase(deleteDamageImage.fulfilled, (s, a) => {
        s.loading.images = false
        s.images = s.images.filter((img: any) => img?.imageId !== a.payload.imageId && img?.id !== a.payload.imageId)
      })
      .addCase(deleteDamageImage.rejected, (s, a) => {
        s.loading.images = false
        s.error = a.payload as any
      })
      // aux
      .addCase(checkTireData.pending, (s) => {
        s.loading.aux = true
        s.error = null
      })
      .addCase(checkTireData.fulfilled, (s, a) => {
        s.loading.aux = false
        s.tiresGate = a.payload.tiresGate
      })
      .addCase(checkTireData.rejected, (s, a) => {
        s.loading.aux = false
        s.error = a.payload as any
      })
      .addCase(loadDriver.pending, (s) => {
        s.loading.aux = true
        s.error = null
      })
      .addCase(loadDriver.fulfilled, (s, a) => {
        s.loading.aux = false
        s.driver = a.payload.driver
      })
      .addCase(loadDriver.rejected, (s, a) => {
        s.loading.aux = false
        s.error = a.payload as any
      })
      .addCase(loadHaulageType.pending, (s) => {
        s.loading.aux = true
        s.error = null
      })
      .addCase(loadHaulageType.fulfilled, (s, a) => {
        s.loading.aux = false
        s.haulage = a.payload.haulage
      })
      .addCase(loadHaulageType.rejected, (s, a) => {
        s.loading.aux = false
        s.error = a.payload as any
      })
      .addCase(loadLastTrip.pending, (s) => {
        s.loading.aux = true
        s.error = null
      })
      .addCase(loadLastTrip.fulfilled, (s, a) => {
        s.loading.aux = false
        s.trip = a.payload.trip
      })
      .addCase(loadLastTrip.rejected, (s, a) => {
        s.loading.aux = false
        s.error = a.payload as any
      })
      .addCase(createOtherAsset.pending, (s) => {
        s.loading.aux = true
        s.error = null
      })
      .addCase(createOtherAsset.fulfilled, (s, a) => {
        s.loading.aux = false
        s.newAsset = a.payload
      })
      .addCase(createOtherAsset.rejected, (s, a) => {
        s.loading.aux = false
        s.error = (a.payload as any) || 'Failed to create other asset'
      })
      .addCase(createRelatedOtherAssets.pending, (s) => {
        s.loading.aux = true
        s.error = null
      })
      .addCase(createRelatedOtherAssets.fulfilled, (s, a) => {
        s.loading.aux = false
        s.newAsset = a.payload
      })
      .addCase(createRelatedOtherAssets.rejected, (s, a) => {
        s.loading.aux = false
        s.error = (a.payload as any) || 'Failed to create other asset and related asset'
      })
      //image
    .addCase(loadGateImage.pending, (s) => {
      s.loading.image = true;
      s.error = null;
      // optional: keep previous image or clear it:
      // s.image = null;
    })
    .addCase(loadGateImage.fulfilled, (s, action) => {
        s.loading.image = false;
        //action.payload = action.meta.arg;
        s.imageFile = action.payload;
      },
    )
    .addCase(loadGateImage.rejected, (s, action) => {
      s.loading.image = false;
      s.error = action.payload as any;
    })
    // loadGateImagesData
    .addCase(loadGateImagesData.pending, (s) => {
      s.loading.imgsInfo = true;
      s.error = null;
      // optional: keep previous image or clear it:
      // s.image = null;
    })
    .addCase(loadGateImagesData.fulfilled, (s, action) => {
        s.loading.imgsInfo = false;
        //action.payload = action.meta.arg;
        s.imagesInfo = action.payload.info;
      },
    )
    .addCase(loadGateImagesData.rejected, (s, action) => {
      s.loading.imgsInfo = false;
      s.error = action.payload as any;
    })
  },
})

export const { clearCurrent, clearError, loadDefaultGate, cleanChecklist, cleanTrip, clearAsset, clearImage } = gatesSlice.actions
export default gatesSlice.reducer
