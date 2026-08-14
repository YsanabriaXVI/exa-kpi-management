import * as Yup from "yup";


export const getNewContainerSchema = () => {
  const newContainerSchema = Yup.object({
  225: Yup.number().typeError("225 must be a number").required("Size/Type is required"),
  224: Yup.string().required("Tare is required"),
  223: Yup.number().typeError("223 must be a number").required("Client is required"),
  203: Yup.number().typeError("203 must be a number").required("Color is required"),
});

  return newContainerSchema;
}

export const getNewTruckSchema = () => {
  const newTruckSchema = Yup.object({
    194: Yup.string().required("Truck number is required"),
    203: Yup.number().typeError("Color is required").required("Color is required"),
  });

  return newTruckSchema;
}

export const getNewDriverSchema = () => {
  const newDriverSchema = Yup.object({
    195: Yup.string().required("First name is required"),
    196: Yup.string().required("Last name is required"),
    194: Yup.string().required("Driver's license is required"),
  });

  return newDriverSchema;
}

export const getNewChassisSchema = (inTransit: boolean) => {
    const base = {
      194: Yup.string().required("Equipment number is required"),
      225: Yup
        .number()
        .typeError("Field 225 must be a number")
        .required("Size/type is required"),
    } as const;
  
    return Yup.object({
      ...base,
      ...(inTransit
        ? {
            subdivision_id: Yup
              .number()
              .typeError("subdivision_id must be a number")
              .required("Subdivision is required"),
          }
        : {
            223: Yup
              .number()
              .typeError("Field 223 must be a number")
              .required("Client is required"),
          }),
    });
}

export const getNewGensetSchema = (inTransit: boolean) => {
  const base = {
    194: Yup.string().required("Genset number is required"),
    227: Yup
      .number()
      .typeError("Field 227 must be a number")
      .required("Type is required"),
  } as const;

  return Yup.object({
    ...base,
    ...(inTransit
      ? {
          subdivision_id: Yup
            .number()
            .typeError("subdivision_id must be a number")
            .required("Subdivision is required"),
        }
      : {
          223: Yup
            .number()
            .typeError("Field 223 must be a number")
            .required("Client is required"),
        }),
  });
};

export const partSectionSchema = Yup.object({
  // partSectionId: Yup.number().required(),
  // code: Yup.string().required(),

  instruction: Yup.string().required("Instruction is required"),
  remarks: Yup.string().required("Remarks is required"),
  conditionId: Yup.number()
    .typeError("Condition ID must be a number")
    .required("Condition ID is required"),
}).noUnknown(false); // allows extra keys (like Joi.unknown(true))

export const equipmentPartSchema = Yup.object({
  equipmentPartId: Yup.number()
    .typeError("Equipment Part ID must be a number")
    .required("Equipment Part ID is required"),
  partName: Yup.string().required("Part Name is required"),
  description: Yup.string().required("Description is required"),
  partSections: Yup.array()
    .of(partSectionSchema)
    .required("Part Sections is required")
    .min(1, "Part Sections must have at least 1 item"),
}).noUnknown(false);

export const checkListDataSchema = Yup.object({
  // checkListBuilderId: Yup.number().required(),

  equipmentParts: Yup.array()
    .of(equipmentPartSchema)
    .required("Equipment Parts is required")
    .min(1, "Checklist must have at least 1 item"),
}).noUnknown(false);

export const containerValidationSchema = Yup.object({
  equipmentId: Yup.number().typeError("Equipment ID must be a number").required("Equipment ID is required"),
  clientId: Yup.number().typeError("Client ID must be a number").required("Client ID is required"),
  sizeEquipmentId: Yup.number().typeError("Size Equipment ID must be a number").required("Size Equipment ID is required"),
  remarks: Yup.string().nullable(),
  checkListData: checkListDataSchema.required("Check List Data is required"),
  loaded: Yup.number().typeError("Loaded must be a number").required("Loaded is required"),
  haulage: Yup.number().typeError("Haulage must be a number").required("Haulage is required"),
}).noUnknown(false);

export const chassisValidationSchema = Yup.object({
  equipmentId: Yup.number().typeError("Equipment ID must be a number").required("Equipment ID is required"),
  sizeEquipmentId: Yup.number().typeError("Size Equipment ID must be a number").required("Size Equipment ID is required"),
  remarks: Yup.string().nullable(),
  //checkListData: checkListDataSchema.required("Check List Data is required"),
  tiresData: Yup.object().nullable(),
  clientId: Yup.number().nullable().when("inTransit", {
    is: 0,
    then: (s: any) => s.typeError("Client ID must be a number").required("Client ID is required"),
    otherwise: (s: any) => s.notRequired(),
  }),
  subdivision_id: Yup.number().nullable().when("inTransit", {
    is: 1,
    then: (s: any) => s.typeError("Subdivision ID must be a number").required("Subdivision ID is required"),
    otherwise: (s: any) => s.notRequired(),
  }),
  inTransit: Yup.number().typeError("In Transit must be a number").required("In Transit is required"),
  checkListData: checkListDataSchema
    .nullable()
    .transform(function (value: any) {
      // access sibling fields via this.parent
      if (this.parent?.inTransit === 1) return undefined; // <- skip validation entirely
      return value;
    })
    .when("inTransit", {
      is: 1,
      then: (s: any) => s.notRequired(),
      otherwise: (s: any) => s.required("Inspection checklist is required"),
    }),
}).noUnknown(false);

export const gensetValidationSchema = Yup.object({
  equipmentId: Yup.number()
    .typeError("Equipment ID must be a number")
    .required("Equipment ID is required"),

  inTransit: Yup.number()
    .typeError("In Transit must be a number")
    .required("In Transit is required"),

  clientId: Yup.number().nullable().when("inTransit", {
    is: 0,
    then: (s: any) =>
      s.typeError("Client ID must be a number").required("Client ID is required"),
    otherwise: (s: any) => s.notRequired(),
  }),

  subdivision_id: Yup.number().nullable().when("inTransit", {
    is: 1,
    then: (s: any) =>
      s.typeError("Subdivision ID must be a number").required("Subdivision ID is required"),
    otherwise: (s: any) => s.notRequired(),
  }),

  gensetTypeId: Yup.number()
    .typeError("Genset Type must be a number")
    .required("Genset Type is required"),

  remarks: Yup.string().nullable(),

  checkListData: checkListDataSchema
    .nullable()
    .transform(function (value: any) {
      // access sibling fields via this.parent
      if (this.parent?.inTransit === 1) return undefined; // <- skip validation entirely
      return value;
    })
    .when("inTransit", {
      is: 1,
      then: (s: any) => s.notRequired(),
      otherwise: (s: any) => s.required("Inspection checklist is required"),
    }),
}).noUnknown(false);


export const gateDamageDataSchema = Yup.object({
  damageId: Yup.number()
    .typeError("Damage Type must be a number")
    .required("Damage Type is required"),

  partName: Yup.string().required("Part Name is required"),

  partId: Yup.number()
    .typeError("Part ID must be a number")
    .required("Part ID is required"),

  // sectionId: Yup.number()
  //   .typeError("Section ID must be a number")
  //   .required("Section ID is required"),

  sectionName: Yup.string().required("Section Name is required"),

  remarks: Yup.string().required("Remarks is required"),
}).noUnknown(false); // like Joi.unknown(true)

export const gateValidationSchema = Yup.object({
  gateTypeId: Yup.number()
    .typeError("Gate Type must be a number")
    .required("Gate Type is required"),
  signatureDriver: Yup.string().required("Driver signature is required"),
  signatureInspector: Yup.string().required("Inspector signature is required"),
  truckId: Yup.number()
    .typeError("Truck ID must be a number")
    .required("Truck ID is required"),
  driverId: Yup.number()
    .typeError("Driver ID must be a number")
    .required("Driver ID is required"),
  depotId: Yup.number()
    .typeError("Depot ID must be a number")
    .required("Location is required"),
}).noUnknown(false); // like Joi.unknown(true)

export const getRequestSchema = (isTripRequest: boolean) => {
    const invalidChars = /[?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]/
    const requestDetails = Yup.object({
      requestTypeId: Yup
        .number()
        .typeError('Request type is required')
        .required('Request type is required'),
      clientId: Yup
        .number()
        .typeError('Client is required')
        .required('Client is required'),
      referenceNumberBooking: Yup
        .string()
        .required('Reference number is required')
        .test('no-invalid-chars', 'Contains invalid characters', (v: any) => !invalidChars.test(v ?? '')),
      workOrderId: Yup.number().nullable().transform((v: any, o: any) => (o === '' ? null : v)),
      consignee: Yup.string().nullable(),
      vesselCode: Yup.string().nullable(),
      voyage: Yup.string().nullable(),
      comments: Yup.string().nullable(),
    })

    const requirementSchema = Yup.object({
      tripId: isTripRequest ? Yup.number().typeError('Trip is required').required('Trip is required') : Yup.number().nullable(),
    })

    return Yup.object({
      requestDetails,
      requirements: Yup.array().of(requirementSchema),
    })
}
