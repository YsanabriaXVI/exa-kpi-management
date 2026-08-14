import React, { useEffect, useMemo, useState, useCallback, use } from 'react';
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import * as yup from "yup";

import {
  CContainer,
  CCard,
  CCardBody,
  CCardFooter,
  CButton,
  CFormTextarea,
  CAvatar,
  CRow,
  CCol,
  CSpinner,
  CCardHeader
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import {
  cilSave,
  cilArrowThickFromRight,
  cilPencil,
  cilCloudDownload,
  cilFile
} from '@coreui/icons'

import { RenderOptions } from "../../../helpers/RenderOptionsHelper";
import { set, type AppDispatch } from '../../../store'
import PageHero from '../../../components/PageHero'

import RentalInvoicesTable from '../components/RentalInvoicesTable'
import DetailsBox from '../components/DetailsBox'
import PaymentInfoBox from '../components/PaymentInfoBox'
import StorageInvoicesTable from '../components/StorageInvoicesTable';
import SuccesModalWithActions from 'src/components/SuccesModalWithActions'
import InfoModal from 'src/components/InfoMessageModal'
import ErrorModal from 'src/components/ErrorMessageModal'
import BuilderFiltersForm from '../components/BuilderForm'

import { storageSearchSchema, rentalSearchSchema } from '../helpers/schemas'
import { rentalStatementAPI } from '../api/rentalStatement.api'
import { storageStatementAPI } from '../api/storageStatement.api'
import { StorageInvoiceDepotGroup } from '../types/storageStatement.types'

import {
  loadStorageInvoiceLines,
  addStorageStatement,
  loadStorageStatement,
  clearCurrentStorageStatement,
  clearStorageStatementErrors
} from '../store/storageStatement.slice'

import {
  loadInvoiceLines as loadRentalInvoiceLines,
  addDepotStatement,
  loadRentalDepotStatement,
  clearCurrent as clearCurrentRentalStatement,
  clearRentalStatementErrors
} from '../store/rentalStatement.slice'

import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { fetchDepots, selectDepotsList } from '../../Depots/store/depots.slice'
import { loadWeeks } from '../../Weeks/store/weeksSlice'
import {
  loadEquipmentTypes,
  selectEquipmentTypesList,
} from '../../EquipmentSize/store/equipmentSize.slice'
import { loadLookups } from '../store/global.slice'

type RentalLine = {
  total: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

const DepotStatementFormPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { id, type } = useParams<any>();
  const params = useParams<any>();
  console.log('params', params);

  const isNew = !id || id === 'new'
  console.log('isNew', isNew);
  const isEdit = !isNew
  console.log('isEdit', isEdit);

  const defaultFilters = {
    clientId: null,
    exchangeRate: 0,
    statementType: null,
    upToDate: true,
    startDate: null,
    endDate: null,
    depots: [] as string[],
    weeks: [] as string[],
    services: [] as string[],
    equipmentTypes: [] as string[],
    all_depots: 0,
    all_services: 0,
    all_equipment_types: 0,
    all_weeks: 0
  }

  const numericFields = new Set([
    'statementType',
    'clientId',
  ])

  const [current, setCurrent] = useState<any>(null)
  const [invoiceLines, setInvoiceLines] = useState<any[]>([])
  //const [invoiceLinesForRental, setInvoiceLinesForRental] = useState<any[]>([])
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [savedData, setSavedData] = useState<any>(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [searchErrors, setSearchErrors] = useState<any>({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  console.log('searchErrors', searchErrors);

  const storageinvoiceLines = useSelector((s: any) => s.storageDepotStatement?.invoiceLines ?? [])
  const rentalInvoiceLines = useSelector((s: any) => s.rentalDepotStatement?.invoiceLines ?? [])
  const rentalError = useSelector((s: any) => s.rentalDepotStatement?.errors ?? false);
  console.log('rentalError', rentalError);
  const storageError = useSelector((s: any) => s.storageDepotStatement?.errors ?? false);
  console.log('storageError', storageError);

  const clients = useSelector((s: any) => s.clients?.list ?? [])
  const depots = useSelector(selectDepotsList) ?? []
  const weeks = useSelector((s: any) => s.weeks?.weeks ?? [])
  const equipmentTypes = useSelector(selectEquipmentTypesList) ?? []
  const jobTypes = useSelector((s: any) => s.depotStatement?.lookups?.jobTypesList ?? [])
  const statementTypes = useSelector((s: any) => s.depotStatement?.lookups?.statementTypesList ?? [])
  const currentStorageStatement = useSelector((s: any) => s.storageDepotStatement?.depotStatement)
  const currentRentalStatement = useSelector((s: any) => s.rentalDepotStatement?.current)
  const isSaving1 = useSelector((s: any) => s.storageDepotStatement?.isSaving);
  const isSaving2 = useSelector((s: any) => s.rentalDepotStatement?.isSaving);
  const isLoading1 = useSelector((s: any) => s.storageDepotStatement?.isLoading);
  const isLoading2 = useSelector((s: any) => s.rentalDepotStatement?.isLoading);

  console.log('LOCAL STATE invoiceLines: ', invoiceLines);
  console.log('FROM REDUX rentalInvoiceLines: ', rentalInvoiceLines);


  const statementType = useMemo(() => {
    return statementTypes.find(
      (st: any) => st.attributeItemId === filters.statementType)
      ?.flat_name_id;
  }, [statementTypes, filters.statementType])

  const loadData = useCallback(() => {
    dispatch(loadClients())
    dispatch(fetchDepots())
    dispatch(loadWeeks())
    dispatch(loadEquipmentTypes())
    dispatch(loadLookups())
  }, [dispatch])

  const normalizeMulti = (selected: any): number[] => {
    if (!Array.isArray(selected)) return []

    if (selected.length > 0 && typeof selected[0] === 'object') {
      return (selected as any[]).map((x) => x.value)
    }

    return selected as number[]
  }

  const yupToErrorMap = (err: yup.ValidationError): Record<string, string> => {
    const errors: Record<string, string> = {};
    for (const e of err.inner) {
      if (e.path && !errors[e.path]) errors[e.path] = e.message;
    }
    if (err.path && !errors[err.path]) errors[err.path] = err.message;
    return errors;
  };

  const getOptions = useCallback((list: any[], id: string, label: string, placeholder = "") => {
    const options = RenderOptions(list, id, label) ?? [];
    return [{ label: placeholder, value: "" }, ...options];
  }, []);

  const handleChangeInput = (e: any) => {
    //console.log('handleChange: ', e);
    const { name } = e.target

    const isCheckbox = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'
    const raw = isCheckbox ? (e.target.checked ? 1 : 0) : e.target.value
    const value =
      isCheckbox ? raw : numericFields.has(name) ? (raw === '' ? null : Number(raw)) : String(raw ?? '')
    const next = { ...filters } as any
    next[name] = value
    setFilters(next)
    if (name !== 'comments') setInvoiceLines([]);
  }

  const handleChange = (eventArray: any[], field: string) => {
    console.log('new handleChange: ', eventArray, field);
    const event = eventArray[0]
    const { value } = event;
    const safeValue = value === '' ? null : value;

    const next = { ...filters } as any
    next[field] = safeValue;
    setFilters(next)
    if (field !== 'comments') setInvoiceLines([]); 
  }

  const handleChangeMulti = (
    field: 'weeks' | 'depots' | 'services' | 'equipmentTypes',
    values: (string | number)[]
  ) => {
    setFilters((prev: any) => ({
      ...prev,
      [field]: values ?? [],
    }));
  };

  const isValid = () => {
    if (!filters.clientId) return false

    if (!filters.upToDate) {
      if (statementType === 'storage' && (!filters.startDate || !filters.endDate)) return false
      if (statementType === 'rental' && !filters.endDate) return false
    }
    return true
  }

  const validateSearchParams = async (data: any): Promise<boolean> => {
    let schemaErrors: Record<string, string> | null = null;

    try {
      let schema = null;

      if (statementType === 'storage') {
        schema = storageSearchSchema;
      } else if (statementType === 'rental') {
        schema = rentalSearchSchema;
      }

      await schema.validate(data, { abortEarly: false });

    } catch (e) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
    }

    if (schemaErrors) {
      setSearchErrors({
        ...(schemaErrors ?? {}),
      });
      return false;
    }

    setSearchErrors(false);
    return true;
  };

  const handleContinue = async () => {
    if (filters.statementType === null) {
      setSearchErrors({ statementType: 'Statement type is required' })
    }

    if (statementType === "storage") {
      const isValid = await validateSearchParams(filters);
      if (!isValid) return;
      await dispatch(loadStorageInvoiceLines({
        ...filters,
        client: filters.clientId
      }))
    }

    if (statementType === "rental") {
      const isValid = await validateSearchParams(filters);
      if (!isValid) return;
      console.log('filters', filters);
      await dispatch(loadRentalInvoiceLines({
        ...filters,
        client: filters.clientId
      }))
    }
  }

  const handleGenerate = async () => {
    if (statementType === "storage") {
      const searchParams = {
        ...filters,
        client: filters.clientId,
      }

      const result = await dispatch(addStorageStatement({ data: invoiceLines, searchParams: searchParams }))
      console.log('save storage result', result);

      if (addStorageStatement.fulfilled.match(result)) {
        setSavedData(result.payload.depotStatement);
        setShowSuccessModal(true)
        setSuccessMessage('Storage depot statement saved successfully.');
      }
    }

    if (statementType === "rental") {
      const searchParams = {
        ...filters,
        client: filters.clientId,
      }

      const result = await dispatch(addDepotStatement({ data: invoiceLines, searchParams }))
      console.log('save rental result', result);
      if (addDepotStatement.fulfilled.match(result)) {
        setSavedData(result.payload.depotStatement);
        setShowSuccessModal(true)
        setSuccessMessage('Storage depot statement saved successfully.');
      }
    }
  }

  const handlePickDate = (e: any) => {
    const { name, value } = e.target
    console.log('handlePickDate: ', name, value);

    const unixSeconds = value !== ''
      ? Math.floor(new Date(`${value}T00:00:00`).getTime() / 1000)
      : null;

    setFilters((prev: any) => (
      {
        ...prev,
        [name]: String(unixSeconds),
        [`${name}Label`]: value
      }))
  }

  const handleExportRentalPDF = async () => {
    const exportId = current?.depotStatementId;
    if (!exportId) return;
    try {
      setPdfLoading(true);
      const resp = await rentalStatementAPI.downloadRentalStatementPDF(exportId);
      if (resp?.status === 200) {
        setPdfLoading(false);
      } 
    } catch (error) {
      setPdfLoading(false);
      console.error("Failed to export PDF", error);
    }
  };

  const handleExportRentalXLSX = async () => {
    const exportId = current?.depotStatementId;
    if (!exportId) return;
    try {
      setXlsxLoading(true);
      const resp =await rentalStatementAPI.downloadRentalStatementXLSX(exportId);
      if (resp?.status === 200) {
        setXlsxLoading(false);
      }
    } catch (error) {
      setXlsxLoading(false);
      console.error("Failed to export XLSX", error);
    }
  };

  const handleExportStorageXLSX = async () => {
    const exportId = current?.depotStatementId;
    if (!exportId) return;
    try {
      setXlsxLoading(true);
      const resp = await storageStatementAPI.downloadStorageStatementXLSX(exportId);
      if (resp?.status === 200) {
        setXlsxLoading(false);
      }
    } catch (error) {
      setXlsxLoading(false);
      console.error("Failed to export XLSX", error);
    }
  };

  const handleExportStoragePDF = async () => {
    const exportId = current?.depotStatementId;
    if (!exportId) return;
    try {
      setPdfLoading(true);
      const resp = await storageStatementAPI.downloadStorageStatementPDF(exportId);
      if (resp?.status === 200) {
            setPdfLoading(false);
      }
    } catch (error) {
      setPdfLoading(false);
      console.error("Failed to export PDF", error);
    }
  };

  const handleExport = async (
    exportType: 'PDF' | 'XLSX',
    statementType: 'storage' | 'rental') => {

    console.log('handleExport', exportType, statementType);

    if (statementType === 'storage' && exportType === 'PDF') {
      await handleExportStoragePDF();
    }

    if (statementType === 'rental' && exportType === 'PDF') {
      await handleExportRentalPDF();
    }

    if (statementType === 'rental' && exportType === 'XLSX') {
      await handleExportRentalXLSX();
    }

    if (statementType === 'storage' && exportType === 'XLSX') {
      await handleExportStorageXLSX();
    }
  }

//#region storage summary
const storageSummary = useMemo(() => {
  const data = (invoiceLines as StorageInvoiceDepotGroup[]).flatMap(
    (depotGroup) => depotGroup.invoiceLines ?? []
  )

  const subtotalValue = data.reduce(
    (acc, invoiceLine) => acc + Number(invoiceLine.subtotal || 0),
    0
  )

  const taxesValue = data.reduce(
    (acc, invoiceLine) => acc + Number(invoiceLine.taxes || 0),
    0
  )

  const totalUSDValue = subtotalValue + taxesValue;

  const exchangeRate = isEdit ? current?.exchangeRate : Number(filters.exchangeRate || 0)
  const totalLpsValue = Math.round(totalUSDValue * 100) / 100 * exchangeRate;

  return {
    subtotal: subtotalValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    taxes: taxesValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    totalUSD: totalUSDValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    totalLPS: totalLpsValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  }
}, [invoiceLines, filters.exchangeRate])


const rentalSummary = useMemo(() => {
  console.log('rentalSummary data: ', invoiceLines);

  const data = (invoiceLines as RentalLine[][]).flat()

      console.log('rental data --> ', data);

      const exchangeRate = isEdit ? current?.exchangeRate : Number(filters.exchangeRate || 0)

      const subtotalDollarsValue = data.reduce(
        (acc, invoiceLine) => acc + invoiceLine.subtotal,
        0
      )

      const totalDollarsValue = data.reduce(
        (acc, invoiceLine) => acc + invoiceLine.total,
        0
      )

      const taxesDollarsValue = data.reduce(
        (acc, invoiceLine) => acc + invoiceLine.taxes,
        0
      )

      const totalLpsValue = Math.round(totalDollarsValue * 100) / 100 * exchangeRate;
      

      return {
        subtotal: subtotalDollarsValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        taxes: taxesDollarsValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalUSD: totalDollarsValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
        totalLPS: totalLpsValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }

}, [invoiceLines, filters.exchangeRate])


const handleDeleteStorageItems = useCallback(
  (depotName: string, selectedIds: Array<string | number>) => {
    const idsToDelete = new Set(selectedIds.map(String))

    setInvoiceLines((prev: StorageInvoiceDepotGroup[]) => {
      return prev
        .map((depot) => {
          if (depot.depotName !== depotName) {
            return depot
          }

          return {
            ...depot,
            invoiceLines: depot.invoiceLines.filter(
              (line: any) => !idsToDelete.has(String(line.id))
            ),
          }
        })
        .filter((depot) => depot.invoiceLines.length > 0)
    })
  },
  []
)


const handleDeleteRentalItems = useCallback(
  (tableKey: string, selectedIds: Array<string | number>) => {
    const idsToDelete = new Set(selectedIds.map(String))

    if (idsToDelete.size === 0) return

    setInvoiceLines((prev: RentalLine[][]) => {
      return prev.map((tableRows, tableIndex) => {
        if (!tableRows?.length) return tableRows

        const currentTableKey = `${tableRows[0].depotId}-${tableIndex}`

        if (currentTableKey !== tableKey) {
          return tableRows
        }

        return tableRows.filter((row) => !idsToDelete.has(String(row.id)))
      })
    })
  },
  []
)

   type Period = "Day" | "Week" | "Month";
  const recalculateBillingRange = (startDate: string, period: Period, duration: number): string[] => {
    const periodDays: Record<Period, number> = {
      Week: 7 * duration,
      Month: 30 * duration,
      Day: 1 * duration,
    };

    const days = periodDays[period];

    const [year, month, day] = startDate.split("-").map(Number);

    if (!year || !month || !day) {
      throw new Error("Invalid startDate format. Expected YYYY-MM-DD");
    }

    const dates: string[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(Date.UTC(year, month - 1, day + i));

      const formattedDate = date.toISOString().split("T")[0];

      dates.push(formattedDate);
    }

    return dates;
  };

  const handleChangeClosing = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string,
    tableIndex: number,
    rowIndex: number
  ) => {
    const value = parseInt(e.target.value, 10);
    console.log("prorated", value);

    const newInvoiceLines = invoiceLines.map((table, tIndex) => {
      return table.map((invoice: any, rIndex: number) => {
        if (tIndex === tableIndex && rIndex === rowIndex) {
          const updatedInvoice = { ...invoice };

          if (value === 1) {
            updatedInvoice.prorated = 1;
            updatedInvoice.proratedLabel = "Prorated";
            updatedInvoice.proratedOptionId = 1;
            updatedInvoice.subtotal =
              Math.round(updatedInvoice.comboPrice * updatedInvoice.duration * 100) / 100;
            const lineTotal = updatedInvoice.subtotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            updatedInvoice.lineTotal = `$ ${lineTotal}`;
            updatedInvoice.taxes = updatedInvoice.subtotal * Number(updatedInvoice.taxRate);
            updatedInvoice.total = updatedInvoice.subtotal + updatedInvoice.taxes;
            const periodSuffix = updatedInvoice.duration > 1 ? "s" : "";
            updatedInvoice.durationLabel = `${updatedInvoice.duration} ${updatedInvoice.periodLabel}${periodSuffix}`

            updatedInvoice.billingRange = rentalInvoiceLines[tableIndex][rowIndex].billingRange;
            updatedInvoice.startDate = rentalInvoiceLines[tableIndex][rowIndex].startDate;
            updatedInvoice.endDate = rentalInvoiceLines[tableIndex][rowIndex].endDate;
            
          } else if (value === 2) {
            updatedInvoice.prorated = 0;
            updatedInvoice.proratedLabel = "Not Prorated";
            updatedInvoice.proratedOptionId = 2;
            const durationForCalculus = Math.ceil(updatedInvoice.duration);
            updatedInvoice.subtotal = Math.round(
              updatedInvoice.comboPrice *
                durationForCalculus *
                100
            ) / 100;
            const lineTotal = updatedInvoice.subtotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            updatedInvoice.lineTotal = `$ ${lineTotal}`;
            const periodSuffix = durationForCalculus > 1 ? "s" : "";
            updatedInvoice.durationLabel = `${durationForCalculus} ${updatedInvoice.periodLabel}${periodSuffix}`,
            updatedInvoice.taxes = updatedInvoice.subtotal * Number(updatedInvoice.taxRate);
            updatedInvoice.total = updatedInvoice.subtotal + updatedInvoice.taxes;
            const recalculatedRange = recalculateBillingRange(updatedInvoice.startDate, updatedInvoice.periodLabel, durationForCalculus);
            updatedInvoice.billingRange = `${recalculatedRange[0]} to ${recalculatedRange[recalculatedRange.length - 1]}`;
            updatedInvoice.startDate = recalculatedRange[0];
            updatedInvoice.endDate = recalculatedRange[recalculatedRange.length - 1];
          }

          return updatedInvoice;
        }

        return invoice;
      });
    });

    setInvoiceLines(newInvoiceLines);
    //calculateTotals(newInvoiceLines, statementType, filters.exchangeRate);
  };

  const toggleErrorModal = (show: boolean) => {
    setShowErrorModal(show);

    if (!show) {
      dispatch(clearRentalStatementErrors());
      dispatch(clearStorageStatementErrors());
    }
  };

  const depotOptions = useMemo(
    () => RenderOptions(depots ?? [], "depotId", "depotName"),
    [depots, getOptions]
  );

  const weekOptions = useMemo(
    () =>
      weeks.filter((w: any) => Number(w.week_year) >= 2026)
        .map((w: any) => ({
          label: `${w.week_year} - W ${w.week_no}`,
          value: w.week_id,
        })),
    [weeks],
  )

  console.log('weekOptions', weeks);

  const servicesOptions = useMemo(
    () =>
      (RenderOptions(jobTypes ?? [], "attributeItemId", "name") ?? []).filter(
        (x: any) => x.label === "Gate In" || x.label === "Gate Out" || x.label === "Storage Days",
      ),
    [jobTypes],
  );

  const statementTypeOptions = useMemo(
    () => getOptions(statementTypes ?? [], "attributeItemId", "name", "Select Statement Type..."),
    [statementTypes, getOptions]
  );

  const equipmentTypeOptions = useMemo(
    () =>
      equipmentTypes.map((t: any) => ({
        label: t.equipmentName ?? t.name ?? t.description ?? 'Unnamed',
        value: String(t.equipmentTypeId ?? t.id),
      })),
    [equipmentTypes],
  )

  const clientOptions = useMemo(
    () => getOptions(clients ?? [], "client_id", "name", "Select Client..."),
    [clients, getOptions]
  );

  useEffect(() => {
    return () => {
      dispatch(clearCurrentStorageStatement())
      dispatch(clearCurrentRentalStatement())
    }
  }, [dispatch])

  useEffect(() => {
    return () => {
      dispatch(clearStorageStatementErrors())
      dispatch(clearRentalStatementErrors())
    }
  }, [dispatch])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (rentalError) {
      setShowErrorModal(true);
      setErrorMessage(rentalError);
    }

    if (storageError) {
      setShowErrorModal(true);
      setErrorMessage(storageError);
    }
  }, [rentalError, storageError]);

  useEffect(() => {
    if (isNew || !id) return

    setInvoiceLines([]);
    setFilters(defaultFilters);
    setCurrent(null);

    if (type === 'storage') {
      dispatch(loadStorageStatement(Number(id)))
    }

    if (type === 'rental') {
      dispatch(loadRentalDepotStatement(Number(id)))
    }

  }, [dispatch, isEdit, type, id])

  useEffect(() => {
    if (isEdit && currentStorageStatement?.depotStatementId != null) {
      setCurrent(currentStorageStatement)
      setInvoiceLines(currentStorageStatement?.invoiceLines)
    }

    if (isEdit && currentRentalStatement?.depotStatementId != null) {
      setCurrent(currentRentalStatement);
      setInvoiceLines(currentRentalStatement?.invoiceLines);
    }

    if (!isEdit && statementType === 'storage' && storageinvoiceLines.length > 0) {
      setInvoiceLines(storageinvoiceLines)
    } else if (!isEdit && statementType === 'storage' && storageinvoiceLines.length === 0) {
      setShowInfoModal(true)
      setInvoiceLines([])
      setInfoMessage('No results found for the selected filters.');
    }

    if (!isEdit && statementType === 'rental' && rentalInvoiceLines.length > 0) {
      setInvoiceLines(rentalInvoiceLines)
    } else if (!isEdit && statementType === 'rental' && rentalInvoiceLines.length === 0) {
      setShowInfoModal(true)
      setInvoiceLines([])
      setInfoMessage('No results found for the selected filters.');
    }

  }, [
    storageinvoiceLines,
    rentalInvoiceLines,
    currentStorageStatement,
    currentRentalStatement,
    isEdit,
  ])

  useEffect(() => {
    if (filters.all_depots === 1) {
      setFilters({
        ...filters,
        depots: depotOptions
          .filter((x: any) => x.value !== "")
          .map((x: any) => x.value)
      })
    } else if (filters.all_depots === 0) {
      setFilters({
        ...filters,
        depots: []
      })
    }
  }, [filters.all_depots])

  useEffect(() => {
    if (filters.all_weeks === 1) {
      setFilters({
        ...filters,
        weeks: weekOptions.map((x: any) => x.value)
      })
    } else if (filters.all_weeks === 0) {
      setFilters({
        ...filters,
        weeks: []
      })
    }
  }, [filters.all_weeks])

  useEffect(() => {
    if (filters.all_services === 1) {
      setFilters({
        ...filters,
        services: servicesOptions.map((x: any) => x.value)
      })
    } else if (filters.all_services === 0) {
      setFilters({
        ...filters,
        services: []
      })
    }
  }, [filters.all_services])

  useEffect(() => {
    if (filters.all_equipment_types === 1) {
      setFilters({
        ...filters,
        equipmentTypes: equipmentTypeOptions
          .filter((x: any) => x.value !== "")
          .map((x: any) => x.value)
      })
    } else if (filters.all_equipment_types === 0) {
      setFilters({
        ...filters,
        equipmentTypes: []
      })
    }
  }, [filters.all_equipment_types])

  console.log("filters", filters)
  console.log("clients", clients)

  const showRentalTable =
    ((isEdit && type === "rental" && invoiceLines.length > 0) ||
      (!isEdit && statementType === "rental" && invoiceLines.length > 0));

  const showStorageTable =
    ((isEdit && type === "storage" && invoiceLines.length > 0) ||
      (!isEdit && statementType === "storage" && invoiceLines.length > 0));

  const showAddComment = invoiceLines.length > 0 && !isEdit;

  return (
    <CContainer fluid>
      <PageHero kicker="Depot" title={isNew ? 'New Depot Statement!' : 'Edit Depot Statement'} />

      <CCard className="shadow-sm">
        {isEdit && current?.depotStatementId && (
          <CCardHeader style={{ display: "flex", justifyContent: "flex-end" }}>
            <CButton color="danger" onClick={() => handleExport("PDF", type as any)} className="me-2 text-white">
              {!pdfLoading && <><CIcon icon={cilCloudDownload} className="me-2" />Export PDF</>}
              { pdfLoading && <><CSpinner size="sm" className="me-2" />Downloading...</>}
            </CButton>
            <CButton color="success" onClick={() => handleExport("XLSX", type as any)} className="me-2 text-white">
               {!xlsxLoading && <><CIcon icon={cilCloudDownload} className="me-2" />Export XLSX</>}
              { xlsxLoading && <><CSpinner size="sm" className="me-2" />Downloading...</>}
            </CButton>
          </CCardHeader>
        )}
        <CCardBody>
          {isEdit &&
            <CRow>
              <CCol xs={12} md={6}>
                {
                  current?.depotStatementId ? (
                    <DetailsBox
                      statementTypeOptions={statementTypeOptions as any}
                      clientOptions={clientOptions as any}
                      weekOptions={weekOptions as any}
                      data={current}
                    />
                  ) : (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Loading Statement...
                    </>
                  )
                }
              </CCol>

              <CCol xs={12} md={6}>
                {
                  current?.depotStatementId ? (
                    <PaymentInfoBox />
                  ) : (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Loading Payment...
                    </>
                  )
                }
              </CCol>
            </CRow>
          }
          <br />

          {!isEdit &&
            <BuilderFiltersForm
              filters={filters}
              onCancel={() => navigate('/depot-main/depot-statement')}
              onChange={handleChange}
              onChangeInput={handleChangeInput}
              onChangeMulti={handleChangeMulti}
              normalizeMulti={normalizeMulti}
              onPickDate={handlePickDate}
              clients={clientOptions}
              statementType={statementType}
              depotOptions={depotOptions}
              statementTypeOptions={statementTypeOptions}
              weekOptions={weekOptions}
              servicesOptions={servicesOptions}
              equipmentTypeOptions={equipmentTypeOptions}
              isValid={isValid}
              handleContinue={handleContinue}
              handleGenerate={handleGenerate}
              invoiceLines={invoiceLines}
              errors={searchErrors}
              isLoadingStorage={isLoading1}
              isLoadingRental={isLoading2}
            />}

          {showRentalTable &&
            <>
              <RentalInvoicesTable
                data={invoiceLines || []}
                exchangeRate={isEdit ? current?.exchangeRate : filters?.exchangeRate || 0}
                handleChange={handleChangeClosing}
                onDeleteItems={handleDeleteRentalItems as any}
                swal={() => null}
                isEdit={isEdit}
              />
              <CCol>
                  <div className="card-footer summary">
                    <p>
                    <b>Subtotal: </b> $ {rentalSummary.subtotal}
                    </p>
                    <p>
                      <b>Taxes: </b> $ {rentalSummary.taxes}
                    </p>
                    <p>
                      <b>Total in USD: </b> <strong className="summary-total"> $ {rentalSummary.totalUSD}</strong>
                    </p>
                    <p>
                      <b>Total in LPS: </b> <strong className="summary-total-lps">L. {rentalSummary.totalLPS}</strong>
                    </p>
                  </div>
                </CCol>
            </>
          }

          {showStorageTable &&
            invoiceLines.map((depotGroup, index) => (
                <StorageInvoicesTable
                  key={`${depotGroup.depotName}-${index}`}
                  depotGroup={depotGroup}
                  exchangeRate={isEdit ? current?.exchangeRate : filters?.exchangeRate || 0}
                  onAddDeletedItems={() => null}
                  onDeleteItems={handleDeleteStorageItems}
                  isEdit={isEdit}
                />
                
            ))}
            {showStorageTable && (
                <CCol>
                  <div className="card-footer summary">
                    <p>
                    <b>Subtotal: </b> $ {storageSummary.subtotal}
                    </p>
                    <p>
                      <b>Taxes: </b> $ {storageSummary.taxes}
                    </p>
                    <p>
                      <b>Total in USD: </b> <strong className="summary-total"> $ {storageSummary.totalUSD}</strong>
                    </p>
                    <p>
                      <b>Total in LPS: </b> <strong className="summary-total-lps">L. {storageSummary.totalLPS}</strong>
                    </p>
                  </div>
                </CCol>
              )
          }

          <br />

          {showAddComment &&
            <div className="d-flex gap-3">
              <CAvatar color="secondary" textColor="white" size="md">
                <CIcon icon={cilPencil} />
              </CAvatar>
              <div className="flex-grow-1">
                <CFormTextarea
                  name='comments'
                  rows={2}
                  placeholder="Write a comment..."
                  value={filters?.comments}
                  onChange={(e) => handleChangeInput(e)}
                  className="mb-2"
                />
              </div>
            </div>}

          <InfoModal
            showInfoModal={showInfoModal}
            setInfoModal={(arg: boolean) => {
              setShowInfoModal(arg)
              setInfoMessage('')
            }}
            infoMessage={infoMessage}
          />

          <ErrorModal
            showErrorModal={showErrorModal}
            setShowErrorModal={(arg: boolean) => toggleErrorModal(arg)}
            errorMessage={errorMessage}
          />

          <SuccesModalWithActions
            showSuccessModal={showSuccessModal}
            setShowSuccessModal={setShowSuccessModal}
            savedData={savedData}
            recordIdKey={"depotStatementId"}
            isEdit={isEdit}
            successMessage={successMessage}
            onClickCreateAnother={() => navigate(0)}
            onClickContinueEditing={() => {
              navigate(`/depot-main/depot-statement/${savedData?.depotStatementId}/${statementType}`);
              setShowSuccessModal(false);
            }}
            onClickBackToOverview={() => navigate("/depot-main/depot-statement")}
          />
        </CCardBody>

        <CCardFooter>
          <div className="d-flex justify-content-end gap-2">
            {!isEdit && invoiceLines.length > 0 && (
              <CButton color="primary" className="text-white" onClick={handleGenerate} disabled={isSaving1 || isSaving2}>
                {(isSaving1 || isSaving2) ? (
                    <>
                      <CSpinner size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CIcon icon={cilSave} className="me-2" />
                      Save Statement
                    </>
                  )}
              </CButton>
            )}
            <CButton color="secondary" className="text-white"
              onClick={() => navigate("/depot-main/depot-statement")}>
              <CIcon icon={cilArrowThickFromRight} className="me-2" />
              Go Back
            </CButton>
          </div>
        </CCardFooter>
      </CCard>
    </CContainer>
  )
}

export default DepotStatementFormPage