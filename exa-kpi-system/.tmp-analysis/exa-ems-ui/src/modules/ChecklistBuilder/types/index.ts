export interface ChecklistBuilder {
  checkListBuilderId: number;
  gateTypeId: number;
  equipmentTypeId: number | null;
  sizeEquipmentId: number | null;
  gensetTypeId?: number | null;
  checkListName?: string;
  ownedEquipment?: number;
  defaultConfig?: number;
  equipmentPartsIds: number[];
  depotIds: number[];
  clientIds: number[];
  sectionPartsIds: number[];
  instruction: string;
  createUser: number;
  updateUser: number;
  createDate: string;
  updateDate: string;
  company: number | null;
  active: number;
  status: number;
}

export interface ChecklistBuilderOverviewRow extends ChecklistBuilder {
  gateType: string;
  equipmentSizeType: string;
  isOwnedEquipment: string;
  isDefaultConfig: string;
  depots: string;
  clients: string;
  createdBy: string;
  updatedBy: string;
  equipmentTypedId: any;
  sizeEquipmentdId: any;
  createdUser: any;
  updatedUser: any;
  linked_depots: any[];
  linked_clients: any[];
  gensetTypedId: any;
  gateTypedId: any;
}

export interface ChecklistForm {
  checkListBuilderId?: number

  equipmentTypeId: number | null
  gensetTypeId: number | null
  sizeEquipmentId: number | null
  gateTypeId?: number | string

  ownedEquipment: number | boolean
  defaultConfig: number | boolean

  clientIds: number[]
  depotIds: number[]

  part: any
  parts: any[]

  // allow extra API fields
  [key: string]: any
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
  sizeEquipmentId: number;
  axieId: number;
  equipmentTypeId: number;
  sizeType: string;
  isoCode1: string;
  isoCode2: string;
  isoCode3: string;
  isoCode4: string;
  isoCode5: string;
  isoCode6: string;
  isoCode7: string;
  isoCode8: string;
  isoCode9: string;
  isoCode10: string;
  description: string;
  extendable: number;
  createUser: number;
  updateUser: number;
  createDate: Date;
  updateDate: Date;
  company: number | null;
  status: number;
}


export interface Depot {
  depotId: number;
  locationId: number;
  depotName: string;
  depotCode: string | null;
  createUser: number | null;
  createDate: Date | null;
  updateUser: number | null;
  updateDate: Date | null;
  company: number | null;
  active: boolean;
  status: number | null;
}

export interface ChecklistListParams {
  filter: any[]
  search: string | null
  match: string | null
  rows: number
  first: number
  sortField: string | null
  sortOrder: number | null
  filters?: Record<string, any>
}