import { FixedEquipmentParts } from '../types'

// If the API already returns FixedEquipmentParts[]
const fixListPageData = (list: FixedEquipmentParts[]): FixedEquipmentParts[] => {
  const listClone = list.map(item => ({ ...item }))
  //console.log('fixListPageData called', listClone)

  listClone.forEach(elem => {
    elem.equipmentSizeType =
      elem.equipmentSize === null
        ? elem.gensetType?.name
        : elem.equipmentSize.sizeType

    elem.equipmentType = elem.equipmentType.equipmentName;

  })

  return listClone
}

export default fixListPageData;