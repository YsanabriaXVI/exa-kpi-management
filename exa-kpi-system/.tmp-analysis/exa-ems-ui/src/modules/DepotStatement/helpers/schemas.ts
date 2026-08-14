import * as yup from 'yup';

export interface Filters {
  clientId?: number;
  exchangeRate?: string | number;
  statementType?: number;
  upToDate?: number | boolean | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  depots?: number[];
  weeks?: number[];
  services?: number[];
  equipmentTypes?: string[];
  all_depots?: number | boolean | null;
  all_services?: number | boolean | null;
  all_equipment_types?: number | boolean | null;
  all_weeks?: number | boolean | null;
}

export const storageSearchSchema: yup.ObjectSchema<Filters> = yup.object({
  clientId: yup
    .number()
    .typeError('Client is required')
    .required('Client is required'),

  exchangeRate: yup
    .mixed<string | number>()
    .transform((_: any, originalValue: string) => {
      if (originalValue === '' || originalValue == null) return undefined;
      return Number(originalValue);
    })
    .test(
      'is-number',
      'Exchange rate is required',
      (value: any) => value !== undefined && value !== null && value !== 0 && !Number.isNaN(Number(value))
    )
    .required('Exchange rate is required'),

  statementType: yup
    .number()
    .typeError('Statement type is required')
    .required('Statement type is required'),

  upToDate: yup.mixed<number | boolean | null>().nullable(),

  startDate: yup
    .mixed<string | Date | null>()
    .nullable()
    .when('upToDate', {
      is: (val: number | boolean | null | undefined) => val === 0 || val === false,
      then: (schema: any) => schema.required('Start date is required'),
    }),

  endDate: yup
    .mixed<string | Date | null>()
    .nullable()
    .when('upToDate', {
      is: (val: number | boolean | null | undefined) => val === 0 || val === false,
      then: (schema: any) => schema.required('End date is required'),
    }),

  depots: yup
    .array(yup.number().required())
    .min(1, 'At least one depot is required')
    .optional(),

  weeks: yup
    .array(yup.number().required())
    .min(1, 'At least one week is required')
    .optional(),

  services: yup
    .array(yup.number().required())
    .min(1, 'At least one service is required')
    .optional(),

  equipmentTypes: yup
    .array(yup.string().required())
    .min(1, 'At least one equipment type is required')
    .optional(),

  all_depots: yup.mixed<number | boolean | null>().nullable().optional(),
  all_services: yup.mixed<number | boolean | null>().nullable().optional(),
  all_equipment_types: yup.mixed<number | boolean | null>().nullable().optional(),
  all_weeks: yup.mixed<number | boolean | null>().nullable().optional(),
});


export const rentalSearchSchema: yup.ObjectSchema<Filters> = yup.object({
  clientId: yup
    .number()
    .typeError('Client is required')
    .required('Client is required'),

  exchangeRate: yup
    .number()
    .transform((value: any, originalValue: string) => {
      if (originalValue === '' || originalValue == null || value === 0) return undefined;
      return Number(originalValue);
    })
    .typeError('Exchange rate is required')
    .required('Exchange rate is required'),

  statementType: yup
    .number()
    .typeError('Statement type is required')
    .required('Statement type is required'),

  upToDate: yup.mixed<number | boolean | null>().nullable().optional(),

  startDate: yup.mixed<string | Date | null>().nullable().optional(),

  endDate: yup
    .mixed<string | Date | null>()
    .nullable()
    .when('upToDate', {
      is: (val: number | boolean | null | undefined) => val === 0 || val === false,
      then: (schema: any) => schema.required('End date is required'),
      otherwise: (schema: any) => schema.optional(),
    }),

  depots: yup
    .array()
    .of(yup.number().required())
    .min(1, 'At least one depot is required')
    .required('Depots is required'),

  weeks: yup
    .array()
    .of(yup.number().required())
    .min(1, 'At least one week is required')
    .required('Weeks is required'),

  services: yup.array().of(yup.number().required()).optional(),

  equipmentTypes: yup.array().of(yup.string().required()).optional(),

  all_depots: yup.mixed<number | boolean | null>().nullable().optional(),
  all_services: yup.mixed<number | boolean | null>().nullable().optional(),
  all_equipment_types: yup.mixed<number | boolean | null>().nullable().optional(),
  all_weeks: yup.mixed<number | boolean | null>().nullable().optional(),
});