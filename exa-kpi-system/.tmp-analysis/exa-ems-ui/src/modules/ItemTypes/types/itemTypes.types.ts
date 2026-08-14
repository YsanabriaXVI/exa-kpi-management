// src/modules/ItemTypes/types/itemTypes.types.ts

export type ItemType = {
  itemTypeId: number
  ISOCode?: string
  description?: string
  status?: number
  active?: number
}

export type ItemTypeForm = {
  itemTypeId?: number
  ISOCode?: string
  description?: string
  status?: number
  active?: number
}

// Backend errors can be: string | {message} | [{message}] | etc.
export type ItemTypesErrors = any | null
