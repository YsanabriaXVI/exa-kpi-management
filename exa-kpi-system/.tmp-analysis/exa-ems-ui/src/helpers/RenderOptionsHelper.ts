// Common option type used by all helpers
export interface SelectOption {
  value: string | number
  label: string | number
  disabled?: boolean
}

// Helper type for "any object with string keys"
type AnyRecord = Record<string, any>

export const RenderAdvancedOption = (
  el: AnyRecord,
  idField: string = 'id',
  nameField: string = 'name',
  disabled: boolean = false,
): SelectOption => {
  return {
    value: el[idField],
    label: el[nameField],
    disabled,
  }
}

export const RenderOption = RenderAdvancedOption

export const RenderAdvancedOptions = (
  data: AnyRecord[],
  idField: string = 'id',
  nameField: string = 'name',
  disabled: boolean = false,
): SelectOption[] => {
  return data.map((el) => RenderAdvancedOption(el, idField, nameField, disabled))
}

export const RenderAdvancedOptionsWithStatus = (
  data: AnyRecord[],
  idField: string = 'id',
  nameField: string = 'name',
): SelectOption[] => {
  return data.map((el) => {
    const hasStatus = Object.prototype.hasOwnProperty.call(el, 'status')
    const status = !( !hasStatus || (hasStatus && el.status) )
    return RenderAdvancedOption(el, idField, nameField, status)
  })
}

export const RenderOptions = (
  list: AnyRecord[],
  idField: string = 'id',
  nameField: string = 'name',
  disabled: boolean = false,
): SelectOption[] => {
  return RenderAdvancedOptions(list, idField, nameField, disabled)
}

export const sortOptions = (options: SelectOption[] = []): SelectOption[] => {
  return options.sort((a, b) => {
    const labelA = String(a.label).trim()
    const labelB = String(b.label).trim()
    let result = 0

    if (labelA.toLowerCase() === 'all') {
      result = -1
    } else if (labelB.toLowerCase() === 'all') {
      result = 1
    } else if (typeof a.label === 'number' && typeof b.label === 'number') {
      // numeric compare on the labels
      result = a.label - b.label
    } else {
      result = labelA.localeCompare(labelB)
    }

    return result
  })
}
