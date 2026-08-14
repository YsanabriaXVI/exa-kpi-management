import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { loadPartsList } from "src/modules/PartsAndSections/store/partsAndSectionsSlice";
import * as yup from "yup";

import {
  PLACEHOLDER,
} from "../../EquipmentRequest/components/feConstants";

import {
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CFormSelect,
  CRow,
  CCollapse,
  CSpinner
} from "@coreui/react-pro";
import CIcon from "@coreui/icons-react";
import { cilList, cilCloudDownload, cilSave, cilArrowThickFromRight, cilArrowThickFromBottom, cilPlus } from "@coreui/icons";

import PageHero from "../../../components/PageHero";
import SuccessMessageModal from "src/components/SuccessMessageModal";
import ErrorMessageModal from "src/components/ErrorMessageModal";
import SuccesModalWithActions from "src/components/SuccesModalWithActions";
import CreateRequestForm from "../components/CreateRequestForm";
import { saveEquipmentRequest } from "../../EquipmentRequest/store/equipmentRequest.slice";
import { loadAssignedTrips } from "../../EquipmentRequest/store/equipmentRequest.slice";
import apiClient from "../../../services/api/axios.config";
import { RenderOptions } from "../../../helpers/RenderOptionsHelper";
import { type AppDispatch, type RootState } from "../../../store";

import {
  AttributeItem,
  ChecklistSection,
  DamageDataRow,
  KindOfChecklist,
  Checklist,
  ValidationIssue,
  ValidationErrorsState,
  ChangeEvt,
  GateType,
  OnChangeEvt,
  ChassisAutoSuggestData,
  GensetAutoSuggestData,
  ContainerAutoSuggestData,
  LastTripInfo
} from "../types";

import {
  getNewContainerSchema,
  getNewChassisSchema,
  getNewGensetSchema,
  containerValidationSchema,
  chassisValidationSchema,
  gensetValidationSchema,
  gateDamageDataSchema,
  getNewTruckSchema,
  getNewDriverSchema,
  gateValidationSchema,
  getRequestSchema,
} from "../helpers/validation/schemas";

import buildSubmitErrorMessage from "../helpers/buildSubmitErrorMessage";
import validateContainerNumKey from "../helpers/validateContainerNumberKey";
import validateCompleteContainerNum from "../helpers/validateContainerNumber";

import { newContainerObj, newChassisObj, newGensetObj, newTruckObj, newDriverObj, newEquipmentRequestObj } from "../helpers/defaultObjects";

import {
  loadGatesLookups,
  loadGateById,
  loadChecklist,
  loadDefaultGate,
  clearCurrent,
  loadHaulageType as loadHaulage,
  loadLastTrip,
  createGate,
  clearError,
  clearAsset,
  createRelatedOtherAssets,
  cleanChecklist,
  cleanTrip,
  createOtherAsset,
  loadGateImagesData,
} from "../store/gates.slice";

import { fetchDepots } from "../../Depots/store/depots.slice";
import { fetchDamageTypes } from "../../DamageTypes/store/damageTypes.slice";
import { fetchEquipmentSizes } from "../../EquipmentSize/store/equipmentSize.slice";
import { loadClients } from "../../Assets/Clients/store/clients.slice";
import { loadSubdivisions } from "../../Assets/Subdivisions/store/subdivisions.slice";
import { loadUnassignedRequirementsList, loadRequestsList } from "../../EquipmentRequest/store/equipmentRequest.slice";

import ContainerForm from "../components/ContainerForm";
import ChassisForm from "../components/ChassisForm";
import GensetForm from "../components/GensetForm";
import TruckForm from "../components/TruckForm";
import SignatureCanvas from "../components/SignatureCanvas";

import { gatesAPI } from "../api/gates.api";

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */

function GatesEditPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const { gateId, gateType } = useParams<any>();

  const isEdit = gateId !== "new";
  const isGateIn = gateType === "IN";
  console.log("isGateIn", isGateIn);
  const isGateOut = gateType === "OUT";
  console.log("isGateOut", isGateOut);

  /* -------------------------------- Local State ------------------------------- */

  const [gate, setGate] = useState<any>({});
  const [containerData, setContainerData] = useState<any>({});
  const [chassisData, setChassisData] = useState<any>({});
  const [gensetData, setGensetData] = useState<any>({});

  const [containerCheckList, setContainerCheckList] = useState<any>({ equipmentParts: [] });
  console.log("containerCheckList", containerCheckList);
  const [chassisCheckList, setChassisCheckList] = useState<any>({ equipmentParts: [] });
  console.log("chassisCheckList", chassisCheckList);
  const [gensetCheckList, setGensetCheckList] = useState<any>({ equipmentParts: [] });
  console.log("gensetCheckList", gensetCheckList);

  const [containerDamage, setContainerDamage] = useState<any[]>([]);
  const [chassisDamage, setChassisDamage] = useState<any[]>([]);
  const [gensetDamage, setGensetDamage] = useState<any[]>([]);

  const [gateDetails, setGateDetails] = useState<any[]>([]);
  const [containerParts, setContainerParts] = useState<any[]>([]);

  const [showNewContainerForm, setShowNewContainerForm] = useState(false);
  const [showNewChassisForm, setShowNewChassisForm] = useState(false);
  const [showNewGensetForm, setShowNewGensetForm] = useState(false);
  const [showNewTruckForm, setShowNewTruckForm] = useState(false);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);

  const [newContainer, setNewContainer] = useState<any>(newContainerObj);
  const [newChassis, setNewChassis] = useState<any>(newChassisObj);
  const [newGenset, setNewGenset] = useState<any>(newGensetObj);
  const [newTruck, setNewTruck] = useState<any>(newTruckObj);
  const [newDriver, setNewDriver] = useState<any>(newDriverObj);
  const [newRequest, setNewRequest] = useState<any>(newEquipmentRequestObj);

  const [newContainerErrors, setNewContainerErrors] = useState<any>({});
  const [newChassisErrors, setNewChassisErrors] = useState<any>({});
  const [newGensetErrors, setNewGensetErrors] = useState<any>({});
  const [newTruckErrors, setNewTruckErrors] = useState<any>({});
  const [newDriverErrors, setNewDriverErrors] = useState<any>({});
  const [newRequestErrors, setNewRequestErrors] = useState<any>({});

  const [CurrentNewEquipment, setCurrentNewEquipment] = useState<number | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [savedData, setSavedData] = useState<any>({});
  const [successModalOpen, setSuccessModalOpen] = useState<boolean>(false);

  const [lastInfoTrip, setLastInfoTrip] = useState<LastTripInfo>({
    tripId: 0,
    client: "",
    route: "",
    status: "",
  });

  const [errors, setErrors] = useState<ValidationErrorsState>({
    containerErrors: false,
    chassisErrors: false,
    gensetErrors: false,
    containerDamageErrors: false,
    chassisDamageErrors: false,
    gensetDamageErrors: false,
  });

  /* ---------------------------------- Selectors --------------------------------- */

  const { list: depotsList } = useSelector((state: RootState) => (state as any).depots);

  const { typeList: gateTypesList, colorsList, conditionTypesList, gensetTypesList, haulageTypesList, requestTypesList } = useSelector(
    (state: RootState) => (state as any).gates.lookups
  );

  const { list: equipmentSizesList } = useSelector((state: RootState) => (state as any).equipmentSize);
  const partsList = useSelector((s: RootState) => (s as any).parts?.list ?? []);
  const { trip, imagesInfo } = useSelector((s: RootState) => (s as any).gates ?? {});
  const gatesState = useSelector((s: RootState) => s.gates);

  const { list: clientsList } = useSelector((state: RootState) => (state as any).clients);
  const { list: damagesList } = useSelector((state: RootState) => (state as any).damageTypes);
  const { list: subdivisionsList } = useSelector((state: RootState) => (state as any).subdivisions);
  const { list: unfilteredPartsList } = useSelector((state: RootState) => (state as any).partsAndSections);

  const { 
    listUnassigned: unassignedResquests, 
    requirements: requirements, 
    list: requests,
    current: emptyRequest,
    trips: assignedTrips
  } = useSelector((state: RootState) => (state as any).equipmentRequest);

  const { current, loading, error: BEerrors, checkListBuilder, currentEquipmentTypeId, newAsset, haulage } = gatesState;

  console.log('BEerrors', BEerrors);

  console.log('current', current);
  console.log('assignedTrips', assignedTrips);
  console.log('loading: ', loading);

  /* ------------------------------ Options Helpers ------------------------------ */

  const getOptions = useCallback((list: any[], id: string, label: string, placeholder = "") => {
    const options = RenderOptions(list, id, label) ?? [];
    return [{ label: placeholder, value: "" }, ...options];
  }, []);

  const depotOptions = useMemo(
    () => getOptions(depotsList ?? [], "depotId", "depotName", "Select Depot..."),
    [depotsList, getOptions]
  );

  const clientOptions = useMemo(
    () => getOptions(clientsList ?? [], "client_id", "name", "Select Client..."),
    [clientsList, getOptions]
  );

  const containerDamageOptions = useMemo(
    () =>
      getOptions(
        (damagesList ?? []).filter((x: any) => x.equipmentTypeId === 2),
        "damageId",
        "damageName",
        "Select Damage..."
      ),
    [damagesList, getOptions]
  );

  const chassisDamageOptions = useMemo(
    () =>
      getOptions(
        (damagesList ?? []).filter((x: any) => x.equipmentTypeId === 1),
        "damageId",
        "damageName",
        "Select Damage..."
      ),
    [damagesList, getOptions]
  );

  const gensetDamageOptions = useMemo(
    () =>
      getOptions(
        (damagesList ?? []).filter((x: any) => x.equipmentTypeId === 3),
        "damageId",
        "damageName",
        "Select Damage..."
      ),
    [damagesList, getOptions]
  );

  const colorOptions = useMemo(
    () => getOptions(colorsList ?? [], "attributeItemId", "name", "Select Color..."),
    [colorsList, getOptions]
  );

  const conditionOptions = useMemo(
    () => getOptions(conditionTypesList ?? [], "attributeItemId", "name", "Select Condition..."),
    [conditionTypesList, getOptions]
  );

  const gensetTypeOptions = useMemo(
    () => getOptions(gensetTypesList ?? [], "attributeItemId", "name", "Select Condition..."),
    [gensetTypesList, getOptions]
  );

  const haulageTypeOptions = useMemo(
    () => getOptions(haulageTypesList ?? [], "attributeItemId", "name", "Select Condition..."),
    [haulageTypesList, getOptions]
  );

  const tripOptions = useMemo(
    () => getOptions(assignedTrips ?? [], "tripsid", "tripsid", "Select Trip ID..."),
    [assignedTrips, getOptions]
  )

  const gateTypeOptions = useMemo(
    () =>
      getOptions(
        (gateTypesList ?? []).filter((x: any) => x?.name !== "BOTH"),
        "attributeItemId",
        "name",
        "Select Gate Type..."
      ),
    [gateTypesList, getOptions]
  );

  console.log("gateTypeOptions", gateTypeOptions);

  const containerSizeOptions = useMemo(
    () =>
      getOptions(
        (equipmentSizesList ?? []).filter((x: any) => x?.equipmentTypeId == 2),
        "sizeEquipmentId",
        "sizeType",
        "Select Size..."
      ),
    [equipmentSizesList, getOptions]
  );

  const chassisSizeOptions = useMemo(
    () =>
      getOptions(
        (equipmentSizesList ?? []).filter((x: any) => x?.equipmentTypeId == 1),
        "sizeEquipmentId",
        "sizeType",
        "Select Size..."
      ),
    [equipmentSizesList, getOptions]
  );

  const subdivisionOptions = useMemo(
    () => getOptions(subdivisionsList ?? [], "subdivision_id", "name", "Select Subdivision..."),
    [subdivisionsList, getOptions]
  );

  const requestOptions = useMemo<any[]>(() => {
    if (isGateIn) return [];
    const list = isEdit ? requests : unassignedResquests ?? [];
    console.log("requests list", list);
    const options = (list ?? []).map((elem: any) => {
      const workOrderText = elem.workOrderId ? ` | Work Order:${elem.workOrderId}` : "";
      return {
        value: elem.equipmentRequestId,
        label: `ID: ${elem.equipmentRequestId} | Booking: ${elem.referenceNumberBooking}${workOrderText} | Client: ${elem.client.name}`,
      };
    });

    return [{ label: "Select Booking...", value: "" }, ...options];
  },  [isGateIn, isEdit, requests, unassignedResquests]);


  const requirementsOptions = useMemo<any[]>(() => {
    if (isGateIn) return [];
     const list = isEdit ? requests : unassignedResquests ?? [];
    const req =
      (list ?? []).find(
        (e: any) =>
          e.equipmentRequestId === gate?.equipmentRequestId
      ) ?? null;

    if (!req?.requirements || !Array.isArray(req.requirements)) return [];

      const options = req.requirements.map((requirement: any) => {
      
      const clientOwned3 = requirement.equipmentClientGenset === 1 ? "(Client's)" : "";
      const gensetLabel = requirement.genset === 1 ? `Yes ${clientOwned3}` : "No";

      const clientOwned2 = requirement.equipmentClientContainer === 1 ? "(Client's)" : "";
      const containerSizeLabel = requirement.containerSize
        ? `Container: ${requirement.containerSize.sizeType} ${clientOwned2}`
        : "";

      const clientOwned1 = requirement.equipmentClientChassis === 1 ? "(Client's)" : "";
      const chassisSizeLabel = requirement.chassisSize
        ? `Chassis: ${requirement.chassisSize.sizeType} ${clientOwned1}`
        : "";

      const label = [
        `Requirement ID: ${requirement.requestId}`,
        containerSizeLabel,
        chassisSizeLabel,
        `Genset: ${gensetLabel}`,
      ]
        .filter(Boolean)
        .join(" | ");

      return { value: requirement.requestId, label };
    });

    return [{ label: "Select Requirement...", value: "" }, ...options];
}, [isGateIn, isEdit, requests, unassignedResquests, gate?.equipmentRequestId]);


const chassisPartsList = useMemo(
  () => (unfilteredPartsList ?? []).filter((x: any) => x?.equipmentTypeId === 1),
  [unfilteredPartsList]
);

const containerPartsList = useMemo(
  () => (unfilteredPartsList ?? []).filter((x: any) => x?.equipmentTypeId === 2),
  [unfilteredPartsList]
);

const gensetPartsList = useMemo(
  () => (unfilteredPartsList ?? []).filter((x: any) => x?.equipmentTypeId === 3),
  [unfilteredPartsList]
);

const selectedRequest = useMemo(() => {
  if (!unassignedResquests) return null;
  return unassignedResquests.find((er: any) => er.equipmentRequestId === gate?.equipmentRequestId);
}, [gate?.equipmentRequestId]);


const selectedRequirement = useMemo(() => {
  if (!selectedRequest?.requirements) return null;
  return selectedRequest.requirements.find((req: any) => req.requestId === gate?.requestId);
}, [gate?.requestId, selectedRequest?.requirements]);





/* ---------------------------------- Load Data --------------------------------- */

const loadData = useCallback(() => {
  dispatch(fetchDepots());
  dispatch(loadGatesLookups());
  dispatch(fetchEquipmentSizes());
  dispatch(loadClients());
  dispatch(fetchDamageTypes());
  dispatch(loadSubdivisions());

  if (isGateOut && !isEdit) dispatch(loadUnassignedRequirementsList());
  if (isGateOut && isEdit) {
    //dispatch(actions.loadDefaultRequest())
    dispatch(loadRequestsList())
  }
  if (!isEdit) dispatch(loadPartsList());
}, [dispatch, isGateOut, isEdit]);

useEffect(() => {
  loadData();
}, [loadData]);

useEffect(() => {
  if (!selectedRequirement) return;

  if (selectedRequirement?.tripId && selectedRequirement?.trip_details) {

    dispatch(loadLastTrip({ id: selectedRequirement?.tripId, filter: "trip" }));
    const trip_id = selectedRequirement?.tripId;
    const driver_id = selectedRequirement?.trip_details?.driverid ?? null;
    const truck_id = selectedRequirement?.trip_details?.inventoryid ?? null;
    

    setGate((prev: any) => ({
      ...prev,
      driverId: driver_id,
      truckId: truck_id,
      tripId: trip_id,
    }))
    
  } 
}, [selectedRequirement]);

  /* ------------------------- Populate New Asset Data ------------------------- */

  useEffect(() => {
    const populateNewAssetData = async () => {
      if (!newAsset || !("data" in newAsset)) return;
      console.log("newAsset", newAsset);

      const created = newAsset?.data?.newAsset;
      if (!created) return;

      const newId = created.assetsid;
      if (!newId) return;

      if (CurrentNewEquipment === 1) {
        const response = await apiClient.get(`/assets-service/chassis/search?query=${newId}`);
        const chassis = (response.data || []).find((chassis: any) => chassis.value === Number(newId));
        console.log("chassis***", chassis);

        let newChassisData: any = { ...chassisData };

        const _ID = Number(newId);
        const _SIZE = Number(chassis.details.equipment_size_id);
        const _SUBDIVISION_ID = chassis.details.subdivisionId;
        const subdivisionIsNULL = _SUBDIVISION_ID === null;
        const chassistNotOwned = chassis.details.moduleid === 44;
        const subdivisionIsNotNull = _SUBDIVISION_ID !== null && typeof _SUBDIVISION_ID === "number";
        const chassisIsOwned = chassis.details.moduleid === 24;

        newChassisData.equipmentId = _ID;
        newChassisData.sizeEquipmentId = _SIZE;

        if (subdivisionIsNULL && chassistNotOwned) {
          newChassisData.subdivision_id = null;
          newChassisData.clientId = Number(chassis.details.client);
          newChassisData.inTransit = 0;
          newChassisData.ownedEquipment = 0;
        }

        if (subdivisionIsNULL && chassisIsOwned) {
          newChassisData.subdivision_id = null;
          newChassisData.clientId = 20;
          newChassisData.ownedEquipment = 1;
          newChassisData.inTransit = 0;
        }

        if (subdivisionIsNotNull && chassistNotOwned) {
          newChassisData.subdivision_id = Number(_SUBDIVISION_ID);
          newChassisData.clientId = null;
          newChassisData.inTransit = 1;
          newChassisData.ownedEquipment = 0;
        }

        setChassisData(newChassisData);
        setSuccessMessage(`Chassis #${newId} created successfully.`);
        setShowSuccessModal(true);
        showCreateForm(1, false); // CLOSE NEW CHASSIS FORM
        setNewChassis(newChassisObj); // CLEAR NEW CHASSIS FORM
      }

      if (CurrentNewEquipment === 2) {
        const response = await apiClient.get(`/assets-service/container/search?query=${newId}`);
        const container = (response.data || []).find((container: any) => container.value === Number(newId));

        const _ID = Number(newId);
        const _SIZE = Number(container.details.equipment_size_id);
        const _OWNER = Number(container.details.equipment_owner_id);

        setContainerData((prev: any) => ({
          ...prev,
          equipmentType: 2,
          equipmentId: _ID,
          sizeEquipmentId: _SIZE,
          clientId: _OWNER,
          ownedEquipment: _OWNER === 20 ? 1 : 0,
        }));

        setSuccessMessage(`Container #${newId} created successfully.`);
        setShowSuccessModal(true);
        showCreateForm(2, false); // CLOSE NEW CONTAINER FORM
        setNewContainer(newContainerObj); // CLEAR NEW CONTAINER FORM
      }

      if (CurrentNewEquipment === 3) {
        const response = await apiClient.get(`/assets-service/genset/search?query=${newId}`);
        const genset = (response.data || []).find((genset: any) => genset.value === Number(newId));

        const _ID = Number(newId);

        let newGensetData: any = { ...gensetData };
        newGensetData.equipmentId = _ID;

        const equivalentGensetType: Record<number, number> = {
          1553: 1522, //clip-on
          1554: 1523, //underlag
          1523: 1523, //clip-on
          1522: 1522, //underlag
        };

        const rawTypeId = parseInt(genset.details.genset_type_id, 10);

        newGensetData.gensetTypeId =
          genset.details.moduleid === 44 ? equivalentGensetType[rawTypeId] ?? rawTypeId : rawTypeId;

        const subdivisionIsNULL = genset.details.subdivisionId === null;
        const subdivisionIsNotNull = genset.details.subdivisionId !== null;
        const gensetNotOwned = genset.details.moduleid === 44;
        const gensetIsOwned = genset.details.moduleid === 25;

        const exaGensetSubdivision = genset.details.subdivisionId === "45" || genset.details.subdivisionId === "48";

        if (subdivisionIsNULL && gensetNotOwned) {
          newGensetData.subdivision_id = null;
          newGensetData.clientId = Number(genset.details.client);
          newGensetData.inTransit = 0;
          newGensetData.ownedEquipment = 0;
        }

        if ((subdivisionIsNULL || exaGensetSubdivision) && gensetIsOwned) {
          newGensetData.subdivision_id = null;
          newGensetData.clientId = 20;
          newGensetData.ownedEquipment = 1;
          newGensetData.inTransit = 0;
        }

        if (subdivisionIsNotNull && gensetNotOwned) {
          newGensetData.subdivision_id = genset.details.subdivisionId;
          newGensetData.clientId = null;
          newGensetData.inTransit = 1;
          newGensetData.ownedEquipment = 0;
        }

        setGensetData(newGensetData);
        setSuccessMessage(`Genset #${newId} created successfully.`);
        setShowSuccessModal(true);
        showCreateForm(3, false); // CLOSE NEW CONTAINER FORM
        setNewGenset(newGensetObj); // CLEAR NEW CONTAINER FORM
      }

      if (CurrentNewEquipment === 4) {
        const _ID = Number(newId);

        setGate((prev: any) => ({
          ...prev,
          truckId: _ID,
        }));

        const ra = newAsset?.data?.relatedAsset?.assetsid;
        const hasRelatedAsset = ra !== null && typeof ra === "number";

        if (hasRelatedAsset) {
          const driverId = Number(ra);
          console.log("Driver ID: ", driverId);

          const _DRIVERID = Number(driverId);
          setGate((prev: any) => ({
            ...prev,
            driverId: _DRIVERID,
          }));

          setSuccessMessage(`Truck #${newId} and Driver #${driverId} created successfully.`);
          setShowSuccessModal(true);
        } else {
          setSuccessMessage(`Truck #${newId} created successfully.`);
          setShowSuccessModal(true);
        }
      }

      if (CurrentNewEquipment === 5) {
        const DRIVER_ID = Number(newId);
        setGate((prev: any) => ({
          ...prev,
          driverId: DRIVER_ID,
        }));

        setSuccessMessage(`Driver #${newId} created successfully.`);
        setShowSuccessModal(true);
      }
    };

    setCurrentNewEquipment(null);
    populateNewAssetData();
  }, [newAsset]);

  /* --------------------------------- BE Errors -------------------------------- */

  useEffect(() => {
    if (BEerrors && Array.isArray(BEerrors.errors)) {
      setShowErrorModal(true);
      setErrorMessage(BEerrors.errors[0].message);
    }

    if (typeof BEerrors === "string") {
      setShowErrorModal(true);
      setErrorMessage(BEerrors);
    }
  }, [BEerrors]);

  useEffect(() => {
    if (trip !== null) setLastInfoTrip(trip);
  }, [trip]);

  /* useEffect(() => {
    console.log("search selectedRequirement tripId", selectedRequirement?.tripId);
    if (selectedRequirement?.tripId !== null) {
      setLastInfoTrip(selectedRequirement?.tripId);
    }
      
  }, [selectedRequirement?.tripId]); */

  useEffect(() => {
    if (haulage !== null) {
      setContainerData((prev: any) => ({
        ...prev,
        haulage: haulage,
      }));
    }
  }, [haulage]);

  /* ------------------------------ Checklist Helpers ----------------------------- */

  type PartItem = {
    equipmentTypeId: number;
    sizeEquipmentId: number;
    // ...other fields
  };

  const filterPartsByEquipmentTypeIdAndSize = (
    data: PartItem[],
    equipmentTypeId: number,
    sizeEquipmentId: number
  ): PartItem[] => {
    return data.filter((item) => item.equipmentTypeId === equipmentTypeId && item.sizeEquipmentId === sizeEquipmentId);
  };

  const showCreateForm = (formId: number, show: boolean) => {
    switch (formId) {
      case 1:
        setShowNewChassisForm(show);
        break;
      case 2:
        setShowNewContainerForm(show);
        break;
      case 3:
        setShowNewGensetForm(show);
        break;
      case 4:
        setShowNewTruckForm(show);
        break;
      case 5:
        setShowNewRequestForm(show);
        break;
      default:
        break;
    }
  };

  const yupToErrorMap = (err: yup.ValidationError): Record<string, string> => {
    const errors: Record<string, string> = {};
    for (const e of err.inner) {
      if (e.path && !errors[e.path]) errors[e.path] = e.message;
    }
    if (err.path && !errors[err.path]) errors[err.path] = err.message;
    return errors;
  };

  const validateNewContainer = async (data: any): Promise<boolean> => {
    const containerNumError = validateCompleteContainerNum(data?.[194] ?? null);

    let schemaErrors: Record<string, string> | null = null;

    try {
      const newContainerSchema = getNewContainerSchema();
      await newContainerSchema.validate(data, { abortEarly: false });
    } catch (e) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
    }

    if (schemaErrors || containerNumError) {
      setNewContainerErrors({
        ...(schemaErrors ?? {}),
        ...(containerNumError ? { 194: containerNumError } : {}),
      });
      return false;
    }

    setNewContainerErrors(false);
    return true;
  };

  const validateNewChassis = async (data: any): Promise<boolean> => {
    let schemaErrors: Record<string, string> | null = null;

    try {
      const newChassisSchema = getNewChassisSchema(data.inTransit);
      await newChassisSchema.validate(data, { abortEarly: false });
    } catch (e) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
    }

    if (schemaErrors) {
      setNewChassisErrors(schemaErrors);
      return false;
    }

    setNewChassisErrors(false);
    return true;
  };

  const validateNewTruck = async (data: any): Promise<boolean> => {
    let schemaErrors: Record<string, string> | null = null;

    try {
      const newTruckSchema = getNewTruckSchema();
      await newTruckSchema.validate(data, { abortEarly: false });
    } catch (e) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
    }

    if (schemaErrors) {
      setNewTruckErrors(schemaErrors);
      return false;
    }

    setNewTruckErrors(false);
    return true;
  };

  const validateNewDriver = async (data: any): Promise<boolean> => {
    let schemaErrors: Record<string, string> | null = null;

    try {
      const newDriverSchema = getNewDriverSchema();
      await newDriverSchema.validate(data, { abortEarly: false });
    } catch (e) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
      console.log("driver errors", schemaErrors);
    }

    if (schemaErrors) {
      setNewDriverErrors(schemaErrors);
      return false;
    }

    setNewDriverErrors(false);
    return true;
  };

  const validateNewGenset = async (data: any): Promise<boolean> => {
    let schemaErrors: Record<string, string> | null = null;

    try {
      const newGensetSchema = getNewGensetSchema(data.inTransit);
      await newGensetSchema.validate(data, { abortEarly: false });
    } catch (e) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
    }

    if (schemaErrors) {
      setNewGensetErrors(schemaErrors);
      return false;
    }

    setNewGensetErrors(false);
    return true;
  };

  const saveNewContainer = async () => {
    const data = newContainer;

    const isValid = await validateNewContainer(data);
    if (!isValid) return;

    setCurrentNewEquipment(2);
    const response = await dispatch(createOtherAsset(data));
  };

  const saveNewChassis = async () => {
    const data = newChassis;

    const isValid = await validateNewChassis(data);
    if (!isValid) return;

    setCurrentNewEquipment(1);
    const response = await dispatch(createOtherAsset(data));
  };

  const saveNewGenset = async () => {
    const data = newGenset;

    const isValid = await validateNewGenset(data);
    if (!isValid) return;

    setCurrentNewEquipment(3);
    const response = await dispatch(createOtherAsset(data));
  };

  const saveNewTruckAndDriver = async (): Promise<void> => {
    setNewDriverErrors(false);
    setNewTruckErrors(false);

    const data1 = newTruck;
    const data2 = newDriver;

    const driverFirstNameEntered = data2[195] !== "" && data2[195] !== null;
    const driverLastNameEntered = data2[196] !== "" && data2[196] !== null;
    const driverLicenseEntered = data2[194] !== "" && data2[194] !== null;

    const truckPlateEntered = data1[194] !== "" && data1[194] !== null;
    const truckColorEntered = data1[203] !== "" && data1[203] !== null;

    const truckWasEntered = truckPlateEntered || truckColorEntered;
    const driverWasEntered = driverFirstNameEntered || driverLastNameEntered || driverLicenseEntered;

    if (truckWasEntered && driverWasEntered) {
      console.log("both entered");
      const truckValidated = await validateNewTruck(data1);
      console.log("truckValidated", truckValidated);
      const driverValidated = await validateNewDriver(data2);
      console.log("driverValidated", driverValidated);

      if (truckValidated && driverValidated) {
        setCurrentNewEquipment(4);
        const data = { ...data1, relatedAsset: { ...data2 } };
        await dispatch(createRelatedOtherAssets(data));
      }
    } else if (truckWasEntered && !driverWasEntered) {
      console.log("truck entered");
      const truckValidated = await validateNewTruck(data1);

      if (truckValidated) {
        setCurrentNewEquipment(4);
        const data = { ...data1 };
        await dispatch(createOtherAsset(data));
      }
    } else if (!truckWasEntered && driverWasEntered) {
      console.log("driver entered");
      const driverValidated = await validateNewDriver(data2);
      console.log("driverValidated", driverValidated);

      if (driverValidated) {
        setCurrentNewEquipment(5);
        const data = { ...data2 };
        await dispatch(createOtherAsset(data));
      }
    } else {
      setShowErrorModal(true);
      setErrorMessage("No Truck or Driver was entered!");
    }
  };

  //#region REQUEST save
  const saveNewRequest = async () => {
    if (!newRequest) return

    let schemaErrors: Record<string, string> | null = null;
    setNewRequestErrors({})

    const nextDraft = structuredClone(newRequest)
    const isTripRequest = nextDraft.requestDetails.requestTypeId === 1526;
    const containerIsEmpty = nextDraft.requirements[0].containerSizeId === null;
    const chassisIsEmpty = nextDraft.requirements[0].chassisSizeId === null;
    const gensetIsEmpty = nextDraft.requirements[0].genset === 0;

    try {
      const schema = getRequestSchema(isTripRequest)
      await schema.validate(nextDraft, { abortEarly: false })
    } catch (e: any) {
      schemaErrors = yupToErrorMap(e as yup.ValidationError);
    }

    console.log("request errors", schemaErrors);

    if (schemaErrors) {
      setNewRequestErrors(schemaErrors);
      return;
    }

    if (containerIsEmpty && chassisIsEmpty && gensetIsEmpty) {
      setErrorMessage('Request is empty. Please add at least one container, chassis, or genset.');
      setShowErrorModal(true);
      return;
    } 

    await dispatch(saveEquipmentRequest(nextDraft)).unwrap().then((resp) => {
      console.log("equipment request POST resp: ", resp);
      console.log("resp.requirements[0].requestId: ", resp.requirements[0].requestId);
      const equipmentRequestId = resp.requestDetails.equipmentRequestId
      const requirement = resp.requirements[0]
      const requestId = resp.requirements[0].requestId

      const cReq = requirement.containerSizeId;
      const chReq = requirement.chassisSizeId;
      const gReq = requirement.genset;

      const blockedContainer = !isValidNumber(cReq);
      const blockedChassis = !isValidNumber(chReq);
      const blockedGenset = !isValidNumber(gReq) || gReq === 0;

      const requestClientId = resp.requestDetails.clientId;
      const chassisOwner = requirement.equipmentClientChassis === 1 ? requestClientId : null;
      const containerOwner = requirement.equipmentClientContainer === 1 ? requestClientId : null;
      const gensetOwner = requirement.equipmentClientGenset === 1 ? requestClientId : null;

      const containerModule = 44;
      const chassisModule = chassisOwner === null ? null : chassisOwner === 20 ? 24 : 44;
      const gensetModule = gensetOwner === null ? null : gensetOwner === 20 ? 25 : 44;
      
      dispatch(loadUnassignedRequirementsList());
      setShowSuccessModal(true)
      setSuccessMessage('Equipment request created successfully.')
      setGate((prev: any) => ({
        ...prev,
        equipmentRequestId, 
        requestId,
        requirementSize: {
          containerSize: requirement.containerSize?.sizeType ?? null,
          chassisSize: requirement.chassisSize?.sizeType ?? null,
          genset: requirement.genset === 1 ? 1 : 0,
        },
        requiredOwner: {
          chassisOwner,
          chassisModule,
          containerOwner,
          containerModule,
          gensetOwner,
          gensetModule,
        },
      }));
      setContainerData((prev: any) => ({ ...prev, showEquipment: blockedContainer ? 0 : 1 }));
      setChassisData((prev: any) => ({ ...prev, showEquipment: blockedChassis ? 0 : 1 }));
      setGensetData((prev: any) => ({ ...prev, showEquipment: blockedGenset ? 0 : 1 }));
      showCreateForm(5, false);
      setNewRequest(newEquipmentRequestObj);
    }).catch((error) => {
      console.log("equipment request POST error: ", error);
      setShowErrorModal(true);
      setErrorMessage(error);
    })
  }

  const isValidNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

  type ErrorMap = Record<string, string>;
  type ErrorsState = Record<string, ErrorMap>;

  const validateChecklistParams = (data: any, gate: any): ErrorMap => {
    const { clientId, sizeEquipmentId, equipmentType, gensetTypeId, equipmentTypeId } = data || {};
    const EquipmentTypeId = isValidNumber(equipmentTypeId) ? equipmentTypeId : equipmentType;

    const errors: ErrorMap = {};

    const isGenset = EquipmentTypeId === 3;

    if (!clientId) errors.clientId = "Client ID is required";
    if (!gate?.depotId) errors.depotId = "Depot ID is required";
    if (!gate?.gateTypeId) errors.gateTypeId = "Gate Type ID is required";
    if (isGenset && !gensetTypeId) errors.gensetTypeId = "Genset Type ID is required";
    if (!isGenset && !sizeEquipmentId) errors.sizeEquipmentId = "Equipment Size ID is required";

    return errors;
  };

  const prepareChecklistFields = (checklist: Checklist): Checklist => {
    return {
      ...checklist,
      equipmentParts: (checklist.equipmentParts ?? []).map((part) => ({
        ...part,
        partSections: (part.partSections ?? []).map((section) => ({
          ...section,
          conditionId: "conditionId" in section ? section.conditionId ?? null : null,
          remarks: "remarks" in section ? section.remarks ?? null : null,
        })),
      })),
    };
  };

  const handleChangeChecklist = useCallback(
    (
      e: ChangeEvt,
      partId: number,
      sectionId: number,
      type: "conditionId" | "remarks",
      kind: KindOfChecklist
    ) => {
      const value = e.target.value;

      const okStatusId =
        conditionTypesList.find((c: AttributeItem) => c.name?.toLowerCase() === "ok")?.attributeItemId ?? null;

      const damageStatusId =
        conditionTypesList.find((c: AttributeItem) => c.name?.toLowerCase() === "damaged")?.attributeItemId ?? null;

      if (okStatusId == null || damageStatusId == null) return;

      const [checkList, setCheckList, setDamage] =
        kind === "container"
          ? [containerCheckList, setContainerCheckList, setContainerDamage]
          : kind === "chassis"
          ? [chassisCheckList, setChassisCheckList, setChassisDamage]
          : [gensetCheckList, setGensetCheckList, setGensetDamage];

      if (!checkList?.equipmentParts?.length) return;

      const partIndex = checkList.equipmentParts.findIndex((p: any) => p.equipmentPartId === partId);
      if (partIndex === -1) return;

      const part = checkList.equipmentParts[partIndex];

      const sectionIndex = part.partSections.findIndex((s: any) => {
        if ("partSectionId" in s && s.partSectionId === sectionId) return true;
        if ("sectionId" in s && s.sectionId === sectionId) return true;
        return false;
      });

      if (sectionIndex === -1) return;

      const currentSection = part.partSections[sectionIndex];
      const resolvedSectionId =
        "partSectionId" in currentSection && currentSection.partSectionId != null
          ? currentSection.partSectionId
          : (currentSection.sectionId as number);

      const nextSection: ChecklistSection =
        type === "conditionId"
          ? { ...currentSection, conditionId: value === "" ? null : parseInt(value, 10) }
          : { ...currentSection, remarks: value };

      const nextChecklist: Checklist = {
        ...checkList,
        equipmentParts: checkList.equipmentParts.map((p: any, pi: number) =>
          pi !== partIndex
            ? p
            : {
                ...p,
                partSections: p.partSections.map((s: any, si: number) => (si !== sectionIndex ? s : nextSection)),
              }
        ),
      };

      setCheckList(nextChecklist);

      setDamage((prev: DamageDataRow[]) => {
        const updated = [...(prev ?? [])];
        const existingIdx = updated.findIndex((d) => d.partId === part.equipmentPartId && d.sectionId === resolvedSectionId);

        const parsed = type === "conditionId" ? parseInt(value, 10) : NaN;

        if (type === "conditionId" && parsed === okStatusId && existingIdx > -1) {
          updated.splice(existingIdx, 1);
        } else if (type === "conditionId" && parsed === damageStatusId) {
          if (existingIdx > -1) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              remarks: nextSection.remarks,
              damageType: damageStatusId,
            };
          } else {
            updated.push({
              damageType: damageStatusId,
              partName: part.partName,
              partId: part.equipmentPartId,
              sectionId: resolvedSectionId,
              sectionName: nextSection.code,
              remarks: nextSection.remarks,
            });
          }
        } else if (type === "remarks" && existingIdx > -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            remarks: nextSection.remarks,
          };
        }
        return updated;
      });

      setErrors((prev: any) => {
        const key = `checkListData.equipmentParts[${partIndex}].partSections[${sectionIndex}].${type}`;
        const containerErrors = { ...(prev?.containerErrors ?? {}) };
        delete containerErrors[key];

        return {
          ...prev,
          containerErrors,
        };
      });
    },
    [
      conditionTypesList,
      containerCheckList,
      chassisCheckList,
      gensetCheckList,
      setContainerCheckList,
      setChassisCheckList,
      setGensetCheckList,
      setContainerDamage,
      setChassisDamage,
      setGensetDamage,
      setErrors,
    ]
  );

  const handleChangeContainerChecklist = (e: any, partId: number, sectionId: number, type: "conditionId" | "remarks") => {
    handleChangeChecklist(e, partId, sectionId, type, "container");
  };

  const handleChangeChassisChecklist = (e: any, partId: number, sectionId: number, type: "conditionId" | "remarks") => {
    handleChangeChecklist(e, partId, sectionId, type, "chassis");
  };

  const handleChangeGensetChecklist = (e: any, partId: number, sectionId: number, type: "conditionId" | "remarks") => {
    handleChangeChecklist(e, partId, sectionId, type, "genset");
  };

  const validateLoadChecklist = (data: any, errorType: string) => {
    const nextErrors = validateChecklistParams(data, gate);

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev: any) => ({
        ...prev,
        [errorType]: nextErrors,
      }));
      return;
    }

    setErrors((prev: any) => ({
      ...prev,
      [errorType]: {},
    }));

    const { clientId, equipmentType, equipmentTypeId, ownedEquipment } = data || {};
    const { depotId, gateTypeId } = gate || {};

    const EquipmentTypeId = isValidNumber(equipmentTypeId) ? equipmentTypeId : equipmentType;
    const sizeTypeId = EquipmentTypeId === 3 ? data?.gensetTypeId : data?.sizeEquipmentId;

    if (
      isValidNumber(clientId) &&
      isValidNumber(depotId) &&
      isValidNumber(gateTypeId) &&
      isValidNumber(EquipmentTypeId) &&
      isValidNumber(sizeTypeId)
    ) {
      dispatch(
        loadChecklist({
          clientId,
          depotId,
          gateId: gate.gateTypeId,
          equipmentType: EquipmentTypeId,
          equipmentSizeId: sizeTypeId,
          ownedEquipment: ownedEquipment ?? 0,
        })
      );
    }
  };

  const getChecklistParams = (equipmentTypeId: 1 | 2 | 3, data: any) => {
    const clientId = data?.clientId;
    const depotId = gate?.depotId;
    const gateTypeId = gate?.gateTypeId;
    const ownedEquipment = data?.ownedEquipment ?? 0;

    const sizeTypeId = equipmentTypeId === 3 ? data?.gensetTypeId : data?.sizeEquipmentId;

    const ok =
      isValidNumber(clientId) && isValidNumber(depotId) && isValidNumber(gateTypeId) && isValidNumber(sizeTypeId);

    if (!ok) return null;

    return {
      clientId,
      depotId,
      gateId: gateTypeId,
      equipmentType: equipmentTypeId,
      equipmentSizeId: sizeTypeId,
      ownedEquipment,
    };
  };

  useEffect(() => {
    const equipmentTypeId: 2 = 2;
    const params = getChecklistParams(equipmentTypeId, containerData);

    if (!params) {
      dispatch(cleanChecklist({ equipmentTypeId }));
      return;
    }

    dispatch(loadChecklist(params));
  }, [
    dispatch,
    gate?.equipmentId,
    gate?.depotId,
    gate?.gateTypeId,
    containerData?.clientId,
    containerData?.sizeEquipmentId,
    containerData?.ownedEquipment,
  ]);

  useEffect(() => {
    const equipmentTypeId: 1 = 1;
    const params = getChecklistParams(equipmentTypeId, chassisData);

    if (!params) {
      dispatch(cleanChecklist({ equipmentTypeId }));
      return;
    }

    dispatch(loadChecklist(params));
  }, [
    dispatch,
    gate?.equipmentId,
    gate?.depotId,
    gate?.gateTypeId,
    chassisData?.clientId,
    chassisData?.sizeEquipmentId,
    chassisData?.ownedEquipment,
  ]);

  useEffect(() => {
    const equipmentTypeId: 3 = 3;
    const params = getChecklistParams(equipmentTypeId, gensetData);

    if (!params) {
      dispatch(cleanChecklist({ equipmentTypeId }));
      return;
    }

    dispatch(loadChecklist(params));
  }, [
    dispatch,
    gate?.equipmentId,
    gate?.depotId,
    gate?.gateTypeId,
    gensetData?.clientId,
    gensetData?.gensetTypeId,
    gensetData?.ownedEquipment,
  ]);

  type GateDetail = {
    equipmentTypeId: number;
    [key: string]: any;
  };

  type GatesShape = {
    depotId?: number | null;
    gateTypeId?: number | null;
    gateDetails: GateDetail[];
    [key: string]: any;
  };

  const findDetailIndexByEquipmentType = (gateDetails: GateDetail[], equipmentType: number) =>
    gateDetails.findIndex((d) => d.equipmentTypeId === equipmentType);

  const validateLoadHaulage = useCallback(
    (lastTripClientId: number | null | undefined) => {
      const { clientId, sizeEquipmentId } = containerData ?? {};
      const { depotId, gateTypeId } = gate ?? {};

      if (
        isValidNumber(clientId) &&
        isValidNumber(depotId) &&
        isValidNumber(gateTypeId) &&
        isValidNumber(sizeEquipmentId) &&
        isValidNumber(lastTripClientId)
      ) {
        dispatch(
          loadHaulage({
            clientId,
            tripClientId: lastTripClientId,
            depotId,
            gateTypeId,
            containerSizeId: sizeEquipmentId,
          })
        );
      }
    },
    [containerData, gate]
  );

  const handleChange = useCallback(
    (e: ChangeEvt, equipmentType: number) => {
      const { name, value } = e.target;

      setGate((prevGates: GatesShape) => {
        const gateDetails = prevGates?.gateDetails ?? [];
        const idx = findDetailIndexByEquipmentType(gateDetails, equipmentType);

        if (idx !== -1) {
          const nextDetails = gateDetails.map((d, i) =>
            i === idx ? { ...d, [name]: value, equipmentTypeId: equipmentType } : d
          );

          return { ...prevGates, gateDetails: nextDetails };
        }

        const newDetail: GateDetail = { equipmentTypeId: equipmentType, [name]: value };
        return { ...prevGates, gateDetails: [...gateDetails, newDetail] };
      });

      if (name === "depotId" || name === "gateTypeId") {
        const parsed = value === "" ? null : parseInt(value, 10);

        setGate((prevGates: GatesShape) => ({
          ...prevGates,
          [name]: parsed,
        }));

        setContainerData((prev: any) => ({
          ...prev,
          haulage: null,
        }));
      }
    },
    [setGate, setContainerData, validateLoadHaulage, lastInfoTrip?.clientId]
  );

  const handleChangeContainer = useCallback(
    async (e: OnChangeEvt<ContainerAutoSuggestData>, equipmentTypeId: number) => {
      console.log("handleChangeContainer", e);
      const { name, value } = e.target;
      let parsedValue: any = value;

      const noValue = value === "" || value === null || value === undefined;

      if (["sizeEquipmentId", "clientId", "equipmentId"].includes(name)) {
        parsedValue = noValue ? null : Number(value);
      }

      if (["showEquipment", "loaded"].includes(name)) {
        parsedValue = containerData[name] === 1 ? 0 : 1;
      }

      let updatedContainerData: any = {
        ...containerData,
        [name]: parsedValue,
        equipmentType: equipmentTypeId,
      };

      if (name === "") {
        setNewContainer((prev: any) => ({ ...prev, ["194"]: value }));
      }

      if (name === "showEquipment" && gateType === "OUT") return;

      if (name === "ownedEquipment") {
        updatedContainerData.ownedEquipment = containerData.ownedEquipment === 1 ? 0 : 1;
        updatedContainerData.equipmentId = null;
        updatedContainerData.sizeEquipmentId = null;
        updatedContainerData.clientId = parsedValue === 1 ? 20 : null;

        dispatch(cleanChecklist({ equipmentTypeId }));
      } else if (name === "clientId" && parsedValue === 20) {
        updatedContainerData.ownedEquipment = 1;
      }

      if (name === "equipmentId" && noValue) {
        updatedContainerData.ownedEquipment = 0;
        updatedContainerData.equipmentId = null;
        updatedContainerData.clientId = null;
        updatedContainerData.sizeEquipmentId = null;
        updatedContainerData.haulage = null;

        setContainerDamage([]);
        dispatch(cleanChecklist({ equipmentTypeId }));
      }

      if (name === "equipmentId" && !noValue) {
        const detail = e.target.data.details;
        console.log("cnt e.target.data.details", e);
        if (detail) {
          const oeq = Number(detail.equipment_owner_id) === 20 ? 1 : 0;
          updatedContainerData = {
            ...updatedContainerData,
            clientId: parseInt(detail.equipment_owner_id, 10),
            sizeEquipmentId: parseInt(detail.equipment_size_id, 10),
            ownedEquipment: oeq,
          };
        }
      }

      setContainerData(updatedContainerData);

      if (["sizeEquipmentId", "clientId", "ownedEquipment", "equipmentId"].includes(name)) {
        setContainerDamage([]);

        validateLoadHaulage(lastInfoTrip?.clientId);

        const filteredParts = filterPartsByEquipmentTypeIdAndSize(
          partsList,
          updatedContainerData.equipmentType,
          updatedContainerData.sizeEquipmentId
        );

        setContainerParts(filteredParts);
      }
    },
    [
      containerData,
      gateType,
      partsList,
      lastInfoTrip,
      setContainerData,
      setContainerDamage,
      setNewContainer,
      setContainerParts,
      validateLoadChecklist,
      validateLoadHaulage,
      filterPartsByEquipmentTypeIdAndSize,
    ]
  );

  const handleChangeChassis = useCallback(
    async (e: OnChangeEvt<ChassisAutoSuggestData>, equipmentTypeId: number) => {
      const { name, value } = e.target;

      if (name === "") {
        setNewChassis((prev: any) => ({ ...prev, ["194"]: value }));
      }

      if (name === "showEquipment" && gateType === "OUT") return;

      let parsedValue: any = value;
      if (["sizeEquipmentId", "clientId", "equipmentId"].includes(name)) {
        parsedValue = value === "" || value === null || value === undefined ? null : parseInt(value as any, 10);
      }

      if (["inTransit", "showEquipment", "ownedEquipment"].includes(name)) {
        parsedValue = chassisData[name] === 1 ? 0 : 1;
      }

      let updatedChassisData: any = {
        ...chassisData,
        [name]: parsedValue,
        equipmentType: equipmentTypeId,
      };

      if (name === "ownedEquipment") {
        updatedChassisData.ownedEquipment = parsedValue;
        updatedChassisData.equipmentId = null;
        updatedChassisData.sizeEquipmentId = null;
        updatedChassisData.subdivision_id = null;
        updatedChassisData.clientId = parsedValue === 1 ? 20 : null;

        if (parsedValue === 1) {
          updatedChassisData.inTransit = 0;
        }

        dispatch(cleanChecklist({ equipmentTypeId }));
      } else if (name === "clientId" && parsedValue === 20) {
        updatedChassisData.ownedEquipment = 1;
      } else if (name === "inTransit" && parsedValue === 1) {
        updatedChassisData.ownedEquipment = 0;
        updatedChassisData.subdivision_id = null;
        updatedChassisData.equipmentId = null;
        updatedChassisData.sizeEquipmentId = null;
        updatedChassisData.clientId = null;
        setChassisCheckList((prev: any) => ({ ...prev, rejected: false }));
        dispatch(cleanChecklist({ equipmentTypeId }));
      } else if (name === "inTransit" && parsedValue === 0) {
        updatedChassisData.subdivision_id = null;
        updatedChassisData.equipmentId = null;
        updatedChassisData.sizeEquipmentId = null;
        updatedChassisData.clientId = null;

        dispatch(cleanChecklist({ equipmentTypeId }));
      }

      if (name === "equipmentId" && (value === "" || value === null || value === undefined)) {
        updatedChassisData.equipmentId = null;
        updatedChassisData.sizeEquipmentId = null;
        updatedChassisData.subdivision_id = null;
        updatedChassisData.clientId = null;
        updatedChassisData.ownedEquipment = 0;
        updatedChassisData.inTransit = 0;
        dispatch(cleanChecklist({ equipmentTypeId }));
      }

      if (name === "equipmentId" && value !== undefined) {
        const detail = e.target.data.details;
        if (detail) {
          updatedChassisData.sizeEquipmentId = parseInt(detail.equipment_size_id, 10);

          const subdivisionIsNULL = detail.subdivisionId === null;
          const subdivisionIsNotNull = detail.subdivisionId !== null && typeof detail.subdivisionId === "number";

          const chassisNotOwned = detail.moduleid === 44;
          const chassisIsOwned = detail.moduleid === 24;

          if (subdivisionIsNULL && chassisNotOwned) {
            updatedChassisData.subdivision_id = null;
            updatedChassisData.clientId = parseInt(detail.client, 10);
            updatedChassisData.inTransit = 0;
            updatedChassisData.ownedEquipment = 0;
          }

          if (subdivisionIsNULL && chassisIsOwned) {
            updatedChassisData.subdivision_id = null;
            updatedChassisData.clientId = 20;
            updatedChassisData.ownedEquipment = 1;
            updatedChassisData.inTransit = 0;
          }

          if (subdivisionIsNotNull && chassisNotOwned) {
            updatedChassisData.subdivision_id = detail.subdivisionId;
            updatedChassisData.clientId = null;
            updatedChassisData.inTransit = 1;
            updatedChassisData.ownedEquipment = 0;
          }
        }
      }

      setChassisData(updatedChassisData);

      if (["sizeEquipmentId", "clientId", "ownedEquipment", "equipmentId"].includes(name)) {
        setChassisDamage([]);
      }
    },
    [chassisData, gateType, gate?.gateTypeId, setChassisData, setChassisDamage, setNewChassis]
  );

  const handleChangeGenset = useCallback(
    async (e: OnChangeEvt<GensetAutoSuggestData>, equipmentTypeId: number) => {
      const { name, value } = e.target;

      let parsedValue: any = value;
      const noValue = value === "" || value === null || value === undefined;

      if (name === "") {
        setNewGenset((prev: any) => ({ ...prev, ["194"]: value }));
      }

      if (name === "showEquipment" && gateType === "OUT") return;

      if (["gensetTypeId", "clientId", "equipmentId"].includes(name)) {
        parsedValue = noValue ? null : parseInt(value as any, 10);
      }

      if (["inTransit", "showEquipment", "ownedEquipment"].includes(name)) {
        parsedValue = gensetData[name] === 1 ? 0 : 1;
      }

      let updatedGensetData: any = {
        ...gensetData,
        [name]: parsedValue,
        equipmentType: equipmentTypeId,
      };

      if (name === "ownedEquipment") {
        updatedGensetData.ownedEquipment = parsedValue;
        updatedGensetData.equipmentId = null;
        updatedGensetData.gensetTypeId = null;
        updatedGensetData.clientId = parsedValue === 1 ? 20 : null;
        updatedGensetData.subdivision_id = null;

        if (parsedValue === 1) updatedGensetData.inTransit = 0;

        dispatch(cleanChecklist({ equipmentTypeId }));
      } else if (name === "clientId" && parsedValue === 20) {
        updatedGensetData.ownedEquipment = 1;
      } else if (name === "inTransit" && parsedValue === 1) {
        updatedGensetData.ownedEquipment = 0;
        updatedGensetData.equipmentId = null;
        updatedGensetData.gensetTypeId = null;
        updatedGensetData.clientId = null;
        updatedGensetData.subdivision_id = null;

        dispatch(cleanChecklist({ equipmentTypeId }));
      } else if (name === "inTransit" && parsedValue === 0) {
        updatedGensetData.subdivision_id = null;
        updatedGensetData.equipmentId = null;
        updatedGensetData.gensetTypeId = null;
        updatedGensetData.clientId = null;

        dispatch(cleanChecklist({ equipmentTypeId }));
      }

      if (name === "equipmentId" && noValue) {
        updatedGensetData.equipmentId = null;
        updatedGensetData.gensetTypeId = null;
        updatedGensetData.subdivision_id = null;
        updatedGensetData.clientId = null;
        updatedGensetData.ownedEquipment = 0;

        dispatch(cleanChecklist({ equipmentTypeId }));
      }

      if (name === "equipmentId" && !noValue) {
        //console.log("e.target.data.details", e);
        const detail = e.target.data.details;

        if (detail) {
          const equivalentGensetType: Record<number, number> = {
            1553: 1522, //clip-on
            1554: 1523, //underlag
            1523: 1523, //clip-on
            1522: 1522, //underlag
          };

          const gensetTypeId = detail.genset_type_id;
          const rawTypeId = gensetTypeId === null ? null : parseInt(gensetTypeId, 10);

          updatedGensetData.gensetTypeId =
         (detail.moduleid === 44 && typeof rawTypeId === "number") ? equivalentGensetType[rawTypeId] ?? rawTypeId : rawTypeId;

          const subdivisionIsNULL = detail.subdivisionId === null;
          const subdivisionIsNotNull = detail.subdivisionId !== null;
          const gensetNotOwned = detail.moduleid === 44;
          const gensetIsOwned = detail.moduleid === 25;

          const exaGensetSubdivision = detail.subdivisionId === "45" || detail.subdivisionId === "48";

          if (subdivisionIsNULL && gensetNotOwned) {
            updatedGensetData.subdivision_id = null;
            updatedGensetData.clientId = Number(detail.client);
            updatedGensetData.inTransit = 0;
            updatedGensetData.ownedEquipment = 0;
          }

          if ((subdivisionIsNULL || exaGensetSubdivision) && gensetIsOwned) {
            updatedGensetData.subdivision_id = null;
            updatedGensetData.clientId = 20;
            updatedGensetData.ownedEquipment = 1;
            updatedGensetData.inTransit = 0;
          }

          if (subdivisionIsNotNull && gensetNotOwned) {
            updatedGensetData.subdivision_id = detail.subdivisionId;
            updatedGensetData.clientId = null;
            updatedGensetData.inTransit = 1;
            updatedGensetData.ownedEquipment = 0;
          }
        }
      }

      setGensetData(updatedGensetData);

      if (["gensetTypeId", "clientId", "ownedEquipment", "equipmentId"].includes(name)) {
        setGensetDamage([]);
      }
    },
    [gensetData, gateType, setNewGenset, setGensetData, setGensetDamage]
  );

  const handleChangeTruck = useCallback(
    async (e: any, _equipmentTypeId: number) => {
      const { name, value } = e.target;

      const TRUCK = name === "truckId";
      const DRIVER = name === "driverId";

      const noValue = value === "" || value === null || value === undefined;
      const parsedValue = noValue ? null : parseInt(String(value), 10);

      if (TRUCK && noValue) {
        dispatch(cleanTrip());

        setGate((prev: any) => ({
          ...prev,
          truckId: null,
          tripId: null,
          driverId: null,
        }));

        setContainerData((prev: any) => ({
          ...prev,
          haulage: null,
        }));

        return;
      }

      if (TRUCK && !noValue) {
        dispatch(loadLastTrip({ id: parsedValue as number, filter: "truck" }));

        setGate((prev: any) => ({
          ...prev,
          truckId: parsedValue,
          tripId: null,
          driverId: null,
        }));

        return;
      }

      if (DRIVER && noValue) {
        setGate((prev: any) => ({
          ...prev,
          driverId: null,
        }));
        return;
      }

      setGate((prev: any) => ({
        ...prev,
        [name]: parsedValue,
      }));
    },
    [dispatch]
  );

  const handleChangeNewAsset = useCallback(
    (e: ChangeEvt, assetTypeId: number | null = null) => {
      const { name, value } = e.target;
      const numericValues = [125, 134, 197, 201, 202, 203, 214, 225, 222, 223];

      if (name === "") return;

      const isNumericField = numericValues.includes(Number(name));
      let nextValue: any = isNumericField ? parseInt(value, 10) : value;

      switch (assetTypeId) {
        case 1: // chassis
          setNewChassis((prev: any) => {
            const next = { ...prev, [name]: nextValue };

            if (name === "inTransit") {
              next.inTransit = prev.inTransit === 0 ? 1 : 0;
              const checked = next.inTransit === 1;

              if (checked) {
                next["223"] = null;
              } else {
                next.subdivision_id = null;
              }
            }

            if (Number(name) === 223) next.subdivision_id = null;
            if (name === "subdivision_id") next["223"] = null;

            return next;
          });
          break;

        case 2: // container
          if (name === "194") {
            if (value.length > 11) return;

            const errorFound = validateContainerNumKey(value);
            setNewContainerErrors(errorFound ? { 194: errorFound } : {});
          }

          setNewContainer((prev: any) => ({ ...prev, [name]: nextValue }));
          break;

        case 3: // genset
          setNewGenset((prev: any) => {
            const next = { ...prev, [name]: nextValue };

            if (name === "inTransit") {
              next.inTransit = prev.inTransit === 0 ? 1 : 0;
              const checked = next.inTransit === 1;

              if (checked) {
                next["223"] = null;
              } else {
                next.subdivision_id = null;
              }
            }

            if (Number(name) === 223) next.subdivision_id = null;
            if (name === "subdivision_id") next["223"] = null;

            return next;
          });
          break;

        case 4: // truck
          setNewTruck((prev: any) => ({ ...prev, [name]: nextValue }));
          break;

        case 5: // driver
          setNewDriver((prev: any) => ({ ...prev, [name]: nextValue }));
          break;

        default:
          break;
      }
    },
    [
      setNewChassis,
      setNewContainer,
      setNewGenset,
      setNewTruck,
      setNewDriver,
      setNewContainerErrors,
      validateContainerNumKey,
    ]
  );

  const handleChangeRequest = async (name: string, value: string) => {
    console.log("handleChangeRequest", name, value);
      if (!newRequest) return
  
      const next = structuredClone(newRequest)
  
      const isId = name.toLowerCase().endsWith('id')
      const isWorkOrderId = name === 'workOrderId'
      const tripAttrId = 1526;
      const PLACEHOLDER = "Select Trip...";
  
      let nextValue: any = value
  
      if (isWorkOrderId) {
        // only digits
        nextValue = value.replace(/[^0-9]/g, '')
        next.requestDetails.workOrderId = nextValue === '' ? null : Number(nextValue)
        if (next.requestDetails.workOrderId) {
          await dispatch(loadAssignedTrips(next.requestDetails.workOrderId)).unwrap().catch(() => null)
        }
        // reset trips on work order change
        next.requirements = next.requirements.map((r: any) => ({ ...r, tripId: null, triplabel: PLACEHOLDER }))
      } else if (isId) {
        nextValue = value === '' ? null : Number(value)
        ;(next.requestDetails as any)[name] = nextValue
  
        // if switching away from trip request: clear trips
        if (name === 'requestTypeId' && tripAttrId && nextValue !== tripAttrId) {
          next.requirements = next.requirements.map((r: any) => ({ ...r, tripId: null, triplabel: PLACEHOLDER }))
        }
      } else {
        ;(next.requestDetails as any)[name] = value
      }
  
      setNewRequest(next)
  }

  const setSingleColumnValue = (sizeKey: string, sizeValue: string, labelKey: string, label: string) => {
      if (!newRequest) return
      const next = structuredClone(newRequest)
      next.requirements = next.requirements.map((r: any) => {
        if ((r as any)[labelKey] === PLACEHOLDER) {
          ;(r as any)[sizeKey] = sizeValue === '' ? null : Number(sizeValue)
          ;(r as any)[labelKey] = label
        }
        return r
      })
      setNewRequest(next)
    }

  const handleChangeRequirement = (field: string, value: string) => {
      if (!newRequest) return
  
      const next = structuredClone(newRequest)
      const row = next.requirements[0]
      if (!row) return
  
      const nextValue = value === '' ? null : Number(value);
      (row as any)[field] = nextValue
  
      setNewRequest(next)
    }

  // inside your React FC

const resetRequestDetails = (): void => {
  setGate((prev: any) => ({
    ...prev,
    equipmentRequestId: null,
    requestId: null,
    requestClientId: null,
    requirementSize: {
      containerSize: null,
      chassisSize: null,
      genset: null,
    },
    requiredOwner: {
      chassisOwner: null,
      chassisModule: null,
      containerOwner: null,
      containerModule: null,
      gensetOwner: null,
      gensetModule: null,
    },
  }));
};

const resetContainerSelection = () => {
  setContainerDamage([]);
  setContainerData((prev: any) => ({
    ...prev,
    equipmentId: null,
    ownedEquipment: 0,
    clientId: null,
    sizeEquipmentId: null,
    haulage: null,
    // keep showEquipment as-is here, or set to 0 if you want
  }));
  dispatch(cleanChecklist({ equipmentTypeId: 2 }));
};

const resetChassisSelection = () => {
  setChassisData((prev: any) => ({
    ...prev,
    equipmentId: null,
    equipmentType: null,
    sizeEquipmentId: null,
    subdivision_id: null,
    clientId: null,
    ownedEquipment: 0,
    inTransit: 0,
  }));
  dispatch(cleanChecklist({ equipmentTypeId: 1 }));
};

const resetGensetSelection = () => {
  setGensetData((prev: any) => ({
    ...prev,
    equipmentId: null,
    gensetTypeId: null,
    subdivision_id: null,
    clientId: null,
    ownedEquipment: 0,
  }));
  dispatch(cleanChecklist({ equipmentTypeId: 3 }));
};

const blockEquimentForms = (): void => {
    setChassisData((prev: any) => ({ ...prev, showEquipment: 0 }));
    setContainerData((prev: any) => ({ ...prev, showEquipment: 0 }));
    setGensetData((prev: any) => ({ ...prev, showEquipment: 0 }));
}

const resetEquipmentSelection = () => {
  resetChassisSelection();
  resetContainerSelection();
  resetGensetSelection();
  blockEquimentForms();
};

  const handleRequestSelection = (value: string): void => {
  console.log("handleRequestSelection value", value);
  resetEquipmentSelection();

  if (value === "") {
    resetRequestDetails();
    //resetEquipmentSelection();
    return; // matches the intent of your original logic
  }

  const exaPool = [20, 21, 36];

  const selectedId = Number.parseInt(value, 10);
  const list = isEdit ? requests : (unassignedResquests ?? []);
  const selectedRequest = list.find((er:any) => er.equipmentRequestId === selectedId);


  // if nothing found, safely reset and exit
  if (!selectedRequest) {
    resetRequestDetails();
    //resetEquipmentSelection();
    return;
  }

  const requestClientId = selectedRequest.clientId;
  const ownedEquipment = exaPool.includes(requestClientId);

  setGate((prev: any) => ({
    ...prev,
    equipmentRequestId: Number.isNaN(selectedId) ? null : selectedId,
    requestClientId: ownedEquipment ? 20 : requestClientId,
    requestId: null,
    requirementSize: {
      containerSize: null,
      chassisSize: null,
      genset: null,
    },
    requiredOwner: {
      chassisOwner: null,
      chassisModule: null,
      containerOwner: null,
      containerModule: null,
      gensetOwner: null,
      gensetModule: null,
    },
  }));

  //resetEquipmentSelection(); // keep commented if you want same behavior
};


const handleRequerimentsSelection = (value: string): void => {
  console.log("handle Requeriments Selection value", value);

  // 1) Always clear equipment selection first
  resetEquipmentSelection();

  const selectedId = Number.parseInt(value, 10);

  // 2) Handle empty selection
  if (value === "" || Number.isNaN(selectedId)) {
    resetRequestDetails();
    return;
  }

  // 3) Save selected requirement id in gate
  setGate((prev: any) => ({
    ...prev,
    requestId: selectedId,
  }));

  // 4) Find the requirement
  const selectedRequirement =
    (unassignedResquests ?? [])
      .flatMap((er: any) => er.requirements ?? [])
      .find((r: any) => r.requestId === selectedId) ?? null;

  // 5) If not found, clear requirement size fields and exit
  if (!selectedRequirement) {
    setGate((prev: any) => ({
      ...prev,
      requirementSize: {
        ...(prev.requirementSize ?? {}),
        containerSize: null,
        chassisSize: null,
        genset: null,
      },
    }));
    return;
  }

  // 6) Compute blocking flags
  const cReq = selectedRequirement.containerSizeId;
  const chReq = selectedRequirement.chassisSizeId;
  const gReq = selectedRequirement.genset;

  const blockedContainer = !isValidNumber(cReq);
  const blockedChassis = !isValidNumber(chReq);
  const blockedGenset = !isValidNumber(gReq) || gReq === 0;

  // 7) IMPORTANT: only toggle showEquipment using functional updates,
  //    do NOT spread stale containerData/chassisData/gensetData variables here.
  setContainerData((prev: any) => ({ ...prev, showEquipment: blockedContainer ? 0 : 1 }));
  setChassisData((prev: any) => ({ ...prev, showEquipment: blockedChassis ? 0 : 1 }));
  setGensetData((prev: any) => ({ ...prev, showEquipment: blockedGenset ? 0 : 1 }));

  // 8) Owner/module logic (read requestClientId from gate safely)
  const requestClientId = gate?.requestClientId ?? null;

  const chassisOwner = selectedRequirement.equipmentClientChassis === 1 ? requestClientId : null;
  const containerOwner = selectedRequirement.equipmentClientContainer === 1 ? requestClientId : null;
  const gensetOwner = selectedRequirement.equipmentClientGenset === 1 ? requestClientId : null;

  const containerModule = 44;

  const chassisModule =
    chassisOwner === null ? null : chassisOwner === 20 ? 24 : 44;

  const gensetModule =
    gensetOwner === null ? null : gensetOwner === 20 ? 25 : 44;

  // 9) Update gate requirement size + required owners
  setGate((prev: any) => ({
    ...prev,
    requirementSize: {
      containerSize: selectedRequirement.containerSize?.sizeType ?? null,
      chassisSize: selectedRequirement.chassisSize?.sizeType ?? null,
      genset: selectedRequirement.genset === 1 ? 1 : 0,
    },
    requiredOwner: {
      chassisOwner,
      chassisModule,
      containerOwner,
      containerModule,
      gensetOwner,
      gensetModule,
    },
  }));
};

  /* --------------------------- Display Existing Gate -------------------------- */

  const displayExistingGateData = useCallback((details: any[]) => {
    const containerTypeId = 2;
    const chassisTypeId = 1;
    const gensetTypeId = 3;

    let _containerCheckList: any = { equipmentParts: [] };
    let _chassisCheckList: any = { equipmentParts: [] };
    let _gensetCheckList: any = { equipmentParts: [] };

    let _containerData: any = {};
    let _chassisData: any = {};
    let _gensetData: any = {};

    let _containerDamage: any[] = [];
    let _chassisDamage: any[] = [];
    let _gensetDamage: any[] = [];

    const partsAdded = new Set<number | string>();

    if (details?.length) {
      details.forEach((detail: any) => {
        const damageData = Array.isArray(detail?.gateDamageData) ? detail.gateDamageData : [];

        const normalizedDamages = damageData.map((damage: any) => ({
          ...damage,
          partName: damage?.equipmentPartdId?.partName,
          sectionName: damage?.sectiondId?.code,
          partId: damage?.equipmentPartdId?.equipmentPartId,
        }));

        if (detail?.equipmentTypeId === containerTypeId) {
          _containerData = { ...detail, showEquipment: 1 };
          _containerDamage = normalizedDamages;
        } else if (detail?.equipmentTypeId === chassisTypeId) {
          let next = { ...detail, showEquipment: 1 };

          if (detail?.clientId === null && detail?.subdivisionId !== null) {
            next = { ...next, inTransit: 1, subdivision_id: detail.subdivisionId };
          } else if (detail?.clientId !== null && detail?.subdivisionId === null) {
            next = { ...next, inTransit: 0 };
          }

          _chassisData = next;
          _chassisDamage = normalizedDamages;
        } else if (detail?.equipmentTypeId === gensetTypeId) {
          let next = { ...detail, showEquipment: 1 };

          if (detail?.clientId === null && detail?.subdivisionId !== null) {
            next = { ...next, inTransit: 1, subdivision_id: detail.subdivisionId };
          } else if (detail?.clientId !== null && detail?.subdivisionId === null) {
            next = { ...next, inTransit: 0 };
          }

          _gensetData = next;
          _gensetDamage = normalizedDamages;
        }
      });
    }

    if (details?.length) {
      details.forEach((detail: any) => {
        const checklistArr = Array.isArray(detail?.gateChecklistData) ? detail.gateChecklistData : [];

        checklistArr.forEach((checklistData: any) => {
          const part = checklistData?.equipmentPartd;
          const partId = part?.equipmentPartId;
          if (partId == null) return;

          const pushPart = (target: any) => {
            target.equipmentParts.push({
              description: part?.description,
              equipmentPartId: partId,
              partName: part?.partName,
              partSections: [],
            });
            partsAdded.add(partId);
          };

          if (partsAdded.has(partId)) return;

          if (part?.equipmentTypeId === containerTypeId) pushPart(_containerCheckList);
          else if (part?.equipmentTypeId === chassisTypeId) pushPart(_chassisCheckList);
          else if (part?.equipmentTypeId === gensetTypeId) pushPart(_gensetCheckList);
        });
      });
    }

    if (details?.length) {
      const addSection = (checkListObj: any, partId: any, payload: any) => {
        const idx = checkListObj.equipmentParts.findIndex((p: any) => p?.equipmentPartId === partId);
        if (idx === -1) return;
        checkListObj.equipmentParts[idx].partSections.push(payload);
      };

      details.forEach((detail: any) => {
        const checklistArr = Array.isArray(detail?.gateChecklistData) ? detail.gateChecklistData : [];

        checklistArr.forEach((checklistData: any) => {
          const part = checklistData?.equipmentPartd;
          if (!part) return;

          const sections = Array.isArray(part?.sections_data) ? part.sections_data : [];
          const section = sections.find((s: any) => s?.sectionId === checklistData?.sectionId);
          if (!section) return;

          const sectionDataArr = Array.isArray(checklistData?.checkListBuilderData?.checkListSectionData)
            ? checklistData.checkListBuilderData.checkListSectionData
            : [];

          const instruction = sectionDataArr.find((x: any) => x?.partSectionId === section.sectionId)?.instruction ?? "";

          const payload = {
            sectionId: section.sectionId,
            code: section.code,
            conditionId: checklistData.conditionId,
            instruction,
            remarks: checklistData.remarks,
          };

          const partId = part?.equipmentPartId;

          if (part?.equipmentTypeId === containerTypeId) addSection(_containerCheckList, partId, payload);
          else if (part?.equipmentTypeId === chassisTypeId) addSection(_chassisCheckList, partId, payload);
          else if (part?.equipmentTypeId === gensetTypeId) addSection(_gensetCheckList, partId, payload);
        });
      });
    }

    setGateDetails(details);

    setContainerData(_containerData);
    setChassisData(_chassisData);
    setGensetData(_gensetData);

    setContainerCheckList(_containerCheckList);
    setChassisCheckList(_chassisCheckList);
    setGensetCheckList(_gensetCheckList);

    setContainerDamage(_containerDamage);
    setChassisDamage(_chassisDamage);
    setGensetDamage(_gensetDamage);
  }, []);

  type DamageListName = "containerDamage" | "chassisDamage" | "gensetDamage";

  const handleDamageChange = (e: ChangeEvt, index: number, damageListName: DamageListName) => {
    const { name, value } = e.target;

    console.log("handleDamageChange:", name, value);

    const numericFields = new Set(["damageId"]);
    const nextValue: any = value === "" ? null : numericFields.has(name) ? parseInt(value, 10) : value;

    const update = (setList: React.Dispatch<React.SetStateAction<any[]>>) => {
      setList((prev) => {
        const next = [...(prev ?? [])];
        const currentRow = next[index] ?? {};
        next[index] = { ...currentRow, [name]: nextValue };
        return next;
      });
    };

    switch (damageListName) {
      case "containerDamage":
        update(setContainerDamage);
        break;
      case "chassisDamage":
        update(setChassisDamage);
        break;
      case "gensetDamage":
        update(setGensetDamage);
        break;
    }
  };

  const isCreate = gateId === "new";

useEffect(() => {
    dispatch(clearCurrent());

    // reset local UI
    setGate({});
    setLastInfoTrip({} as any);
    setContainerData({});
    setChassisData({});
    setGensetData({});
    setGateDetails([]);
    setContainerDamage([]);
    setChassisDamage([]);
    setGensetDamage([]);
    setContainerCheckList({ equipmentParts: [] });
    setChassisCheckList({ equipmentParts: [] });
    setGensetCheckList({ equipmentParts: [] });

    if (gateId === "new") {
      const gateTypeId = gateType === "IN" ? 1492 : 1493;
      dispatch(loadDefaultGate({ gateTypeId }));
    } else {
      //#region LOAD GATE BY ID
      dispatch(loadGateById(Number(gateId)));
      dispatch(loadGateImagesData({ id: Number(gateId)}));
    }
  }, [dispatch, gateId, gateType]);


  useEffect(() => {
    const clientId = containerData?.clientId;
    const sizeEquipmentId = containerData?.sizeEquipmentId;
    const depotId = gate?.depotId;
    const gateTypeId = gate?.gateTypeId;
    const lastTripClientId = lastInfoTrip?.clientId;

    if (
      typeof clientId === "number" &&
      typeof sizeEquipmentId === "number" &&
      typeof depotId === "number" &&
      typeof gateTypeId === "number" &&
      typeof lastTripClientId === "number"
    ) {
      dispatch(
        loadHaulage({
          clientId,
          tripClientId: lastTripClientId,
          depotId,
          gateTypeId,
          containerSizeId: sizeEquipmentId,
        })
      );
    }
  }, [
    dispatch,
    gate?.depotId,
    gate?.gateTypeId,
    containerData?.clientId,
    containerData?.sizeEquipmentId,
    lastInfoTrip?.clientId,
  ]);

  useEffect(() => {
  if (!current) return;

  if (gateId !== "new") {
    // edit mode: must match route gateId
    const routeGateId = Number(gateId);
    if (Number(current.gateId) !== routeGateId) return;
  } else {
    // create mode: must match route gateType
    const expectedGateTypeId = gateType === "IN" ? 1492 : 1493;
    if (Number(current.gateTypeId) !== expectedGateTypeId) return;
  }

  setGate(current);

  const details = Array.isArray(current.gateDetails) ? current.gateDetails : [];
  const trip = current?.tripId != null ? current.tripId : null;

  if (gateId !== "new") {
    if (details.length) displayExistingGateData(details);
    if (trip) dispatch(loadLastTrip({ id: trip, filter: "trip" }));
  } else {
    setContainerData(details.find((d: any) => d.equipmentTypeId === 2) ?? {});
    setChassisData(details.find((d: any) => d.equipmentTypeId === 1) ?? {});
    setGensetData(details.find((d: any) => d.equipmentTypeId === 3) ?? {});
  }
}, [current, gateId, gateType, displayExistingGateData, dispatch]);

useEffect(() => {
  console.log("STORE current changed:", current);
}, [current]);

useEffect(() => {
  console.log("RESET+LOAD effect fired", { gateId, gateType });
}, [gateId, gateType]);



  const mergeChecklistWithSaved = (template: any, savedRows: any[]) => {
    const map = new Map<string, { conditionId: any; remarks: any }>();

    (savedRows ?? []).forEach((row: any) => {
      const partId = row?.equipmentPartId ?? row?.equipmentPartd?.equipmentPartId;
      const sectionId = row?.sectionId ?? row?.partSectionId ?? row?.sectiondId?.sectionId;

      if (partId == null || sectionId == null) return;

      map.set(`${partId}:${sectionId}`, {
        conditionId: row?.conditionId ?? null,
        remarks: row?.remarks ?? null,
      });
    });

    return {
      ...template,
      equipmentParts: (template?.equipmentParts ?? []).map((p: any) => ({
        ...p,
        partSections: (p?.partSections ?? []).map((s: any) => {
          const sid = s?.partSectionId ?? s?.sectionId;
          const saved = map.get(`${p.equipmentPartId}:${sid}`);
          if (!saved) return s;

          return {
            ...s,
            conditionId: saved.conditionId,
            remarks: saved.remarks,
          };
        }),
      })),
    };
  };

  useEffect(() => {
    if (!checkListBuilder) return;

    const template = prepareChecklistFields(checkListBuilder as any);

    const savedDetail = Array.isArray(current?.gateDetails)
      ? current.gateDetails.find((d: any) => d?.equipmentTypeId === currentEquipmentTypeId)
      : null;

    const savedRows = Array.isArray(savedDetail?.gateChecklistData) ? savedDetail.gateChecklistData : [];

    const merged = mergeChecklistWithSaved(template, savedRows);

    if (currentEquipmentTypeId === 2) {
      setContainerCheckList(merged);

      const isEditingExistingGate = !!current?.gateId;
      if (!isEditingExistingGate && checkListBuilder?.checkListBuilderId === null) {
        setContainerDamage([]);
      }
    }

    if (currentEquipmentTypeId === 1) {
      setChassisCheckList(merged);
      const isEditingExistingGate = !!current?.gateId;
      if (!isEditingExistingGate && checkListBuilder?.checkListBuilderId === null) {
        setChassisDamage([]);
      }
    }

    if (currentEquipmentTypeId === 3) {
      setGensetCheckList(merged);

      const isEditingExistingGate = !!current?.gateId;
      if (!isEditingExistingGate && checkListBuilder?.checkListBuilderId === null) {
        setGensetDamage([]);
      }
    }
  }, [checkListBuilder, currentEquipmentTypeId, current]);

  useEffect(() => {
    if (!lastInfoTrip || isEdit) return;

    console.log("LAST INFO TRIP changed:", lastInfoTrip);

    const tripIdRaw = (lastInfoTrip as any)?.tripId;
    const driverIdRaw = (lastInfoTrip as any)?.driverId;

    const tripId = typeof tripIdRaw === "number" ? tripIdRaw : Number.isFinite(Number(tripIdRaw)) ? Number(tripIdRaw) : null;

    const driverId =
      typeof driverIdRaw === "number" ? driverIdRaw : Number.isFinite(Number(driverIdRaw)) ? Number(driverIdRaw) : null;

    if (!tripId && !driverId) return;

    setGate((prev: any) => {
      const nextTripId = tripId ?? prev.tripId ?? null;
      const nextDriverId = driverId ?? prev.driverId ?? null;

      if (prev.tripId === nextTripId && prev.driverId === nextDriverId) return prev;

      return {
        ...prev,
        tripId: nextTripId,
        driverId: nextDriverId,
      };
    });
  }, [(lastInfoTrip as any)?.tripId, (lastInfoTrip as any)?.driverId]);

  const getSignatureSrc = (signature: any) => {
    if (signature.startsWith("data:image/png;base64,")) {
      return signature;
    }
    return `data:image/png;base64,${signature}`;
  };

  type validationType = "container" | "chassis" | "genset";

  const yupToIssues = (err: any): ValidationIssue[] => {
    if (!(err instanceof yup.ValidationError)) {
      return [{ path: ["general"], message: "Validation failed" }];
    }

    const inner = err.inner?.length ? err.inner : [err];

    return inner.map((e: any) => ({
      path: e.path ? e.path.split(".") : ["general"],
      message: e.message,
    }));
  };

  const validateEquipmentForm = async (data: any, type: validationType, damageData?: any[]): Promise<ValidationIssue[]> => {
    const schemas: Record<validationType, yup.AnySchema> = {
      container: containerValidationSchema,
      chassis: chassisValidationSchema,
      genset: gensetValidationSchema,
    };

    const schema = schemas[type];
    if (!schema) {
      return [{ path: ["general"], message: `Invalid equipment type: ${type}` }];
    }

    const issues: ValidationIssue[] = [];

    try {
      await schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
      });
    } catch (err) {
      issues.push(...yupToIssues(err));
    }

    if (data?.showEquipment !== 0 && Array.isArray(damageData) && damageData.length > 0) {
      for (let index = 0; index < damageData.length; index++) {
        try {
          await gateDamageDataSchema.validate(damageData[index], {
            abortEarly: false,
            stripUnknown: true,
          });
        } catch (err) {
          const rowIssues = yupToIssues(err).map((i) => ({
            ...i,
            path: [`${type}Damage`, index, ...i.path],
          }));
          issues.push(...rowIssues);
        }
      }
    }

    return issues;
  };

  const validateGateForm = async (data: any): Promise<ValidationIssue[]> => {
    const schema = gateValidationSchema;
    const issues: ValidationIssue[] = [];

    try {
      await schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
      });
    } catch (err) {
      issues.push(...yupToIssues(err));
    }

    return issues;
  };

  const prepareGateDetails = useCallback((data: any, damageData: any[] = [], checkListData: Checklist, equipmentTypeId: number): any => {
    return {
      ownedEquipment: data?.ownedEquipment ?? 0,
      equipmentTypeId,

      sizeEquipmentId: data?.sizeEquipmentId ?? null,
      equipmentId: data?.equipmentId ?? null,
      clientId: data?.clientId ?? null,
      subdivisionId: data?.subdivision_id ?? null,
      remarks: data?.remarks ?? null,

      gensetTypeId: data?.gensetTypeId ?? null,
      fuelLevel: data?.fuelLevel ?? null,
      engineHours: data?.engineHours ?? null,

      gateDamageData: damageData ?? [],
      gateChecklistData: checkListData,

      tiresData: data?.tiresData ?? null,
      loaded: data?.loaded ?? null,
      haulage: data?.haulage ?? null,
    };
  }, []);

  const extractDamageErrors = (issues: ValidationIssue[], damageType: "container" | "chassis" | "genset"): ErrorMap => {
    return issues
      .filter((i) => i.path?.[0] === `${damageType}Damage`)
      .reduce<ErrorMap>((acc, i) => {
        const key = `${damageType}.${i.path.slice(1).map(String).join(".")}`;
        acc[key] = i.message;
        return acc;
      }, {});
  };

  const filterErrors = (errors: ErrorMap, prefix: "container" | "chassis" | "genset"): ErrorMap => {
    const start = `${prefix}Damage.`;
    return Object.keys(errors)
      .filter((k) => !k.startsWith(start))
      .reduce<ErrorMap>((obj, k) => {
        obj[k] = errors[k];
        return obj;
      }, {});
  };

  const transformErrors = (issues: ValidationIssue[]): ErrorMap => {
    const transformed: ErrorMap = {};

    issues.forEach((issue) => {
      const key = issue.path.map(String).join(".");
      transformed[key] = issue.message;
    });

    return transformed;
  };

  const handleSaveGate = useCallback(async () => {
    setErrors((prev: any) => ({
      ...prev,
      containerErrors: false,
      chassisErrors: false,
      gensetErrors: false,
      containerDamageErrors: false,
      chassisDamageErrors: false,
      gensetDamageErrors: false,
    }));

    const containerDataToValidate = {
      equipmentId: containerData?.equipmentId,
      clientId: containerData?.clientId,
      sizeEquipmentId: containerData?.sizeEquipmentId,
      remarks: containerData?.remarks,
      haulage: containerData?.haulage,
      loaded: containerData?.loaded,
      checkListData: containerCheckList,
    };

    const chassisDataToValidate: any = {
      equipmentId: chassisData?.equipmentId,
      clientId: chassisData?.clientId,
      inTransit: chassisData?.inTransit,
      sizeEquipmentId: chassisData?.sizeEquipmentId,
      remarks: chassisData?.remarks,
      checkListData: chassisData?.inTransit === 1 ? null : chassisCheckList,
      tiresData: chassisData?.tiresData,
      subdivision_id: chassisData?.subdivision_id,
    };

    const gensetDataToValidate = {
      equipmentId: gensetData?.equipmentId,
      clientId: gensetData?.clientId,
      inTransit: gensetData?.inTransit,
      gensetTypeId: gensetData?.gensetTypeId,
      fuelLevel: gensetData?.fuelLevel,
      engineHours: gensetData?.engineHours,
      remarks: gensetData?.remarks,
      checkListData: gensetData?.inTransit === 1 ? null : gensetCheckList,
      subdivision_id: gensetData?.subdivision_id,
    };

    const shouldValidate = (d: any) => d && d.showEquipment !== 0;

    const gateIssues = await validateGateForm(gate);
    console.log("gate issues", gateIssues);

    const containerIssues = shouldValidate(containerData) ? await validateEquipmentForm(containerDataToValidate, "container", containerDamage) : [];

    const chassisIssues = shouldValidate(chassisData) ? await validateEquipmentForm(chassisDataToValidate, "chassis", chassisDamage) : [];

    const gensetIssues = shouldValidate(gensetData) ? await validateEquipmentForm(gensetDataToValidate, "genset", gensetDamage) : [];

    console.log("chassisDataToValidate", chassisDataToValidate);

    const gateErrors = transformErrors(gateIssues);
    const transformedContainer = transformErrors(containerIssues);
    const transformedChassis = transformErrors(chassisIssues);
    const transformedGenset = transformErrors(gensetIssues);

    const filteredContainerErrors = shouldValidate(containerData) ? filterErrors(transformedContainer, "container") : {};
    const filteredChassisErrors = shouldValidate(chassisData) ? filterErrors(transformedChassis, "chassis") : {};
    const filteredGensetErrors = shouldValidate(gensetData) ? filterErrors(transformedGenset, "genset") : {};

    const containerDamageErrors = extractDamageErrors(containerIssues, "container");
    const chassisDamageErrors = extractDamageErrors(chassisIssues, "chassis");
    const gensetDamageErrors = extractDamageErrors(gensetIssues, "genset");

    const hasErrors =
      Object.keys(filteredContainerErrors).length > 0 ||
      Object.keys(filteredChassisErrors).length > 0 ||
      Object.keys(filteredGensetErrors).length > 0 ||
      Object.keys(containerDamageErrors).length > 0 ||
      Object.keys(chassisDamageErrors).length > 0 ||
      Object.keys(gensetDamageErrors).length > 0 ||
      Object.keys(gateErrors).length > 0;

    if (hasErrors) {
      const errors = {
        containerErrors: filteredContainerErrors,
        chassisErrors: filteredChassisErrors,
        gensetErrors: filteredGensetErrors,
        containerDamageErrors,
        chassisDamageErrors,
        gensetDamageErrors,
        gateErrors,
      };

      console.log("post errors", errors);

      setErrors(errors as any);

      const readable = buildSubmitErrorMessage(errors);
      const html = <div style={{ whiteSpace: "pre-line" }}>{readable}</div>;
      setErrorMessage(html as any);
      setShowErrorModal(true);

      return;
    }

    const gateDetails = [
      shouldValidate(containerData) ? prepareGateDetails(containerData, containerDamage, containerCheckList, 2) : {},
      shouldValidate(chassisData) ? prepareGateDetails(chassisData, chassisDamage, chassisCheckList, 1) : {},
      shouldValidate(gensetData) ? prepareGateDetails(gensetData, gensetDamage, gensetCheckList, 3) : {},
    ];

    const gateData = {
      gateId: gate?.gateId ?? null,
      depotId: gate?.depotId,
      gateTypeId: gate?.gateTypeId,
      requestId: gate?.requestId,
      truckId: gate?.truckId,
      driverId: gate?.driverId,
      tripId: gate?.tripId,
      subdivisionId: gate?.subdivisionId,
      signatureDriver: gate?.signatureDriver,
      signatureInspector: gate?.signatureInspector,
      gateIdTemp: gate?.gateIdTemp,
      gateDetails,
    };

    if (!isEdit) {
      console.log("create gate data: ", gateData);
      await dispatch(createGate(gateData))
        .unwrap()
        .then((resp) => {
          console.log("create gate response: ", resp);
          setSavedData(resp?.gate);
          setSuccessModalOpen(true);
          setSuccessMessage(`Gate #${resp?.gate?.gateId} created successfully.`);
        })
        .catch(() => null);
    }
  }, [
    gate,
    containerData,
    chassisData,
    gensetData,
    containerCheckList,
    chassisCheckList,
    gensetCheckList,
    containerDamage,
    chassisDamage,
    gensetDamage,
    setErrors,
    validateEquipmentForm,
    prepareGateDetails,
  ]);

  const handleExportPDF = async () => {
    const exportId = gate?.gateId;
    if (!exportId) return;
    try {
      await gatesAPI.downloadGatePDF(exportId);
    } catch (error) {
      console.error("Failed to export PDF", error);
    }
  };

  console.log("gate -->", gate);
  //console.log("container data -->", containerData);
  //console.log("chassis data -->", chassisData);
  //console.log("genset data -->", gensetData);
  //console.log("request data -->", newRequest);
  //console.log("Container damage -->", containerDamage);
  //console.log("Chassis damage -->", chassisDamage);
  //console.log("Genset damage -->", gensetDamage);
  //console.log("Changes reflected -->");

  /* ---------------------------------- Render ---------------------------------- */

  return (
    <div>
      <CCol xs={12}>
        <PageHero
          kicker={"CREATE GATE"}
          icon={cilList}
          title={isGateIn ? "Gate IN" : "Gate OUT"}
          subtitle={`Register equipment ${isGateIn ? "entries to" : "departures from"} depot`}
        />
      </CCol>

      <CCard>
        {isEdit && (
          <CCardHeader style={{ display: "flex", justifyContent: "flex-end" }}>
            <CButton color="danger" onClick={handleExportPDF} className="me-2 text-white">
              <CIcon icon={cilCloudDownload} className="me-2" />
              Export PDF
            </CButton>
          </CCardHeader>
        )}

        <CCardBody>
          <CRow>
            <CCol xs={12} md={6}>
              <CFormSelect
                name="depotId"
                label="Location"
                value={gate?.depotId ?? ""}
                options={depotOptions as any}
                onChange={handleChange as any}
                disabled={isEdit}
              />
            </CCol>

            <CCol xs={12} md={6}>
              <CFormSelect
                name="gateTypeId"
                label="Gate Type"
                value={gate.gateTypeId ?? ""}
                options={gateTypeOptions as any}
                onChange={handleChange as any}
                disabled
              />
            </CCol>
            <br />

            <CCol xs={12} md={6}>
              {isGateOut && 
              <CFormSelect 
                name="equipmentRequestId"
                label="Request"
                value={gate?.equipmentRequestId ?? ""}
                options={requestOptions as any}
                onChange={(e) => handleRequestSelection(e.target.value)}
                disabled={isEdit}
               />
              }
              { isGateOut && gate?.equipmentRequestId &&
              <div>
                <br />
                <Link 
                className="text-decoration-none font-weight-bold"
                to={`/depot-main/equipment-request/${gate?.equipmentRequestId}`}
                target="_blank"
                ><strong>View Request</strong></Link>
              </div>
              }
            </CCol>
            <CCol xs={12} md={6}>
              {isGateOut && 
                <CFormSelect 
                name="equipmentId"
                label="Requirements"
                value={gate?.requestId ?? ""}
                options={requirementsOptions as any}
                onChange={(e) => handleRequerimentsSelection(e.target.value)}
                disabled={isEdit}
               />
              }
            </CCol>

            {isGateOut && !isEdit &&
            <CCol xs={12} md={6}>
              < br />
              <CButton color="secondary" className="text-white" onClick={() => showCreateForm(5, !showNewRequestForm)} >
                <CIcon icon={showNewRequestForm ? cilArrowThickFromBottom : cilPlus} className="me-2" />
                {showNewRequestForm ? 'Hide New Request Form' : 'Add New Equipment Request'}
              </CButton>
            </CCol>
            }
          </CRow>
           <br />
          <CCollapse visible={(isGateOut && !isEdit && showNewRequestForm)}>
          <CreateRequestForm
            data={newRequest}
            onChangeRequest={handleChangeRequest}
            onChangeRequirement={handleChangeRequirement}
            requestTypeOptions={requestTypesList as any}
            clientsOptions={clientsList as any}
            containerSizeOptions={containerSizeOptions as any}
            chassisSizeOptions={chassisSizeOptions as any}
            tripOptions={tripOptions}
            newRequestErrors = {newRequestErrors}
            newRequirementErrors = {{} as any}
            toggleForm={showCreateForm}
            save={saveNewRequest}
          />
          </CCollapse>

          <br />

          <ContainerForm
            gateType={gateType as GateType}
            currentGateId={gate?.gateTypeId}
            sizeRequirement={gate?.requirementSize}
            ownerRequirement={gate?.requiredOwner}
            isGateOut={isGateOut}
            isViewMode={isEdit}
            isEdit={isEdit}
            blocked={false}
            value={containerData}
            newContainerValue={newContainer}
            errors={errors.containerErrors || {}}
            damageErrors={errors.containerDamageErrors || {}}
            newContainerErrors={newContainerErrors}
            equipmentSizesOptions={containerSizeOptions as any}
            clientsOptions={clientOptions as any}
            containerOptions={containerSizeOptions as any}
            conditionOptions={conditionOptions as any}
            colorOptions={colorOptions as any}
            damageOptions={containerDamageOptions as any}
            showCreateForm={showNewContainerForm}
            toggleCreateForm={showCreateForm}
            onChange={handleChangeContainer}
            onChangeNewContainer={handleChangeNewAsset}
            onSaveNewContainer={saveNewContainer}
            checkList={containerCheckList}
            onChangeCheckList={handleChangeContainerChecklist}
            damagesList={containerDamage}
            setDamages={setContainerDamage}
            handleDamageChange={handleDamageChange}
            imagesInfo={imagesInfo}
            partsList={containerPartsList}
            requirement={selectedRequirement}
          />

          <br />

          <ChassisForm
            gateType={gateType as GateType}
            currentGateId={gate?.gateTypeId}
            sizeRequirement={gate?.requirementSize}
            ownerRequirement={gate?.requiredOwner}
            isGateOut={isGateOut}
            isViewMode={isEdit}
            isEdit={isEdit}
            blocked={false}
            value={chassisData}
            newChassisValue={newChassis}
            errors={errors.chassisErrors || {}}
            damageErrors={errors.chassisDamageErrors || {}}
            newChassisErrors={newChassisErrors}
            equipmentSizesOptions={chassisSizeOptions as any}
            clientsOptions={clientOptions as any}
            chassisOptions={chassisSizeOptions as any}
            conditionOptions={conditionOptions}
            damageOptions={chassisDamageOptions}
            subdivisionOptions={subdivisionOptions as any}
            showCreateForm={showNewChassisForm}
            toggleCreateForm={showCreateForm}
            onChange={handleChangeChassis}
            onChangeNewChassis={handleChangeNewAsset as any}
            onSaveNewChassis={saveNewChassis}
            checkList={chassisCheckList}
            onChangeCheckList={handleChangeChassisChecklist}
            damagesList={chassisDamage}
            setDamages={setChassisDamage}
            handleDamageChange={handleDamageChange}
            imagesInfo={imagesInfo}
            partsList={chassisPartsList}
            requirement={selectedRequirement}
          />

          <br />

          <GensetForm
            gateType={gateType as GateType}
            currentGateId={gate?.gateTypeId}
            sizeRequirement={gate?.requirementSize}
            ownerRequirement={gate?.requiredOwner}
            isGateOut={isGateOut}
            isEdit={isEdit}
            isViewMode={isEdit}
            blocked={false}
            value={gensetData}
            newGensetValue={newGenset}
            errors={errors.gensetErrors || {}}
            damageErrors={errors.gensetDamageErrors || {}}
            newGensetErrors={newGensetErrors}
            gensetTypeOptions={gensetTypeOptions as any}
            clientsOptions={clientOptions as any}
            conditionOptions={conditionOptions as any}
            damageOptions={gensetDamageOptions as any}
            subdivisionOptions={subdivisionOptions as any}
            showCreateForm={showNewGensetForm}
            toggleCreateForm={showCreateForm}
            onChange={handleChangeGenset}
            onChangeNewGenset={handleChangeNewAsset as any}
            onSaveNewGenset={saveNewGenset}
            checkList={gensetCheckList}
            onChangeCheckList={handleChangeGensetChecklist}
            damagesList={gensetDamage}
            setDamages={setGensetDamage}
            handleDamageChange={handleDamageChange}
            imagesInfo={imagesInfo}
            partsList={gensetPartsList}
            requirement={selectedRequirement}
          />

          <br />

          {(isGateIn || (isGateOut && typeof gate?.requestId === 'number')) && (
            <TruckForm
              gateType={gateType}
              value={gate}
              haulageTypeOptions={haulageTypeOptions as any}
              lastTripInfo={lastInfoTrip}
              containerLoaded={false}
              containerHaulageId={null}
              containerControlsEnabled={true}
              onChangeContainerLoaded={() => {}}
              onChangeContainer={handleChangeContainer}
              showCreateForm={showNewTruckForm}
              toggleCreateForm={showCreateForm}
              newDriverValue={newDriver}
              newTruckErrors={newTruckErrors}
              newDriverErrors={newDriverErrors}
              onSaveNewTruckAndDriver={saveNewTruckAndDriver}
              newTruckValue={newTruck}
              onChangeNewTruck={handleChangeNewAsset}
              containerErrors={errors.containerErrors || {}}
              onChange={handleChangeTruck}
              viewMode={isEdit}
              isTripRequest = {(isGateOut && 
              selectedRequest?.requestType?.flat_name_id === "trip")}
              containerData={containerData}
              colorOptions={colorOptions}
              subdivisionOptions={subdivisionOptions}
            />
          )}
        </CCardBody>

        {(isGateIn || (isGateOut && typeof gate?.requestId === 'number')) && (
          <SignatureCanvas
            signatureDriver={gate.signatureDriver}
            signatureInspector={gate.signatureInspector}
            isEdit={isEdit}
            getSignatureSrc={getSignatureSrc}
            setGate={setGate}
          />
        )}

        <br />
        <br />

        <SuccessMessageModal
          showSuccessModal={showSuccessModal}
          setShowSuccessModal={(open: boolean) => {
            setShowSuccessModal(open);
            if (!open) dispatch(clearAsset());
          }}
          successMessage={successMessage}
        />

        <ErrorMessageModal
          showErrorModal={showErrorModal}
          setShowErrorModal={(open: boolean) => {
            setShowErrorModal(open);
            if (!open) dispatch(clearError());
          }}
          errorMessage={errorMessage}
        />

        <SuccesModalWithActions
          showSuccessModal={successModalOpen}
          setShowSuccessModal={setSuccessModalOpen}
          savedData={savedData}
          recordIdKey="gateId"
          isEdit={isEdit}
          successMessage={successMessage}
          onClickCreateAnother={() => navigate(0)}
          onClickContinueEditing={() => {
            navigate(`/depot-main/gates/${savedData?.gateId}/${gateType}`);
            setSuccessModalOpen(false);
          }}
          onClickBackToOverview={() => navigate("/depot-main/gates")}
        />

        <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton
          color="secondary"
          className="text-white"
          onClick={() => navigate("/depot-main/gates")}
          disabled={loading.saving}
        >
          <CIcon icon={cilArrowThickFromRight} className="me-2" />
          Go Back
        </CButton>

        <CButton color="primary" onClick={handleSaveGate} disabled={loading.saving}>
          {loading.saving ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            <>
              <CIcon icon={cilSave} className="me-2" />
              Save Gate
            </>
          )}
        </CButton>
      </CCardFooter>
      </CCard>
    </div>
  );
}

export default GatesEditPage;
