/**
 * Attribute Module Types
 */

export interface AttributeModule {
  module_id: number
  name: string
  section?: string
}

export interface FieldType {
  field_type_id: number
  name: string
  code?: string
  has_items?: boolean
}

export interface AttributeStatus {
  id: number
  name: string
}

export interface AttributeItem {
  attribute_item_id?: number | string | null
  name: string
  status?: number
  attribute_id?: number
}

export interface Attribute {
  attribute_id?: number
  name: string
  module_id?: number
  module?: AttributeModule
  field_type_id?: number
  type?: FieldType
  integral?: number | boolean | string
  required?: number | boolean | string
  row?: number
  order?: number
  column?: number | null
  status?: AttributeStatus | number
  primary_key?: number | null
  secondary_key?: number | null
  items?: AttributeItem[]
}

export interface AttributeListParams {
  moduleId?: number | null
  search?: string | null
  rows?: number
  first?: number
  sortField?: string
  sortOrder?: number
  filters?: Record<string, any>
}

export interface AttributesState {
  attributes: Attribute[]
  currentAttribute: Attribute | null
  modules: AttributeModule[]
  fieldTypes: FieldType[]
  loading: boolean
  error: string | Record<string, any> | null
  total: number
}
