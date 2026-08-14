import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useDispatch, useSelector} from 'react-redux';
import StorageFiltersForm from '../components/StorageFiltersForm';
import RentalFiltersForm from '../components/RentalFiltersForm';
import InventoryFiltersForm from '../components/InventoryFiltersForm';
import ActivityFiltersForm from '../components/ActivityFiltersForm';
import { CContainer, CButton, CCard, CCardFooter, CCardHeader, CSpinner } from '@coreui/react-pro';
import { cilCheckCircle } from '@coreui/icons';
import CIcon from '@coreui/icons-react';
import PageHero from 'src/components/PageHero';
import { loadClients } from 'src/modules/Assets/Clients/store/clients.slice';
import { RenderOptions } from "../../../helpers/RenderOptionsHelper";
import { set, type AppDispatch } from '../../../store'
import { loadLookups, loadStorageReportLines, loadRentalReportLines, loadInventoryReportLines, loadActivityReportLines } from '../store/reports.slice';
import { fetchDepots, selectDepotsList } from '../../Depots/store/depots.slice'
import StorageReportTable from '../components/StorageReportTable';
import RentalReportTable from '../components/RentalReportTable';
import InventoryReportTable from '../components/InventoryReportTable';
import ActivityReportTable from '../components/ActivityReportTable';
import { 
    getStorageSearchSchema, 
    getRentalSearchSchema, 
    getInventorySearchSchema, 
    getActivitySearchSchema 
} from '../validators/report-filters.validation';
import InfoMessageModal from '../../../components/InfoMessageModal';
import SingleFilterForm from '../components/InitialSingleFilter';
import { cilCloudDownload } from '@coreui/icons';
import reportsApi from '../api/reports.api';

import {
  loadEquipmentTypes,
  loadEquipmentSizeFromList,
  selectEquipmentTypesList,
  selectEquipmentSizesList,
  fetchEquipmentSizes,
} from '../../EquipmentSize/store/equipmentSize.slice'
import * as yup from "yup";

function depotReportPage() {

    const dispatch = useDispatch<AppDispatch>()

    const [filters, setFilters] = useState<any>({})
    const [records, setRecords] = useState<any>([])
    const [searchErrors, setSearchErrors] = useState<any>({})
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoMessage, setInfoMessage] = useState('');
    const [pdfLoading, setPdfLoading] = useState(false);
    const [clickedGenerate, setClickedGenerate] = useState(false);
    const noReportSelected = !filters.reportType || filters.reportType === null;
   

    const loadData = useCallback(() => {
        dispatch(loadClients())
        dispatch(loadLookups())
        dispatch(fetchDepots())
        dispatch(loadEquipmentTypes())
        dispatch(fetchEquipmentSizes())
    }, [dispatch])

    useEffect(() => {
        loadData()
    }, [loadData])

    

    const getOptions = useCallback((list: any[], id: string, label: string, placeholder = "") => {
        const options = RenderOptions(list, id, label) ?? [];
        return options;
        //return [{ label: placeholder, value: "" }, ...options];
    }, []);


    const clients = useSelector((s: any) => s.clients?.list ?? [])
    const reportTypes = useSelector((s: any) => s.depotReports?.lookups?.reportTypesList ?? [])
    const gensetTypes = useSelector((s: any) => s.depotReports?.lookups?.gensetTypesList ?? [])
    const gateTypes = useSelector((s: any) => s.depotReports?.lookups?.gateTypesList ?? [])
    const requestTypes = useSelector((s: any) => s.depotReports?.lookups?.requestTypesList ?? [])
    const storageReportData = useSelector((s: any) => s.depotReports?.storageReportLines ?? [])
    const rentalReportData = useSelector((s: any) => s.depotReports?.rentalReportLines ?? [])
    const inventoryReportData = useSelector((s: any) => s.depotReports?.inventoryReportLines ?? [])
    const activityReportData = useSelector((s: any) => s.depotReports?.activityReportLines ?? [])
    const depots = useSelector(selectDepotsList) ?? []
    const equipmentTypes = useSelector(selectEquipmentTypesList) ?? []
    const equipmentSizes = useSelector(selectEquipmentSizesList) ?? []
    const storageReportTypeId = reportTypes.find((r: any) => r.flat_name_id === 'storage')?.attributeItemId;
    const isStorage = Number(filters.reportType) === Number(storageReportTypeId);
    const rentalReportTypeId = reportTypes.find((r: any) => r.flat_name_id === 'rental')?.attributeItemId;
    const isRental = Number(filters.reportType) === Number(rentalReportTypeId);
    const inventoryReportTypeId = reportTypes.find((r: any) => r.flat_name_id === 'inventory')?.attributeItemId;
    const isInventory = Number(filters.reportType) === Number(inventoryReportTypeId);
    const activityReportTypeId = reportTypes.find((r: any) => r.flat_name_id === 'activity')?.attributeItemId;
    const isActivity = Number(filters.reportType) === Number(activityReportTypeId);
    const isLoading = useSelector((s: any) => s.depotReports?.isLoading ?? false);


    useEffect(() => {
        if (isStorage) {
            setRecords(storageReportData);
        }

    }, [storageReportData])

    useEffect(() => {

        if (isRental) {
            setRecords(rentalReportData);
        }

    }, [rentalReportData])

    useEffect(() => {

        if (isInventory) {
            setRecords(inventoryReportData);
        }

    }, [inventoryReportData])

    useEffect(() => {

        if (isActivity) {
            setRecords(activityReportData);
        }

    }, [activityReportData])
    

    const clientOptions = useMemo(
        () => getOptions(clients ?? [], "client_id", "name", "Select Client..."),
        [clients, getOptions]
    );

    const reportTypeOptions = useMemo(
        () => getOptions(reportTypes ?? [], "attributeItemId", "name", "Select Statement Type..."),
        [reportTypes, getOptions]
    );

    const gensetTypeOptions = useMemo(
        () => getOptions(gensetTypes ?? [], "attributeItemId", "name", "Select Genset Type..."),
        [gensetTypes, getOptions]
    );

        const containerSizeOptions = useMemo(
    () =>
        equipmentSizes.filter((s: any) => s.equipmentTypeId === 2).map((s: any) => ({
            label: s.sizeType,
            value: String(s.sizeEquipmentId ?? s.id),
        })),
    [equipmentSizes],
    )

    const chassisSizeOptions = useMemo(
    () =>
        equipmentSizes.filter((s: any) => s.equipmentTypeId === 1).map((s: any) => ({
            label: s.sizeType,
            value: String(s.sizeEquipmentId ?? s.id),
        })),
    [equipmentSizes],
    )

    const gateTypeOptions = useMemo(
    () =>
        gateTypes.filter((s: any) => s.flat_name_id !== "both").map((s: any) => ({
            label: s.name,
            value: String(s.attributeItemId),
        })),
    [gateTypes],
    )

    const requestTypeOptions = useMemo(
    () =>
        requestTypes.map((s: any) => ({
            label: s.name,
            value: String(s.attributeItemId),
        })),
    [requestTypes],
    )

    const getChartData1 = (equipmentType: string, depotId: number) => {
        // Get bar chart data for rental or storage report

        if (isRental && rentalReportData.length === 0) return { labels: [], datasets: [] };
        if (isStorage && storageReportData.length === 0) return { labels: [], datasets: [] };
    
        
        const chartLabels: string[] = [];
        const chartValues: number[] = [];
        const data : number[] = [];
        const sizeTypeIdKey = equipmentType === 'Genset' ? 'gensetTypeId' : 'equipmentSizeId';
        const sizeTypeKey = equipmentType === 'Genset' ? 'gensetType' : 'equipmentSize';


        let reportData = [];

        if (isStorage) {
            reportData = storageReportData;
        }

        if (isRental) {
            reportData = rentalReportData;
        }

        const depotGroup = reportData.filter((depotGroup: any) => depotGroup.depotId === depotId);
        const recs = depotGroup[0]?.records;
        console.log('filtered recs: ', recs);
        for (let i = 0; i < recs?.length; i++) {
            if (recs[i].equipmentType === equipmentType /* && recs[i].depotId === depotId */) {
                const sizeId = recs[i][sizeTypeIdKey];
                const sizeName = recs[i][sizeTypeKey];

                if (!chartLabels.includes(sizeName)) {
                    chartLabels.push(sizeName);
                    chartValues.push(sizeId);
                }
            }
        }

        for (let i = 0; i < chartLabels.length; i++) {
            data.push(0);
        }

        for (let i = 0; i < recs?.length; i++) {
            if (recs[i].equipmentType === equipmentType /* && recs[i].depotId === depotId */) {
                const sizeId = recs[i][sizeTypeIdKey];
                const index = chartValues.indexOf(sizeId);
                if (index !== -1) {
                    data[index] += 1;
                }
            }
        }

        const colormap = {
            "Chassis":  '#60A5FA',
            "Container": '#3B82B6',
            "Genset": '#0F4C81'
        }

        if(chartLabels.length === 1) {
            chartLabels.push("");
            data.push(0);
        }


        return {
            labels: chartLabels,
            datasets: [
            {
                backgroundColor: colormap[equipmentType],
                borderColor: '#E9F4FF',
                data: data,
            },
            ],
        }

    }

    const getChartData2 = (equipmentType: string, depotId: number) => {
        // Get bar chart data for inventory report
        
        if (inventoryReportData.length === 0) return { labels: [], datasets: [] };
        
        const chartLabels: string[] = [];
        const chartValues: number[] = [];
        const data : number[] = [];
        const sizeTypeIdKey = equipmentType === 'Genset' ? 'gensetTypeId' : 'equipmentSizeId';
        const sizeTypeKey = equipmentType === 'Genset' ? 'gensetType' : 'equipmentSize';

        const depotGroup = inventoryReportData.filter((depotGroup: any) => depotGroup.depotId === depotId);
        const recs = depotGroup[0]?.records;

        for (let i = 0; i < recs?.length; i++) {
                const sizeId = recs[i][sizeTypeIdKey];
                const sizeName = recs[i][sizeTypeKey];

                if (!chartLabels.includes(sizeName)) {
                    chartLabels.push(sizeName);
                    chartValues.push(sizeId);
            }
        }

        for (let i = 0; i < chartLabels.length; i++) {
            data.push(0);
        }

        for (let i = 0; i < recs?.length; i++) {
                const sizeId = recs[i][sizeTypeIdKey];
                const index = chartValues.indexOf(sizeId);
                if (index !== -1) {
                    data[index] += 1;
                }
        }

        const colormap = {
            "Chassis":  '#60A5FA',
            "Container": '#3B82B6',
            "Genset": '#0F4C81'
        }

        if(chartLabels.length === 1) {
            chartLabels.push("");
            data.push(0);
        }

        return {
            labels: chartLabels,
            datasets: [
            {
                backgroundColor: colormap[equipmentType],
                borderColor: '#E9F4FF',
                data: data,
            },
            ],
        }

    }
    

    const depotOptions = useMemo(
        () => RenderOptions(depots ?? [], "depotId", "depotName"),
        [depots, getOptions]
    );

    const equipmentTypeOptions = useMemo(
    () =>
        equipmentTypes.map((t: any) => ({
        label: t.equipmentName ?? t.name ?? t.description ?? 'Unnamed',
        value: String(t.equipmentTypeId ?? t.id),
        })),
    [equipmentTypes],
    )




    const handleChange = (eventArray: any[], field: string) => {
        console.log('new handleChange: ', eventArray, field);

        if (eventArray.length === 0) {
            delete filters[field]
            delete filters[`${field}Label`]
            return;
        }


        const event = eventArray[0]
        const { value } = event;
        const safeValue = value === '' ? null : value;

        if (field === "reportType") {
            //clean rest of filters
            setFilters({
                [field] : safeValue
            });
            setRecords([]);
            return;
        }

        if (isActivity) {
            if (
                field === 'sortBy' && 
                safeValue === 'gate' &&
                "ownerIds" in filters
            ) {
                delete filters["ownerIds"];
                delete filters["ownersLabel"];
            }
        }

        const next = { ...filters } as any
        next[field] = safeValue;
        if (field in labelsMap){
            next[labelsMap[field][0]] = getLabels(field, [safeValue]);
        }
        
        setRecords([]);
        setFilters(next)
    }

    const optionsMap: any = {
        "clientIds": clientOptions as any,
        "ownerIds": clientOptions as any,
        "depotIds": depotOptions as any,
        "loaded": [{ label: 'Loaded', value: 1 }, { label: 'Empty', value: 2 }] as any,
        "equipmentTypeIds": equipmentTypeOptions as any,
        "containerSizeIds": containerSizeOptions as any,
        "chassisSizeIds": chassisSizeOptions as any,
        "gensetTypeIds": gensetTypeOptions as any,
        "gateTypeIds": gateTypeOptions as any,
        "requestTypeIds": requestTypeOptions as any,
        "sortBy": [{value: 'gate', label: 'Gate'}, {value: 'equipment', label: 'Equipment'}] as any
    };

    type LabelsMapType = {
    [key: string]: string[];
    };

    const labelsMap: LabelsMapType = {
        "clientIds": ['clientsLabel', 'Clients:'],
        "ownerIds": ['ownersLabel', 'Equipment Owners:'],
        "depotIds": ['depotsLabel', 'Depots:'],
        "loaded": ['loadedLabel', 'Cargo:'],
        "equipmentTypeIds": ['equipmentTypesLabel', 'Equipment Types:'],
        "containerSizeIds": ['containerSizesLabel', 'Container Sizes:'],
        "chassisSizeIds": ['chassisSizesLabel', 'Chassis Sizes:'],
        "gensetTypeIds": ['gensetTypesLabel', 'Genset Types:'],
        "gateTypeIds": ['gateTypesLabel', 'Gate Types:'],
        "requestTypeIds": ['requestTypesLabel', 'Request Types:'],
        "sortBy": ['sortByLabel', 'Sorted By:']
    };

    const getLabels = (field: string, values: (string | number)[]): string => {
        console.log('getLabels: ', field, values);
        const options = optionsMap[field];
        let labels: string[] = [];
        for (const value of values) { 
            const option = options.find((o: any) => o.value === value);
            if (option) {
                labels.push(option.label);
            }
        }
        
        const label = `${labelsMap[field][1]} ${labels.join(', ')}`;
        return label;
    };

    const handleChangeMulti = (
        field: string,
        values: (string | number)[]
    ) => {

        if (values.length === 0) {
            delete filters[field]
            delete filters[labelsMap[field][0]]

            return;
        }

        if ((isRental || isActivity) && field === 'equipmentTypeIds') {

            if ("chassisSizeIds" in filters && !values.includes("1")) {
                delete filters.chassisSizeIds
                delete filters.chassisSizesLabel
            }

            if ("containerSizeIds" in filters && !values.includes("2")) {
                delete filters.containerSizeIds
                delete filters.containerSizesLabel
            }

            if ("gensetTypeIds" in filters && !values.includes("3")) {
                delete filters.gensetTypeIds
                delete filters.gensetTypesLabel
            }

        }

        setRecords([]);

        setFilters((prev: any) => ({
            ...prev,
            [field]: values ?? [],
            [labelsMap[field][0]]: getLabels(field, values),
        }));
    };

      const yupToErrorMap = (err: yup.ValidationError): Record<string, string> => {
        const errors: Record<string, string> = {};
        for (const e of err.inner) {
          if (e.path && !errors[e.path]) errors[e.path] = e.message;
        }
        if (err.path && !errors[err.path]) errors[err.path] = err.message;
        return errors;
      };
    
    const validateStorageSearch = async (data: any): Promise<boolean> => {

        let schemaErrors: Record<string, string> | null = null;
    
        try {
          const storageReportSchema = getStorageSearchSchema();
          await storageReportSchema.validate(data, { abortEarly: false });
        } catch (e) {
          schemaErrors = yupToErrorMap(e as yup.ValidationError);
        }
    
        if (schemaErrors) {
          setSearchErrors({
            ...(schemaErrors ?? {})
          });
          return false;
        }
    
        setSearchErrors(false);
        return true;
    };

    const validateRentalSearch = async (data: any): Promise<boolean> => {

        let schemaErrors: Record<string, string> | null = null;
    
        try {
          const rentalReportSchema = getRentalSearchSchema();
          await rentalReportSchema.validate(data, { abortEarly: false });
        } catch (e) {
          schemaErrors = yupToErrorMap(e as yup.ValidationError);
        }
    
        if (schemaErrors) {
          setSearchErrors({
            ...(schemaErrors ?? {})
          });
          return false;
        }
    
        setSearchErrors(false);
        return true;
    }

    const validateInventorySearch = async (data: any): Promise<boolean> => {

        let schemaErrors: Record<string, string> | null = null;
    
        try {
          const rentalReportSchema = getInventorySearchSchema();
          await rentalReportSchema.validate(data, { abortEarly: false });
        } catch (e) {
          schemaErrors = yupToErrorMap(e as yup.ValidationError);
        }
    
        if (schemaErrors) {
          setSearchErrors({
            ...(schemaErrors ?? {})
          });
          return false;
        }
    
        setSearchErrors(false);
        return true;
    }

    const validateActivitySearch = async (data: any): Promise<boolean> => {

        let schemaErrors: Record<string, string> | null = null;
    
        try {
          const activityReportSchema = getActivitySearchSchema();
          await activityReportSchema.validate(data, { abortEarly: false });
        } catch (e) {
          schemaErrors = yupToErrorMap(e as yup.ValidationError);
        }
    
        if (schemaErrors) {
          setSearchErrors({
            ...(schemaErrors ?? {})
          });
          return false;
        }
    
        setSearchErrors(false);
        return true;
    }


    const handleGenerate = async() => {
        setClickedGenerate(true);

        if (isStorage) {
            const isValid = await validateStorageSearch(filters);
            if (!isValid) return;

            const filtersClone = { ...filters };
            if ("loaded" in filtersClone) {
                if(filtersClone.loaded?.length === 2) delete filtersClone.loaded
                if(filtersClone.loaded?.length === 1 && filtersClone.loaded[0] === 2) filtersClone.loaded = [0]
            }
            const response = await dispatch(loadStorageReportLines(filtersClone));
            if (response?.payload?.storageReportLines?.length === 0) {
                setShowInfoModal(true);
                setInfoMessage("No records found for the selected filters. Please try again.");
            }
        }

        if (isRental) {
            const isValid = await validateRentalSearch(filters);
            if (!isValid) return;

            const filtersClone = { ...filters };
            const containerSizeIds = filtersClone?.containerSizeIds ?? [];
            const chassisSizeIds = filtersClone?.chassisSizeIds ?? [];
            let equipmentSizeIds: number[] = [];

            if (containerSizeIds.length > 0) {
                equipmentSizeIds = equipmentSizeIds.concat(containerSizeIds);
                delete filtersClone.containerSizeIds
            }

            if (chassisSizeIds.length > 0) {
                equipmentSizeIds = equipmentSizeIds.concat(chassisSizeIds);
                delete filtersClone.chassisSizeIds
            }

            if (equipmentSizeIds.length > 0) {
                filtersClone.equipmentSizeIds = equipmentSizeIds;
            }

            const response = await dispatch(loadRentalReportLines(filtersClone));
            if (response?.payload?.reportReportLines?.length === 0) {
                setShowInfoModal(true);
                setInfoMessage("No records found for the selected filters. Please try again.");
            }

        }                           

        if (isInventory) {
            const isValid = await validateInventorySearch(filters);
            if (!isValid) return;

            const filtersClone = { ...filters };
       
            const response = await dispatch(loadInventoryReportLines(filtersClone));
            if (response?.payload?.inventoryReportLines?.length === 0) {
                setShowInfoModal(true);
                setInfoMessage("No records found for the selected filters. Please try again.");
            }
        }

        if (isActivity) {
            const isValid = await validateActivitySearch(filters);
            if (!isValid) return;

            const filtersClone = { ...filters };
       
            const response = await dispatch(loadActivityReportLines(filtersClone));
            if (response?.payload?.activityReportLines?.length === 0) {
                setShowInfoModal(true);
                setInfoMessage("No records found for the selected filters. Please try again.");
            }
        }
    }

    console.log('filters', filters);

      const handleExportStorageReportPDF = async () => {
        try {
          setPdfLoading(true);
          const resp = await reportsApi.downloadReportPDF(filters, "storage");
          if (resp?.status === 200) {
            setPdfLoading(false);
          }
        } catch (error) {
          setPdfLoading(false);
          console.error("Failed to export PDF", error);
        }
      };

      const handleExportRentalReportPDF = async () => {
        try {
          setPdfLoading(true);
          const resp = await reportsApi.downloadReportPDF(filters, "rental");
          if (resp?.status === 200) {
            setPdfLoading(false);
          }
        } catch (error) {
          setPdfLoading(false);
          console.error("Failed to export PDF", error);
        }
      }

      const handleExportInventoryReportPDF = async () => {
        try {
          setPdfLoading(true);
          const resp = await reportsApi.downloadReportPDF(filters, "inventory");
          console.log('pdf resp', resp);
          if (resp?.status === 200) {
            setPdfLoading(false);
          }
        } catch (error) {
          setPdfLoading(false);
          console.error("Failed to export PDF", error);
        }
      }

      const handleExportActivityReportPDF = async () => {
        try {
          setPdfLoading(true);
          const resp = await reportsApi.downloadReportPDF(filters, "activity");
          if (resp?.status === 200) {
            setPdfLoading(false);
          }
        } catch (error) {
          setPdfLoading(false);
          console.error("Failed to export PDF", error);
        }
      }

    const handlePickDate = (e: any) => {
        const { name, value } = e.target
        console.log('handlePickDate: ', name, value);

        const unixSeconds = value !== ''
        ? Math.floor(new Date(`${value}T00:00:00`).getTime() / 1000)
        : null;

        setRecords([]);

        setFilters((prev: any) => (
        {
            ...prev,
            [name]: String(unixSeconds),
            [`${name}String`]: value
        }))
    }

    const handleExport = async (
        exportType: 'PDF' | 'XLSX') => {

        if (isStorage && exportType === 'PDF') {
            await handleExportStorageReportPDF();
        }

        if (isRental && exportType === 'PDF') {
            await handleExportRentalReportPDF();
        }

        if (isInventory && exportType === 'PDF') {
            await handleExportInventoryReportPDF();
        }

        if (isActivity && exportType === 'PDF') {
            await handleExportActivityReportPDF();
        }
    }

    console.log('records -->', records);


  return (
    <div> 
            <CContainer fluid>
                <PageHero kicker="Depot" icon="cilTruck" title={"Depot Report Builder"} 
                subtitle="Get visibility of client equipment in storage (in yard) or owned equipment rental (on street). Get equipment invetory or gate activity. " />
                <div className="d-flex justify-content-center mt-4">
                </div>
            </CContainer>

            <CCard className="shadow-sm mb-4">
            {records.length > 0 && <CCardHeader>
                <div className="d-flex justify-content-end gap-2">
                    <CButton color="danger" onClick={() => handleExport("PDF")} className="me-2 text-white" disabled={pdfLoading}>
                        {!pdfLoading && <><CIcon icon={cilCloudDownload} className="me-2" />Export PDF</>}
                        { pdfLoading && <><CSpinner size="sm" className="me-2" />Downloading...</>}
                    </CButton>
                </div>

            </CCardHeader>}
            
            {noReportSelected && 
            <SingleFilterForm
                filters={filters}
                reportTypeOptions={reportTypeOptions}
                onChange={handleChange}
                errors={searchErrors}
            />}
            {isStorage && 
            <StorageFiltersForm 
                filters={filters}
                clientOptions={clientOptions}
                reportTypeOptions={reportTypeOptions}
                depotOptions={depotOptions}
                equipmentTypeOptions={equipmentTypeOptions}
                onChange={handleChange}
                onChangeMulti={handleChangeMulti}
                errors={searchErrors}
            />}
            {
            isRental && 
            <RentalFiltersForm 
                filters={filters}
                clientOptions={clientOptions}
                reportTypeOptions={reportTypeOptions}
                depotOptions={depotOptions}
                equipmentTypeOptions={equipmentTypeOptions}
                containerSizeOptions={containerSizeOptions}
                chassisSizeOptions={chassisSizeOptions}
                gensetTypeOptions={gensetTypeOptions}
                onChange={handleChange}
                onChangeMulti={handleChangeMulti}
                errors={searchErrors}
            />}
            {
                isInventory &&
                <InventoryFiltersForm 
                    filters={filters}
                    clientOptions={clientOptions}
                    reportTypeOptions={reportTypeOptions}
                    depotOptions={depotOptions}
                    gateTypeOptions={gateTypeOptions}
                    requestTypeOptions={requestTypeOptions}
                    equipmentTypeOptions={equipmentTypeOptions}
                    onChange={handleChange}
                    onChangeMulti={handleChangeMulti}
                    errors={searchErrors}
                />
            }
            {
                isActivity &&
                <ActivityFiltersForm 
                    filters={filters}
                    clientOptions={clientOptions}
                    reportTypeOptions={reportTypeOptions}
                    depotOptions={depotOptions}
                    gateTypeOptions={gateTypeOptions}
                    requestTypeOptions={requestTypeOptions}
                    equipmentTypeOptions={equipmentTypeOptions}
                    onChange={handleChange}
                    onChangeMulti={handleChangeMulti}
                    onPickDate={handlePickDate}
                    errors={searchErrors}
                />
            }

             {!noReportSelected && !isLoading &&
            <CCardFooter>
            <div className="d-flex justify-content-end gap-2">
                <CButton color="primary" className="text-white" onClick={handleGenerate}>
                    Generate
                <CIcon icon={cilCheckCircle} className="ms-2" />
                </CButton>
            </div>
            </CCardFooter>}
            { isLoading && <div className="loading-bar">
                <CSpinner size="lg" className="me-2" />
                <div>Loading Report...</div>
            </div>}
            </CCard>

            {records.length > 0 && isStorage &&
                <StorageReportTable 
                    filters={filters}
                    data={records}
                    getChartData={getChartData1}
                />
            }
            {records.length > 0 &&  isRental &&
               <>
               <RentalReportTable 
                    filters={filters}
                    data={records}
                    getChartData={getChartData1}
                />
               </>
                
            }
            {records.length > 0 &&  isInventory &&
                <InventoryReportTable 
                    filters={filters}
                    data={records}
                    getChartData={getChartData2}
                />
            }
            {records.length > 0 &&  isActivity &&
                <ActivityReportTable 
                    filters={filters}
                    data={records}
                />
            }
            <InfoMessageModal 
                showInfoModal = {showInfoModal}
                setInfoModal = {setShowInfoModal}
                infoMessage = {infoMessage}
            />
    </div>
    
  )
}

export default depotReportPage