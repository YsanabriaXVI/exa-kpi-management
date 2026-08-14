import type { Attribute, AttributeItem } from '../../../Attributes/types'

export type AttributeField = Pick<Attribute, 'attribute_id' | 'name' | 'required' | 'order' | 'field_type_id'> & {
  attribute_items?: AttributeItem[]
  fieldTypeId?: number
}

export type RelatedAsset = {
  relatedAssetId?: number
  assetsid?: number
}

export type AttributeMap = Record<string, any>

export interface OtherAsset {
  assetsid?: number
  moduleid?: number
  genericname1?: string | number | null
  company_id?: number | null
  subdivisionId?: number | null
  subdivision_id?: number | null
  otherAssetType?: string | number | null
  vehicleType?: string | number | null
  attributes?: AttributeMap
  AssetsData?: { attributeid?: number | string; value?: any }[]
  RelatedAssets?: RelatedAsset[]
  relatedAssetIds?: (number | string)[]
}

export interface OtherAssetFormValues {
  assetsid?: number
  otherAssetType: string
  vehicleType?: string
  company_id?: number | ''
  subdivision_id?: number | ''
  relatedAssetIds: (number | string)[]
  attributes: AttributeMap
}

export interface OtherAssetsPagination {
  page: number
  perPage: number
  total: number
}

export interface OtherAssetsState {
  list: OtherAsset[]
  current: OtherAsset | null
  loading: boolean
  error: string | null
  pagination: OtherAssetsPagination
  formAttributes: AttributeField[]
  attributesLoading: boolean
  vehicleTypes: AttributeItem[]
  vehicleTypesLoading: boolean
}
