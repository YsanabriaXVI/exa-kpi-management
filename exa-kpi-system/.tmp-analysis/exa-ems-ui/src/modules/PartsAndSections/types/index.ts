export interface EquipmentParts {
  equipmentPartId: number
  equipmentTypeId: number
  sizeEquipmentId: number
  gensetTypeId: number
  partName: string
  description: string
  sectionPartId: number
  sectionCode: string
  isoCode: string
  coordinate: string
  sectionDescription: string
  createUser: number
  createDate: Date
  updateUser: number
  updateDate: Date
  company?: number | null
  status: number
}

export interface GensetType {
  name: string;
  // other fields...
}

export interface FixedEquipmentParts {
  equipmentSize: EquipmentSize | null;
  gensetType: GensetType;
  equipmentSizeType?: string; // this will be added by the function
  total: number;
  [key: string]: any;         // allow additional fields that may exist
}

export interface PartsAndSectionsListParams {
  filter: any[]
  search: string | null
  match: string | null
  rows: number
  first: number
  sortField: string | null
  sortOrder: number | null
  filters?: Record<string, any>
}

export interface PartsAndSectionsRow {
  equipmentPartId: number,
  partName: string,
  description: string,
  equipmentType: string,
  equipmentSizeType: string,
}

export interface EquipmentType {
  equipmentTypeId: number
  equipmentName: string
  description: string | null
  createUser: number
  createDate: string        
  updateUser: number
  updateDate: string       
  company: number
  active: number            
  status: number            
}


export interface EquipmentSize {
  sizeEquipmentId: number
  axieId: number | null
  equipmentTypeId: number
  sizeType: string | null
  isoCode1: string | null
  isoCode2: string | null
  isoCode3: string | null
  isoCode4: string | null
  isoCode5: string | null
  isoCode6: string | null
  isoCode7: string | null
  isoCode8: string | null
  isoCode9: string | null
  isoCode10: string | null
  description: string | null
  extendable: number | null
  createUser: number | null
  createDate: string | null 
  updateUser: number | null
  updateDate: string | null
  company: number
  status: number | null
}

export interface Section {
  sectionId: number;            // PK - Auto increment
  equipmentPartId: number;      // FK -> equipmentParts.equipmentPartId
  code: string;                 // NOT NULL
  isoCode: string;              // NOT NULL
  coordinates: string;          // NOT NULL
  description: string | null;   // nullable
  createUser: number;           // NOT NULL
  createDate: string;           // datetime (ISO string)
  updateUser: number;           // NOT NULL
  updateDate: string;           // datetime (ISO string)
  company: number;              // FK -> company.company_id
  status: number;               // default 1
}


export interface DefaultSection {
  sectionID: string,
  code: string,
  isoCode: string,
  coordinates: string,
  description: string,
}

export interface DefaultPart {
    partName: string | null,
    description: string | null,
    equipmentTypeId: number | null,
    sizeEquipmentId: number | null,
    gensetTypeId: number | null,
    sections_data: DefaultSection[],
    status: number,
}

export interface EquipmentPartImage {
  control_id: string;
  attachment_id: number;
  name: string;
  type: string;
  url: string;
  lastModified?: string | null;
}


// ISO-ish datetime coming from API (string). If you parse it, you can change to Date.
export type IsoDateTimeString = string;

export interface EquipmentPartSection {
  sectionId: number;
  equipmentPartId: number;
  code: string;
  isoCode: string;
  coordinates: string; // e.g. "216,7,295,24"
  description: string | null;
  referent: number | null;
  createUser: number | null;
  createDate: IsoDateTimeString | null;
  updateUser: number | null;
  updateDate: IsoDateTimeString | null;

  company: number;
  status: number;
}

export interface UserLite {
  userid: number;
  firstName: string;
  lastName: string;
  email: string;

  phone: string | null;
  password: string | null;

  createUser: number | null;
  createDate: IsoDateTimeString | null;
  UpdateUser: number | null;
  UpdateDate: IsoDateTimeString | null;

  roleId: number;
  status: number;
  active: number; // looks like 0/1
  status_id: number;

  encrypted_pass: string | null;
  current_company: number | null;
  confirmation_token: string | null;
}

export interface Companyd {
  company_id: number;
  name: string;

  createuser: number | null;
  createdate: IsoDateTimeString | null;
  updateuser: number | null;
  updatedate: IsoDateTimeString | null;

  description: string | null;
  status: number;

  logo: string | null;
  address: string | null; // HTML string in your sample
}

export interface EquipmentPart {
  equipmentPartId: number;
  equipmentTypeId: number;
  sizeEquipmentId: number;
  gensetTypeId: number | null;

  partName: string;
  description: string | null;

  createUser: number | null;
  createDate: IsoDateTimeString | null;
  updateUser: number | null;
  updateDate: IsoDateTimeString | null;

  company: number;
  status: number;

  sections_data: EquipmentPartSection[];

  equipmentType: string; // e.g. "Container"
  equipmentSize: EquipmentSize;

  createdUser: UserLite | null;
  updatedUser: UserLite | null;

  companyd: Companyd | null;

  gensetType: string | null;
  equipmentSizeType: string; // e.g. "20FT"
}
