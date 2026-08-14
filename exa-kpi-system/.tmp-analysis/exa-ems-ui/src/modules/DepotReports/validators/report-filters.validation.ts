import * as Yup from "yup";

export const getStorageSearchSchema = () => {
  const newStorageSearchSchema = Yup.object({
    reportType: Yup.number().typeError("Report Type must be a number").required("Report Type is required"),
    equipmentTypeId: Yup.number().typeError("Equipment Type must be a number").required("Equipment type is required"),
  });

  return newStorageSearchSchema;
}

export const getRentalSearchSchema = () => {
  const newRentalSearchSchema = Yup.object({
    reportType: Yup.number().typeError("Report Type must be a number").required("Report Type is required"),
    equipmentTypeIds: Yup.array().required("Equipment type is required"),
  });

  return newRentalSearchSchema;
}

export const getInventorySearchSchema = () => {
  const newInventorySearchSchema = Yup.object({
    reportType: Yup.number().typeError("Report Type must be a number").required("Report Type is required"),
    equipmentTypeId: Yup.number().typeError("Equipment Type must be a number").required("Equipment type is required"),
  });

  return newInventorySearchSchema;
}

const hasValue = (value: any) =>
  value !== null &&
  value !== undefined &&
  value !== "" &&
  value !== "null" &&
  value !== "undefined";

const toDateMs = (value: string | Date | null | undefined) => {
  if (!hasValue(value)) return null;

  if (value instanceof Date) {
    return value.getTime();
  }

  const numericValue = Number(value);

  if (!Number.isNaN(numericValue)) {
    // Supports Unix seconds or milliseconds
    return numericValue < 100000000000
      ? numericValue * 1000
      : numericValue;
  }

  return new Date(`${value}T00:00:00`).getTime();
};

export const getActivitySearchSchema = () => {
  return Yup.object({
    reportType: Yup.number()
      .typeError("Report Type must be a number")
      .required("Report Type is required"),
    
    sortBy: Yup.string().required("Sorting is required"),

    startDate: Yup.mixed<string | Date | null>()
      .nullable()
      .test(
        "start-required-if-end",
        "Start date is required",
        function (value) {
          const { endDate } = this.parent;

          return !hasValue(endDate) || hasValue(value);
        }
      )
      .test(
        "start-less-than-or-equal-end",
        "Start date must be less than or equal to End date",
        function (value) {
          const { endDate } = this.parent;

          const startDate = toDateMs(value);
          const endDateValue = toDateMs(endDate);

          if (startDate === null || endDateValue === null) {
            return true;
          }

          return startDate <= endDateValue;
        }
      ),

    endDate: Yup.mixed<string | Date | null>()
      .nullable()
      .test(
        "end-required-if-start",
        "End date is required",
        function (value) {
          const { startDate } = this.parent;

          return !hasValue(startDate) || hasValue(value);
        }
      )
      .test(
        "end-greater-than-or-equal-start",
        "End date must be greater than or equal to Start date",
        function (value) {
          const { startDate } = this.parent;

          const startDateValue = toDateMs(startDate);
          const endDate = toDateMs(value);

          if (startDateValue === null || endDate === null) {
            return true;
          }

          return endDate >= startDateValue;
        }
      ),
  });
};