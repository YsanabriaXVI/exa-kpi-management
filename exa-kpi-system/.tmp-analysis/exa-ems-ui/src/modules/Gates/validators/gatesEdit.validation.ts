import * as yup from 'yup'
import type { GateChassisDraft, GateContainerDraft, GateGensetDraft } from '../types'

type ErrorsMap = Record<string, string>

function yupToErrorsMap(err: unknown): ErrorsMap {
  const out: ErrorsMap = {}
  const yerr = err as yup.ValidationError
  const inner = Array.isArray(yerr?.inner) && yerr.inner.length ? yerr.inner : [yerr]
  for (const e of inner) {
    if (!e) continue
    const path = (e as any).path as string | undefined
    const msg = (e as any).message as string | undefined
    if (!path || !msg) continue
    if (!out[path]) out[path] = msg
  }
  return out
}

const requiredWhenShown = <T extends yup.AnySchema>(schema: T, msg: string) =>
  schema.when('showEquipment', {
    is: true,
    then: schema.required(msg),
    otherwise: schema.optional(),
  })

const containerSchema: yup.ObjectSchema<GateContainerDraft> = yup
  .object({
    showEquipment: yup.boolean().required(),
    ownedEquipment: yup.boolean().required(),
    equipmentId: requiredWhenShown(yup.mixed().nullable(), 'Container is required'),
    sizeEquipmentId: requiredWhenShown(yup.number().nullable().typeError('Size is required'), 'Size is required'),
    clientId: requiredWhenShown(yup.number().nullable().typeError('Client is required'), 'Client is required'),
    remarks: yup.string().nullable().default(''),
  })
  .required()

const chassisSchema: yup.ObjectSchema<GateChassisDraft> = yup
  .object({
    showEquipment: yup.boolean().required(),
    ownedEquipment: yup.boolean().required(),
    equipmentId: requiredWhenShown(yup.mixed().nullable(), 'Chassis is required'),
    sizeEquipmentId: requiredWhenShown(yup.number().nullable().typeError('Size is required'), 'Size is required'),
    remarks: yup.string().nullable().default(''),
    inTransit: yup.boolean().required(),
    clientId: yup
      .number()
      .nullable()
      .when(['showEquipment', 'inTransit'], {
        is: (showEquipment: boolean, inTransit: boolean) => !!showEquipment && !inTransit,
        then: (s) => s.typeError('Client is required').required('Client is required'),
        otherwise: (s) => s.optional(),
      }),
    subdivisionId: yup
      .number()
      .nullable()
      .when(['showEquipment', 'inTransit'], {
        is: (showEquipment: boolean, inTransit: boolean) => !!showEquipment && !!inTransit,
        then: (s) => s.typeError('Subdivision is required').required('Subdivision is required'),
        otherwise: (s) => s.optional(),
      }),
  })
  .required()

const gensetSchema: yup.ObjectSchema<GateGensetDraft> = yup
  .object({
    showEquipment: yup.boolean().required(),
    ownedEquipment: yup.boolean().required(),
    equipmentId: requiredWhenShown(yup.mixed().nullable(), 'Genset is required'),
    gensetTypeId: requiredWhenShown(yup.number().nullable().typeError('Genset type is required'), 'Genset type is required'),
    sizeEquipmentId: yup.number().nullable().optional(),
    remarks: yup.string().nullable().default(''),
    fuelLevel: yup.string().nullable().default(''),
    engineHours: yup.string().nullable().default(''),
    inTransit: yup.boolean().required(),
    clientId: yup
      .number()
      .nullable()
      .when(['showEquipment', 'inTransit'], {
        is: (showEquipment: boolean, inTransit: boolean) => !!showEquipment && !inTransit,
        then: (s) => s.typeError('Client is required').required('Client is required'),
        otherwise: (s) => s.optional(),
      }),
    subdivisionId: yup
      .number()
      .nullable()
      .when(['showEquipment', 'inTransit'], {
        is: (showEquipment: boolean, inTransit: boolean) => !!showEquipment && !!inTransit,
        then: (s) => s.typeError('Subdivision is required').required('Subdivision is required'),
        otherwise: (s) => s.optional(),
      }),
  })
  .required()

export async function validateContainerSection(value: GateContainerDraft): Promise<ErrorsMap> {
  try {
    await containerSchema.validate(value, { abortEarly: false })
    return {}
  } catch (err) {
    return yupToErrorsMap(err)
  }
}

export async function validateChassisSection(value: GateChassisDraft): Promise<ErrorsMap> {
  try {
    await chassisSchema.validate(value, { abortEarly: false })
    return {}
  } catch (err) {
    return yupToErrorsMap(err)
  }
}

export async function validateGensetSection(value: GateGensetDraft): Promise<ErrorsMap> {
  try {
    await gensetSchema.validate(value, { abortEarly: false })
    return {}
  } catch (err) {
    return yupToErrorsMap(err)
  }
}
