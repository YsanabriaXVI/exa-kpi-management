
  export const gateDetailsObj = [
  {
    gateDetailId: null,
    ownedEquipment: 0,
    equipmentTypeId: null, //containerTypeId,
    sizeEquipmentId: null,
    equipmentId: null,
    clientId: null,
    remarks: "",
    gensetTypeId: null,
    fuelLevel: null,
    engineHours: null,
    status: null,
    showEquipment: 1,
    gateDamageData: [
      {
        gateDamageDataId: null,
        damageId: null,
        equipmentPartId: null,
        equipmentPartd: {
          equipmentPartId: null,
          partName: "",
          description: ""
        },
        sectionId: null,
        sectionsd: {
          sectionId: null,
          code: "",
          description: ""
        },
        remarks: "",
      }
    ],
    gateChecklistData: [
      {
        gateChecklistDataId: null,
        checkListBuilderId: null,
        checkListSectiond: [{
          checkListBuilderId: null,
          partSectionId: null,
          instruction: "",
        }, {
          checkListBuilderId: null,
          partSectionId: null,
          instruction: "",
        },
        ],
        equipmentPartId: null,
        equipmentPartd: [{
          equipmentPartId: null,
          partName: "",
          description: "",
          sections_data: [
            {
              sectionId: null,
              equipmentPartId: null,
              code: "",
              isoCode: "",
              coordinates: "",
              description: "",
            }
          ],
        }],
        sectionId: null,
        conditionId: null,
        remarks: "",
      }
    ]
  },
  {
    gateDetailId: null,
    ownedEquipment: 0,
    equipmentTypeId: null,//chassisTypeId,
    sizeEquipmentId: null,
    equipmentId: null,
    clientId: null,
    remarks: "",
    gensetTypeId: null,
    fuelLevel: null,
    engineHours: null,
    status: null,
    showEquipment: 1,
    gateDamageData: [
      {
        gateDamageDataId: null,
        damageId: null,
        equipmentPartId: null,
        equipmentPartd: {
          equipmentPartId: null,
          partName: "",
          description: ""
        },
        sectionId: null,
        sectionsd: {
          sectionId: null,
          code: "",
          description: ""
        },
        remarks: "",
      }
    ],
    gateChecklistData: [
      {
        gateChecklistDataId: null,
        checkListBuilderId: null,
        checkListSectiond: [{
          checkListBuilderId: null,
          partSectionId: null,
          instruction: "",
        }, {
          checkListBuilderId: null,
          partSectionId: null,
          instruction: "",
        },
        ],
        equipmentPartId: null,
        equipmentPartd: [{
          equipmentPartId: null,
          partName: "",
          description: "",
          sections_data: [
            {
              sectionId: null,
              equipmentPartId: null,
              code: "",
              isoCode: "",
              coordinates: "",
              description: "",
            }
          ],
        }],
        sectionId: null,
        conditionId: null,
        remarks: "",
      }
    ]
  },
  {
    gateDetailId: null,
    ownedEquipment: 0,
    equipmentTypeId: null,//gensetTypeId,
    sizeEquipmentId: null,
    equipmentId: null,
    clientId: null,
    remarks: "",
    gensetTypeId: null,
    fuelLevel: null,
    engineHours: null,
    status: null,
    showEquipment: 1,
    gateDamageData: [
      {
        gateDamageDataId: null,
        damageId: null,
        equipmentPartId: null,
        equipmentPartd: {
          equipmentPartId: null,
          partName: "",
          description: ""
        },
        sectionId: null,
        sectionsd: {
          sectionId: null,
          code: "",
          description: ""
        },
        remarks: "",
      }
    ],
    gateChecklistData: [
      {
        gateChecklistDataId: null,
        checkListBuilderId: null,
        checkListSectiond: [{
          checkListBuilderId: null,
          partSectionId: null,
          instruction: "",
        }, {
          checkListBuilderId: null,
          partSectionId: null,
          instruction: "",
        },
        ],
        equipmentPartId: null,
        equipmentPartd: [{
          equipmentPartId: null,
          partName: "",
          description: "",
          sections_data: [
            {
              sectionId: null,
              equipmentPartId: null,
              code: "",
              isoCode: "",
              coordinates: "",
              description: "",
            }
          ],
        }],
        sectionId: null,
        conditionId: null,
        remarks: "",
      }
    ]
  }
]

export const newContainerObj = {
  134: 1538, //vehicle type
  194: null, //personal id
  203: null, //color
  205: null, //description
  206: null, //serie | plate
  222: null, //equipment type
  225: null, //equipment size
  223: null, //client
  224: null, //tare
  company_id: 5,
  isloading: false,
  moduleId: 44,
  otherAssetType: 3,
  otherAssetsId: null,
  relatedAssetIds: null,
  subdivision_id: null,
  subdivisions: null,
}

export const newTruckObj = {
  125: null, //fuel type
  134: 1021, //vehicle type
  194: null, //personal id
  197: null, //kind of subdiv
  201: null, //model
  202: null, //year
  203: null, //color
  205: null, //descripcion
  214: null, //fuel recipient
  otherAssetsId: null,
  moduleId: 44,
  otherAssetType: 2,
  isloading: false,
  subdivisions: null,
  company_id: 5,
  subdivision_id: null, // estaba en 40 (no sé por qué)
  relatedAssetIds: []
}

export const newDriverObj = {
  194: null, //personal id
  195: null, //First Name
  196: null, //Last Name
  197: null, //kind of subdiv
  198: null, //mobile
  otherAssetsId: null,
  moduleId: 44,
  otherAssetType: 1,
  isloading: false,
  subdivisions: null,
  company_id: 5,
  subdivision_id: 40,
  relatedAssetIds: []
}

export const newChassisObj = {
    134: 1550, //vehicle type
    194: null, //personal id
    205: null, //description
    206: null, //serie | plate
    222: 1, //equipment type
    223: null, //client
    225: null, //equipment size
    inTransit: 0,
    otherAssetsId: null,
    moduleId: 44,
    otherAssetType: 3,
    isloading: false,
    subdivisions: null,
    company_id: 5,
    subdivision_id: null,
    relatedAssetIds: null,
}

export const newGensetObj = {
    134: 1537, //vehicle type
    194: null, //personal id
    205: null, //description
    206: null, //serie | plate
    227: null, //genset type
    222: 3, //equipment type
    223: null, //client
    inTransit: 0,
    otherAssetsId: null,
    moduleId: 44,
    otherAssetType: 3,
    isloading: false,
    subdivisions: null,
    company_id: 5,
    subdivision_id: null,
    relatedAssetIds: null,
}

const defaultRequirement = {
  tripId: null,
  equipmentClientContainer: 0,
  containerSizeId: null,
  equipmentClientChassis: 0,
  chassisSizeId: null,
  equipmentClientGenset: 0,
  genset: 0,
  containerlabel: 'Click here to add',
  chassislabel: 'Click here to add',
  triplabel: 'Click here to add',
  gensetlabel: 'Yes',
}

export const newEquipmentRequestObj = {
  requestDetails: {
      equipmentRequestId: null,
      clientId: null,
      workOrderId: null,
      requestTypeId: null,
      referenceNumberBooking: null,
      consignee: null,
      vesselCode: null,
      voyage: null,
      comments: null,
    },
  requirements: [defaultRequirement],
}