export type GateType = 'IN' | 'OUT'

export type SelectOption = {
  label: string
  value: string | number;
  disabled?: boolean
}

/** list row used by GatesListPage */
export type GateListRow = {
  id: number
  gateType: GateType
  createdAt?: string
  containerlabel?: string
  chasislabel?: string
  trucklabel?: string
  gensetlabel?: string
  owner?: string
  depot?: string
  client?: string
}

/** container drafts (from previous steps) */
export type GateContainerDraft = {
  showEquipment: number
  ownedEquipment: number
  equipmentId: number | null
  equipmentSizeTypeId: number | null
  equipmentClientId: number | null
  equipmentColorId: number | null
  equipmentPlateId: string | null
  equipmentTare?: string | null
  addNewEquipment?: boolean
}

export type NewContainerDraft = {
  containerNumber?: string
  sizeTypeId?: number | null
  tare?: string
  clientId?: number | null
  colorId?: number | null
  plate?: string
}

/** chassis drafts (from previous steps) */
export type GateChassisDraft = {
  showEquipment: number
  ownedEquipment: number
  equipmentId: number | null
  chassisTypeId: number | null
  equipmentClientId: number | null
  equipmentSubdivisionId: number | null
  inTransit: number
  addNewEquipment?: boolean
}

export type NewChassisDraft = {
  chassisNumber?: string
  chassisTypeId?: number | null
  inTransit?: boolean
  clientId?: number | null
  subdivisionId?: number | null
}

/** genset drafts (from previous steps) */
export type GateGensetDraft = {
  showEquipment: number
  ownedEquipment: number
  equipmentId: number | null
  gensetTypeId: number | null
  equipmentClientId: number | null
  equipmentSubdivisionId: number | null
  inTransit: number
  fuelLevel?: number | null
  engineHours?: number | null
  remarks?: string
  addNewEquipment?: boolean
}

export type NewGensetDraft = {
  gensetNumber?: string
  gensetTypeId?: number | null
  inTransit?: boolean
  clientId?: number | null
  subdivisionId?: number | null
  serialNumber?: string
}

/** truck drafts (this step) */
export type GateTruckDraft = {
  truckId: number | null
  driverId: number | null
}

export type NewTruckDraft = {
  plate?: string
  colorId?: number | null
  subdivisionId?: number | null
}

export type NewDriverDraft = {
  firstName?: string
  lastName?: string
  license?: string
}

/** last trip info summary shown on TruckForm */
export type LastTripInfo = {
  tripId: number | string
  client?: string
  route?: string
  status?: string
}

export type DamageTypeOption = { value: number | string; label: string }

export type EquipmentPartSectionForDamage = {
  sectionId: number | string
  isoCode: string
  /** Image-map coordinates. Legacy backend returns a string like "x1,y1,x2,y2" */
  coordinates: string
}

export type EquipmentPartForDamage = {
  equipmentPartId: number | string
  partName: string
  description?: string | null
  sections_data: EquipmentPartSectionForDamage[]
}

export type GateDamageDraft = {
  damageId: number | string | null
  partName: string
  partId: number | string | null
  sectionId: number | string | null
  sectionName: string
  remarks: string
  /** Existing record id (edit mode). Legacy name: gateDamageDataId */
  gateDamageDataId: number | string | null
  damageImage?: File | null
  additional: boolean // additional damage coming from ref image
  damageImagePreview?: string
}

export type EquipmentRequestDraft = {
  requestTypeId: number | null
  referenceNumberBooking: string
  clientId: number | null
  vesselCode: string
  workOrderId: string
  consignee: string
  voyage: string
  comments: string
}

export type EquipmentRequirementDraft = {
  containerSizeId: number | null
  chassisSizeId: number | null
  genset: number | null
  tripId: number | null
  equipmentClientContainer: 0 | 1
  equipmentClientChassis: 0 | 1
  equipmentClientGenset: 0 | 1
}

export type GateChecklistPart = {
  equipmentPartId: number
  partName: string
  description?: string | null
  partSections: GateChecklistSection[]
}

export type GateChecklist = {
  defaultConfig?: number // 1 means default checklist
  equipmentParts: GateChecklistPart[]
}

export type ID = number;

export interface Option {
  value: number;
  label: string;
}


export interface GateDamageRow {
  gateDamageDataId: number | null;
  damageId: number | null;
  equipmentPartId: number | null;
  partId?: number | null; // UI-friendly id (legacy used partId)
  partSectionId?: number | null; // backend expects partSectionId
  sectionId?: number | null; // UI-friendly sectionId
  remarks?: string;
  // backend may include nested descriptors; keep permissive
  [key: string]: any;
}

export interface GateChecklistSection {
  checkListBuilderId: number | null;
  partSectionId: number | null;
  instruction: string;
  [key: string]: any;
}

export interface GateForm {
  gateId?: number | null;
  gateIdTemp?: string | null;
  depotId: number | string | null;
  gateTypeId: number | string | null;
  requestId?: number | string | null;
  truckId?: number | string | null;
  driverId?: number | string | null;
  tripId?: number | string | null;
  subdivisionId?: number | string | null;
  signatureDriver: string; // base64 data url OR raw base64, UI layer decides; API strips prefix
  signatureInspector: string;
  gateDetails: GateDetail[];
  [key: string]: any;
}

export interface ChecklistBuilder {
  [key: string]: any;
}

export interface DriverRecord {
  [key: string]: any;
}

export interface TripRecord {
  [key: string]: any;
}

export interface HaulageTypeRecord {
  [key: string]: any;
}

export interface TiresGateData {
  [key: string]: any;
}

// Example: keep your object strongly typed
// If you want the keys to stay numeric (134, 194, etc) you can type them as numeric literal keys:
export type NewContainerObject = {
  134: number;              // vehicle type
  194: string | null;       // personal id
  203: number | null;       // color
  205: string | null;       // description
  206: string | null;       // serie | plate
  222: number | null;       // equipment type
  225: number | null;       // equipment size
  223: number | null;       // client
  224: number | null;       // tare

  company_id: number;
  isloading: boolean;
  moduleId: number;

  otherAssetType: number | null;
  otherAssetsId: number | null;
  relatedAssetIds: number[] | null;

  subdivision_id: number | null;
  subdivisions: any | null; // tighten this if you know the shape
};

export type NewChassisObject = {
  134: number;            // vehicle type
  194: string | null;     // personal id
  205: string | null;     // description
  206: string | null;     // serie | plate
  222: number;            // equipment type
  223: number | null;     // client
  225: number | null;     // equipment size

  inTransit: 0 | 1;
  otherAssetsId: number | null;
  moduleId: number;
  otherAssetType: number | null;

  isloading: boolean;
  subdivisions: any | null;      // tighten if you know its shape
  company_id: number;
  subdivision_id: number | null;
  relatedAssetIds: number[] | null;
};

export type NewGensetObject = {
  134: number; // vehicle type
  194: number | null; // personal id
  205: string | null; // description
  206: string | null; // serie | plate
  227: number | null; // genset type
  222: number; // equipment type
  223: number | null; // client

  inTransit: 0 | 1;
  otherAssetsId: number | null;
  moduleId: number; // 44
  otherAssetType: number; // 3
  isloading: boolean;
  subdivisions: any;
  company_id: number; // 5
  subdivision_id: number | null;
  relatedAssetIds: number[] | null;
};

export type NewTruckObject = {
  125: Nullable<number>; // fuel type
  134: number; // vehicle type (e.g. 1021)
  194: Nullable<string>; // personal id (could be string like "ABC123")
  197: Nullable<number>; // kind of subdiv
  201: Nullable<number>; // model (id)
  202: Nullable<number>; // year
  203: Nullable<number>; // color (id)
  205: Nullable<string>; // descripcion
  214: Nullable<number>; // fuel recipient

  otherAssetsId: Nullable<number>;
  moduleId: number; // 44
  otherAssetType: number; // 2
  isloading: boolean;

  subdivisions: any | null; // replace `any` with your Subdivision type if you have it
  company_id: number; // 5
  subdivision_id: Nullable<number>; // 40
  relatedAssetIds: Array<number>; // []
};

export type NewDriverObject = {
  194: Nullable<string>; // personal id
  195: Nullable<string>; // first name
  196: Nullable<string>; // last name
  197: Nullable<number>; // kind of subdiv
  198: Nullable<string>; // mobile

  otherAssetsId: Nullable<number>;
  moduleId: number; // 44
  otherAssetType: number; // 1
  isloading: boolean;

  subdivisions: any | null; // replace `any` with your Subdivision type if you have it
  company_id: number; // 5
  subdivision_id: Nullable<number>; // 40
  relatedAssetIds: number[]; // []
};


export type AttributeItem = { name: string; attributeItemId: number };

export type ChecklistSection = {
  partSectionId?: number;
  sectionId?: number;
  code?: string;
  conditionId?: number | null;
  remarks?: string | null;
  [k: string]: any;
};

export type ChecklistPart = {
  equipmentPartId: number;
  partName: string;
  partSections: ChecklistSection[];
  [k: string]: any;
};

export type Checklist = {
  equipmentParts: Array<{
    partSections: Array<{
      conditionId?: number | null;
      remarks?: string | null;
      [key: string]: any;
    }>;
    [key: string]: any;
  }>;
  [key: string]: any;
};


export type DamageDataRow = {
  damageType: number;
  partName: string;
  partId: number;
  sectionId: number;
  sectionName?: string;
  remarks?: string | null;
};

export type KindOfChecklist = "container" | "chassis" | "genset";
export type Nullable<T> = T | null;

// ----------------- gateDetailsObj types -----------------

export type GateDamageEquipmentPart = {
  equipmentPartId: Nullable<number>;
  partName: string;
  description: string;
};

export type GateDamageSection = {
  sectionId: Nullable<number>;
  code: string;
  description: string;
};

export type GateDamageData = {
  gateDamageDataId: Nullable<number>;
  damageId: Nullable<number>;
  equipmentPartId: Nullable<number>;
  equipmentPartd: GateDamageEquipmentPart;
  sectionId: Nullable<number>;
  sectionsd: GateDamageSection;
  remarks: string;
};

export type CheckListSectiondItem = {
  checkListBuilderId: Nullable<number>;
  partSectionId: Nullable<number>;
  instruction: string;
};

export type EquipmentPartSectionData = {
  sectionId: Nullable<number>;
  equipmentPartId: Nullable<number>;
  code: string;
  isoCode: string;
  coordinates: string;
  description: string;
};

export type ChecklistEquipmentPart = {
  equipmentPartId: Nullable<number>;
  partName: string;
  description: string;
  sections_data: EquipmentPartSectionData[];
};

export type GateChecklistData = {
  gateChecklistDataId: Nullable<number>;
  checkListBuilderId: Nullable<number>;
  checkListSectiond: CheckListSectiondItem[];
  equipmentPartId: Nullable<number>;
  equipmentPartd: ChecklistEquipmentPart[]; // your sample shows this is an array
  sectionId: Nullable<number>;
  conditionId: Nullable<number>;
  remarks: string;
};

export type GateDetail = {
  gateDetailId: Nullable<number>;
  ownedEquipment: 0 | 1;
  equipmentTypeId: number; // containerTypeId | chassisTypeId | gensetTypeId at runtime
  sizeEquipmentId: Nullable<number>;
  equipmentId: Nullable<number>;
  clientId: Nullable<number>;
  remarks: string;
  inTransit?: 0 | 1;
  subdivision_id?: Nullable<number>;
  gensetTypeId: Nullable<number>;
  fuelLevel: Nullable<number>;
  engineHours: Nullable<number>;
  status: Nullable<number | string>;
  showEquipment: 0 | 1;
  gateDamageData: GateDamageData[];
  gateChecklistData: GateChecklistData[];
};

export type GateDetailsObj = GateDetail[];

// ----------------- gateRecord type -----------------

export type GateRecord = {
  gateId: Nullable<number>;
  depotId: Nullable<number>;
  gateTypeId: Nullable<number>;
  requestId: Nullable<number>;
  requestdId: any;
  equipmentRequestId: Nullable<number>;
  truckId: Nullable<number>;
  driverId: Nullable<number>;
  tripId: Nullable<number>;
  subdivisionId: Nullable<number>;
  signatureDriver: Nullable<string>;
  signatureInspector: Nullable<string>;
  gateDetails: GateDetailsObj;
  gateIdTemp: Nullable<string>;
  requirementSize: {
    containerSize: Nullable<number>;
    chassisSize: Nullable<number>;
    genset: Nullable<number>;
  };
  requiredOwner: {
    chassisOwner: Nullable<number>;
    chassisModule: Nullable<number>;
    containerOwner: Nullable<number>;
    containerModule: Nullable<number>;
    gensetOwner: Nullable<number>;
    gensetModule: Nullable<number>;
  };
};

export type GatesLoading = {
  list: boolean
  current: boolean
  saving: boolean
  deleting: boolean
  checklist: boolean
  lookups: boolean
  image: boolean
  aux: boolean,
  imgsInfo: boolean
}

/* export type CreatedAssetResponse = {
  newAsset: {
    active: number;
    assetsid: number;
    createuser: number;
    updateuser: number;
    genericname1: string | null;
    company_id: number;
    subdivisionId: number | null;
    moduleid: number;
    status: number;
    updatedate: string; // ISO datetime string
    createdate: string; // ISO datetime string
  };
  assetWithAssociatedData: unknown | null;
}; */

export type CreatedAssetResponse = {
  data: {
    newAsset: {
      active: 0 | 1;
      assetsid: number;
      createuser: number;
      updateuser: number;
      genericname1: number;
      company_id: number;
      subdivisionId: number | null;
      moduleid: number;
      status: number;
      updatedate: string; // ISO date string
      createdate: string; // ISO date string
    };
    assetWithAssociatedData: unknown | null;
    relatedAsset: { assetsid: number }
  };
  status: number;
  statusText: string;
  headers: {
    "content-length": string;
    "content-type": string;
    [key: string]: string;
  };
  config: {
    transitional: {
      silentJSONParsing: boolean;
      forcedJSONParsing: boolean;
      clarifyTimeoutError: boolean;
    };
    adapter: string[];
    transformRequest: (unknown | null)[];
    transformResponse: (unknown | null)[];
    timeout: number;
    xsrfCookieName: string;
    xsrfHeaderName: string;
    maxContentLength: number;
    maxBodyLength: number;
    env: Record<string, unknown>;
    headers: {
      Accept: string;
      "Content-Type": string;
      Authorization?: string;
      [key: string]: string | undefined;
    };
    baseURL: string;
    method: string; // e.g. "post"
    url: string;
    data: string; // JSON string payload
    allowAbsoluteUrls: boolean;
  };
  request: Record<string, unknown>;
};

export type GateImageItem = {
  depotImageId: number;
  key: string;
  controlId1: number;
  controlId2: number;
};

export type GateImagesFlatInfo = {
  gateId: number;
  count: number;
  images: GateImageItem[];
};



export interface GatesState {
  list: GateListRow[]
  total: number
  current: GateRecord | null
  checkListBuilder: ChecklistBuilder | null
  currentEquipmentTypeId: number | null
  driver: DriverRecord | null
  tiresGate: TiresGateData | null
  haulage: HaulageTypeRecord | null
  trip: TripRecord | null
  lookups: Record<string, any>
  images: any[]
  loading: GatesLoading
  error: { errors: [{ message: string }] } | null
  newAsset: CreatedAssetResponse | null
  imageFile: File | null
  imagesInfo: GateImagesFlatInfo | null
}

export type TripInfo = {
  tripId: number | "Not Found";
  driverId: number | "Not Found";
  subdivisionId: number | "Not Found";
  client: string | "Not Found";
  clientId: number | "Not Found";
  route: string | "Not Found";
  tripstatusId: number | "Not Found";
  tripstatus: string | "Not Found";
};

export type ValidationIssue = {
  path: Array<string | number>;
  message: string;
};

type ErrorMap = Record<string, string>;
export type ValidationErrorsState = {
  containerErrors: ErrorMap | false;
  chassisErrors: ErrorMap | false;
  gensetErrors: ErrorMap | false;
  containerDamageErrors: ErrorMap | false;
  chassisDamageErrors: ErrorMap | false;
  gensetDamageErrors: ErrorMap | false;
};


export type ChangeEvt = React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export type AutoSuggestEvt = {
  target: {
    name: string; // e.g. "equipmentId"
    value: number;
    label: string;
    data: {
      value: number;
      label: string;
      size: string;
      chassisNo: string;
      current_gate_id: number | null;
      equipment_owner_id: string; // API returns "20" as string
      moduleid: number;
      details: {
        assetsid: number;
        moduleid: number;

        genericname1: string;
        genericvalue1: string;
        genericname2: string;
        genericvalue2: string;
        genericname3: string;
        genericvalue3: string;

        subdivisionId: number | null;
        vehicle_type: string | null;

        chassis_no: string;
        description: string | null;
        client: string;

        date_purchased: string; // "MM/DD/YYYY"
        color: string;
        brand: string;
        brand_reference: string | null;

        equipment_size: string;
        equipment_size_id: string;
        year: string;
        equipment_owner: string;
        active: string;
        chassis_status: string;

        plate: string;
        serial_no: string;

        sap_code: string | null;
        archive_number: string | null;
        current_gate_id: number | null;
      };
    };
  };
};

export type EventTarget<TData> = {
  name: string;
  value: number | string;
  label: string;
  data: TData;
};

export type OnChangeEvt<TData> = {
  target: EventTarget<TData>;
};

export type ChassisAutoSuggestData = {
  value: number | string;
  label: string;
  size: string;
  chassisNo: string;
  current_gate_id: number | null;
  equipment_owner_id: string;
  moduleid: number;
  details: {
    assetsid: number;
    moduleid: number;
    genericname1: string;
    genericvalue1: string;
    genericname2: string;
    genericvalue2: string;
    genericname3: string;
    genericvalue3: string;
    subdivisionId: number | null;
    vehicle_type: string | null;
    chassis_no: string;
    description: string | null;
    client: string;
    date_purchased: string;
    color: string;
    brand: string;
    brand_reference: string | null;
    equipment_size: string;
    equipment_size_id: string;
    year: string;
    equipment_owner: string;
    active: string;
    chassis_status: string;
    plate: string;
    serial_no: string;
    sap_code: string | null;
    archive_number: string | null;
    current_gate_id: number | null;
  };
};


// Matches e.target.data for a genset autosuggest selection
export type GensetAutoSuggestData = {
  value: number;
  label: string;
  current_gate_id: number | null;
  equipment_owner_id: string; // API returns ids as strings
  moduleid: number;
  details: {
    assetsid: number;
    moduleid: number;
    genericname1: string | null;
    genericvalue1: string | null;
    genericname2: string | null;
    genericvalue2: string | null;
    genericname3: string | null;
    genericvalue3: string | null;
    subdivisionId: string | null;
    subdivisionName: string | null;
    vehicle_type: string | null; // "1537"
    genset_no: string | null;
    description: string | null;
    client: string | null;
    genset_type: string | null;
    genset_type_id: string | null;
    date_purchased: string | null;
    color: string | null;
    brand_engine: string | null;
    model: string | null;
    year: string | null;
    initial_hours: string | null;
    chassis: string | null;
    equipment_owner: string | null;
    active: string | null;
    genset_status: string | null;
    serial_no: string | null;
    sap_code: string | null;
    fuel_type: string | null;
    current_gate_id: number | null;
    fuelType: string | null;
    fuel_recipient: string | null;
    color_text: string | null;
    brand_engine_text: string | null;
    year_text: string | null;
  };
};

export type ContainerAutoSuggestData = {
  value: number;
  label: string;
  size: string;          
  containerNo: string;  
  current_gate_id: number | null;
  equipment_owner_id: string; 
  moduleid: number;
  details: {
    assetsid: number;
    moduleid: number;
    genericname1: string | null;
    genericvalue1: string | null;
    genericname2: string | null;
    genericvalue2: string | null;
    genericname3: string | null;
    genericvalue3: string | null;
    container_no: string;
    equipment_size: string;
    equipment_size_id: string;
    color: string | null; 
    equipment_owner: string | null; 
    equipment_owner_id: string;
    current_gate_id: number | null;
  };
};

export type EquipmentRequestData = {
  equipmentRequestId: number | null;
  clientId: number | null;
  workOrderId: number | string | null;
  requestTypeId: number | null;
  referenceNumberBooking: string | number | null;
  consignee: string | null;
  vesselCode: string | null;
  voyage: string | null;
  comments: string | null;
};

export type EquipmentRequirementData = {
  tripId: number | null;

  equipmentClientContainer: 0 | 1;
  containerSizeId: number | null;

  equipmentClientChassis: 0 | 1;
  chassisSizeId: number | null;

  equipmentClientGenset: 0 | 1;
  genset: 0 | 1; // your default is 1

  containerlabel: string;
  chassislabel: string;
  triplabel: string;
  gensetlabel: string; // e.g. "Yes" / "No"
};

export type NewRequestObject = {
  requestDetails: EquipmentRequestData;
  requirements: EquipmentRequirementData[];
};

type ISODateString = string;

export interface EquipmentRequest {
  equipmentRequestId: number;
  requestTypeId: number;
  clientId: number;
  workOrderId: number;
  referenceNumberBooking: string;
  consignee: string;
  vesselCode: string;
  comments: string;
  voyage: string;
  createUser: number;
  updateUser: number;
  createDate: ISODateString;
  updateDate: ISODateString;
  company: number;
  status: number;

  requirements: EquipmentRequirement[];
  requestType: RequestType;
  workOrder: WorkOrder;
  client: Client;
}

export interface EquipmentRequirement {
  requestId: number;
  equipmentRequestId: number;
  tripId: number;
  equipmentClientContainer: number;
  containerSizeId: Nullable<number>;
  equipmentClientChassis: number;
  chassisSizeId: Nullable<number>;
  equipmentClientGenset: number;
  genset: number;
  createUser: Nullable<number>;
  createDate: ISODateString;
  updateUser: Nullable<number>;
  updateDate: ISODateString;
  company: number;
  status: number;

  containerSize: Nullable<EquipmentSize>;
  chassisSize: Nullable<EquipmentSize>;
  trip_details: TripDetails;
}

export interface EquipmentSize {
  sizeEquipmentId: number;
  axieId: number;
  equipmentTypeId: number;
  sizeType: string;
  isoCode1: Nullable<string>;
  isoCode2: Nullable<string>;
  isoCode3: Nullable<string>;
  isoCode4: Nullable<string>;
  isoCode5: Nullable<string>;
  isoCode6: Nullable<string>;
  isoCode7: Nullable<string>;
  isoCode8: Nullable<string>;
  isoCode9: Nullable<string>;
  isoCode10: Nullable<string>;
  description: string;
  extendable: number;
  createUser: number;
  createDate: ISODateString;
  updateUser: number;
  updateDate: ISODateString;
  company: number;
  status: number;
}

export interface TripDetails {
  tripsid: number;
  workorderid: number;
  triporderid: Nullable<number>;
  chassisid: number;
  gensetid: number;
  kminitial: Nullable<number>;
  kmfinal: Nullable<number>;
  hoursinitial: Nullable<number>;
  hoursfinal: Nullable<number>;
  pickupboleta: Nullable<string>;
  deliveryboleta: Nullable<string>;
  truckarpkdate: Nullable<ISODateString>;
  trucklvpkdate: Nullable<ISODateString>;
  containerarcusdate: Nullable<ISODateString>;
  containerlvcusdate: Nullable<ISODateString>;
  truckarprdate: Nullable<ISODateString>;
  trucklvprdate: Nullable<ISODateString>;
  containerardldate: Nullable<ISODateString>;
  containerlvdldate: Nullable<ISODateString>;
  FreeTime: Nullable<number>;
  other1: Nullable<number>;
  other2: number;
  other3: number;
  tripopen: number;
  tripactive: Nullable<number>;
  tripstatus: number;
  invoice: Nullable<number>;
  payment: Nullable<number>;
  createuser: number;
  updateuser: number;
  createdate: ISODateString;
  updatedate: ISODateString;
  containerRef: string;
  inventoryid: number;
  driverid: number;
  subdivision: number;
  containertypeid: number;
  inventorystatus: Nullable<number>;
  totaltriphours: number;
  status: number;
  timerpickup: Nullable<number>;
  timetransitcostums: Nullable<number>;
  timercustoms: Nullable<number>;
  timetransitdelivery: Nullable<number>;
  timerdelivery: Nullable<number>;
  timertransitdol: Nullable<number>;
  timerdol: Nullable<number>;
  timetobeassigned: number;
  timeassigned: number;
  invoicestatus: number;
  paymentstatus: number;
  closetripdate: Nullable<ISODateString>;
  total_km: number;
  total_km_rate_d: number;
  total_rate_km_lps: number;
  othercharges: number;
  subtotal: number;
  tax_d: number;
  final_total: number;
  payment_total_km: number;
  payment_total_km_rate_d: number;
  payment_total_rate_km_lps: number;
  payment_othercharges: number;
  payment_subtotal: number;
  payment_tax_d: number;
  payment_final_total: number;
}

export interface RequestType {
  attributeItemid: number;
  name: string;
  attributeid: number;
  createuser: number;
  createdate: ISODateString;
  updateuser: number;
  updatedate: ISODateString;
  status: number;
  flat_name_id: string;
}

export interface WorkOrder {
  workOrderId: number;
  refNumber: string;
  clientid: number;
  routeID: string;
  inventoryid: Nullable<number>;
  cargoid: number;
  cityaid: string;
  citybid: string;
  citycid: Nullable<string>;
  locationa: number;
  locationb: number;
  locationc: Nullable<number>;
  datea: ISODateString;
  dateb: ISODateString;
  timea: Nullable<string>;
  timeb: Nullable<string>;
  customs: number;
  UpdateUser: string;
  UpdateDate: ISODateString;
  createUser: string;
  createDate: ISODateString;
  status: number;
  pickupcity: string;
  deliveredcity: string;
  returncity: string;
  uniqueprice: string;
  uniquekm: string;
  invoiceothercharges: string;
  invkm: string;
  invoiceprice: string;
  ntrip: number;
  client: string;
  pickupdatime: string;
  deliverdattime: string;
  cargotype: string;
  source: Nullable<string>;
  active: number;
}

export interface Client {
  clientId: number;
  name: string;
  email: string;
  phone: string;
  reference: string;
  active: number;
  subdivisionid: number;
  createuser: number;
  createdate: ISODateString;
  updateuser: number;
  updatedate: ISODateString;
  status: number;
  allroutesinv: number;
  allroutespay: number;
  allsubdivisionpay: number;
  skiproutesinv: string;
  skiproutespay: string;
  skipsubdivision: string;
  exchangerate: string;
  companyId: number;
}









