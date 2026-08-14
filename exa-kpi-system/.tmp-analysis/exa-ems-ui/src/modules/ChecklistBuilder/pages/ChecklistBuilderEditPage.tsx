import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import PageHero from '../../../components/PageHero'
import * as Yup from "yup";
import { useLocation } from 'react-router-dom'
import {  useNavigate, useParams } from 'react-router-dom'
import ChecklistTopForm from '../components/ChecklistTopForm'
import SuccesModalWithActions from 'src/components/SuccesModalWithActions';
import ErrorMessageModal from 'src/components/ErrorMessageModal';
import InfoModal from 'src/components/InfoMessageModal';
import RefImageModal from '../components/RefImageModal';
import CIcon from '@coreui/icons-react'

import {  
    setDefaultChecklist, 
    loadChecklist, 
    loadGateTypes, 
    loadEquipmentTypes, 
    loadEquipmentSizes,
    loadGensetTypes,
    loadDepots,
    addChecklist,
    saveChecklist,
    clearChecklist
} from '../store/checklistBuilderSlice'

import { loadPartsList } from '../../PartsAndSections/store/partsAndSectionsSlice'

import { loadClients } from '../../Assets/Clients/store/clients.slice'
import { set, type AppDispatch, type RootState } from '../../../store'
import { useDispatch, useSelector } from 'react-redux'
import { RenderOptions } from '../../../helpers/RenderOptionsHelper'

import {
  cilList,
  cilCheckCircle
} from '@coreui/icons'

import {
  CCol,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CToast,
  CToastBody,
  CToastClose,
  CToaster,
} from '@coreui/react-pro'

const expression = /[?\[\]{}|¬°$<>~¨"#!*¡%¿=^+]/;

const noSpecialChars = (msg = 'Invalid characters detected') =>
  Yup
    .string()
    .test(
      'no-special-chars',
      msg,
      (value: string) => value ? !expression.test(value) : true
);

const schema = Yup.object({
  checkListName: noSpecialChars()
  .trim()
  .max(255)
  .required('Checklist name is required'),

  clientIds: Yup
    .array()
    .of(Yup.number().required())
    .min(1, 'At least one client is required')
    .required(),

  gateTypeId: Yup
    .number()
    .required(),

  equipmentTypeId: Yup
    .number()
    .required(),

  sizeEquipmentId: Yup
    .number()
    .required(),

  depotIds: Yup
    .array()
    .of(Yup.number().required())
    .min(1, 'At least one depot is required')
    .required(),

  parts: Yup
    .array()
    .min(1, 'At least one part is required')
    .of(
      Yup.object({
        id: Yup.number().required(),

        sections: Yup
          .array()
          .min(1, 'At least one section is required')
          .of(
            Yup.object({
              id: Yup.number().required(),

              instruction: Yup
                .string()
                .trim()
                .min(6)
                .max(255)
                .required('Instruction is required')
                .test(
                  'no-special-chars',
                  'Invalid characters detected',
                  (value: any) => value ? !expression.test(value) : true
                ),
            })
          )
          .required(),
      })
    )
    .required(),
});


function ChecklistBuilderEditPage() {

type BackendError = string | false;
type FrontendErrors = false | Record<string, string[]>;

const dispatch = useDispatch<AppDispatch>()
const toaster = React.useRef<any>(null)
const [savedChecklist, setSavedChecklist] = useState<any | null>(null);
const [toast, setToast] = useState<any>(null)
const [formData, setFormData] = useState<any>({ parts: [] })
const [showModal, setShowModal] = useState(false)
const [isGenset, setIsGenset] = useState(false)
const [deletedChecklistSectionIds, setDeletedChecklistSectionIds] = useState<number[]>([])
const [deletedChecklistPartIds, setDeletedChecklistPartIds] = useState<number[]>([])
const [deletedChecklistDepotIds, setDeletedChecklistDepotIds] = useState<number[]>([])
const [deletedChecklistClientIds, setDeletedChecklistClientIds] = useState<number[]>([])
const [FEChecklistErrors, setFEChecklistErrors] = useState<any>(false);
const [showSuccessModal, setShowSuccessModal] = useState(false)
const [showErrorModal, setShowErrorModal] = useState(false)
const [multiResetKey, setMultiResetKey] = useState(0);
const [errorMessage, setErrorMessage] = useState('');
const [showInfoModal, setShowInfoModal] = useState(false)
const [infoMessage, setInfoMessage] = useState('');
const [showRefImageModal, setShowRefImageModal] = useState(false)
const [partBoxClicked, setPartBoxClicked] = useState(null);
const location = useLocation()
const viewMode = Boolean(location.state?.viewMode)
const isView = viewMode

console.log("viewMode:", viewMode)


const { 
    gateTypesList, 
    checklist, 
    equipmentTypesList, 
    equipmentSizesList, 
    gensetTypesList,
    depotsList,
    errors: BEerrors,
} = useSelector((state: RootState) => (state as any).checklistBuilder);

const navigate = useNavigate();
const { list } = useSelector((state: RootState) => (state as any).clients)
const { list: partsList } = useSelector((state: RootState) => state.partsAndSections);
const { id } = useParams<{ id?: string }>()
const checklistId = id ? Number(id) : null
const isEdit = checklistId !== null && Number.isFinite(checklistId)


console.log("partsList:", partsList)
console.log("FORM DATA:", formData)

useEffect(() => {
  return () => {
    dispatch(clearChecklist());
  };
}, [dispatch]);


const toggleModal = ( modalstate: boolean) => {
    setShowModal(modalstate)
}

const loadData = () => {
    dispatch(loadGateTypes());
    dispatch(loadEquipmentTypes());
    dispatch(loadClients());
    dispatch(loadEquipmentSizes());
    dispatch(loadGensetTypes());
    dispatch(loadPartsList());
    dispatch(loadDepots());

    /* const checklistId = id ? Number(id) : null;
    console.log("checklistId: ", checklistId);
    const isEdit = Number.isFinite(checklistId) && checklistId !== null; */

    if (isEdit) {
        dispatch(loadChecklist(checklistId))
    } else {
        dispatch(setDefaultChecklist());
    } 
}

useEffect(() => {
  loadData();
}, [])

  useEffect(() => {
    //if (!isEdit) return;
    if (!checklist || typeof checklist === 'boolean') return; 
    console.log("edit page checklist data:", checklist);
    const isGenset = checklist?.equipmentTypeId === 3;
    setIsGenset(isGenset);
    setFormData(checklist);
  
  }, [isEdit, checklist]);

const getOptions = (list: any[], id: string, label: string, placeholder = '') => {
  const options = RenderOptions(list, id, label) ?? [];
  return [{ label: placeholder, value: "" }, ...options]; // ✅ no mutation
};

const getFilteredSizeOptions = (list: any[], placeholder = '') => {
  let filteredList: any[] = list.filter((size: any) => size.equipmentTypeId === Number(formData.equipmentTypeId));
  let options = RenderOptions(filteredList, "sizeEquipmentId", "sizeType");
  return [{ label: placeholder, value: "" }, ...options];
}

const gateTypeOptions = useMemo(
  () =>
    getOptions(
      (gateTypesList ?? []).filter(
        (item: any) => item.name?.toLowerCase() !== 'both'
      ),
      'attributeItemId',
      'name',
      'Select Gate Type...'
    ),
  [gateTypesList]
);

const equipmentTypeOptions = useMemo(
  () => getOptions(equipmentTypesList ?? [], 'equipmentTypeId', 'equipmentName', 'Select Equipment Type...'),
  [equipmentTypesList]
);

const clientOptions = useMemo(
  () => getOptions(list ?? [], 'client_id', 'name', 'Select Client...'),
  [list]
);

const equipmentSizeOptions = getFilteredSizeOptions(equipmentSizesList ?? [], 'Select Equipment Size...');

const gensetTypeOptions = useMemo(
  () => getOptions(gensetTypesList ?? [], 'attributeItemId', 'name', 'Select Genset Type...'),
  [gensetTypesList]
);

console.log("gensetTypeOptions:", gensetTypeOptions)

const depotOptions = useMemo(
  () => getOptions(depotsList ?? [], 'depotId', 'depotName', 'Select Depot...'),
  [depotsList]
);


const getSectionOptions = (partId: string): any[] => {
  if (partsList.length === 0) return []

  const part = partsList.find(
    (elem) => elem.equipmentPartId === Number(partId)
  )

  console.log("sections_data:", part?.sections_data ?? [])
  return part?.sections_data ?? []
}

const setSections = (partIndex: number, newSections: any[]) => {
  setFormData((prev: any) => {
    if (!prev) return prev

    const nextParts = [...prev.parts]
    nextParts[partIndex] = {
      ...nextParts[partIndex],
      sections: newSections,
    }

    return {
      ...prev,
      parts: nextParts,
    }
  })
}

const detectGenset = (equipmentTypeId: number | string) => {
  console.log("detectGenset equipmentTypeId:", equipmentTypeId)
  if (!equipmentTypeId) return false;
  if (equipmentTypeOptions.length === 0) return false;
  const id = Number(equipmentTypeId);
  const elem = equipmentTypeOptions.find(
    elem => elem.value === id
  )
  const isGenset = elem.label.toLowerCase() === 'genset'

  return isGenset;
}

const storeDeletedFormItem = (itemId: number | null, item: string) => {
  if (!isEdit) return
  if (!formData) return

  const checklist = formData // (alias to keep the logic readable)

  switch (item) {
    case "REMOVE_SECTION": {
      const foundSection = checklist.linked_sections.find((e: any) => e.partSectionId === itemId)
      if (foundSection) {
        setDeletedChecklistSectionIds((prev) => [...prev, foundSection.checkListSectionId])
      }
      break
    }

    case "REMOVE_CLIENT": {
      const foundClient = checklist.linked_clients.find((e: any) => e.clientId === itemId)
      if (foundClient) {
        setDeletedChecklistClientIds((prev) => [...prev, foundClient.checkListClientId])
      }
      break
    }

    case "REMOVE_DEPOT": {
      const foundDepot = checklist.linked_depots.find((e: any) => e.depotId === itemId)
      if (foundDepot) {
        setDeletedChecklistDepotIds((prev) => [...prev, foundDepot.checkListDepotId])
      }
      break
    }

    case "REMOVE_PART_AND_SECTIONS": {
      const foundPart = checklist.linked_parts.find((e: any) => e.equipmentPartId === itemId)
      if (foundPart) {
        setDeletedChecklistPartIds((prev) => [...prev, foundPart.checkListEquipmentId])
      }

      const targetPart = checklist.parts.find((p: any) => p.id === itemId)
      if (targetPart) {
        const linkedSections = targetPart.sections
          .map((section: any) =>
            checklist.linked_sections.find((e: any) => e.partSectionId === section.id)
          )
          .filter(Boolean)
          .map((e: any) => (e as any).checkListSectionId)

        if (linkedSections.length) {
          setDeletedChecklistSectionIds((prev) => [...prev, ...linkedSections])
        }
      }

      break
    }

    case "REMOVE_ALL_PARTS_AND_SECTIONS": {
      const deletedPartIds: number[] = []
      const deletedSectionIds: number[] = []

      checklist.parts.forEach((part: any) => {
        const found = checklist.linked_parts.find((e: any) => e.equipmentPartId === part.id)
        if (!found) return

        deletedPartIds.push(found.checkListEquipmentId)

        const linkedSections = part.sections
          .map((section: any) =>
            checklist.linked_sections.find((e: any) => e.partSectionId === section.id)
          )
          .filter(Boolean)
          .map((e: any) => (e as any).checkListSectionId)

        deletedSectionIds.push(...linkedSections)
      })

      if (deletedSectionIds.length) {
        setDeletedChecklistSectionIds((prev) => [...prev, ...deletedSectionIds])
      }
      if (deletedPartIds.length) {
        setDeletedChecklistPartIds((prev) => [...prev, ...deletedPartIds])
      }

      break
    }

    default:
      break
  }
}

const removePart = (partId: number) => {
  setFormData((prev: any) => {
    if (!prev?.parts) return prev;

    const targetElem = prev.parts.find((elem: any) => elem.id === partId);
    if (!targetElem) return prev;

    const index = prev.parts.findIndex((elem: any) => elem.id === partId);

    console.log("Target:", targetElem);
    console.log("Index:", index);

    // 🚫 Block removal if already stored
    if ("checkListEquipmentId" in targetElem) {
      setErrorMessage("Cannot remove part that is already stored! Consider disabling current checklist and creating a new one.");
      setShowErrorModal(true);
      return prev; // ✅ important: do NOT update state
    }

    // Track deletions if not insert mode
    if (isEdit) {
      storeDeletedFormItem(
        partId,
        "REMOVE_PART_AND_SECTIONS"
      );
    }

    // ✅ Immutable removal
    const nextParts = prev.parts.filter((p: any) => p.id !== partId);

    return {
      ...prev,
      parts: nextParts,
    };
  });
};


const handleChangeMulti = (field: 'clientIds' | 'depotIds', values: number[]) => {
  const nextValues = (values ?? []).map(Number);

  if (isEdit) {
    const elemObject = field === 'clientIds' ? 'linked_clients' : 'linked_depots';
    const elemIdKey = field === 'clientIds' ? 'clientId' : 'depotId';

    const linked = (formData?.[elemObject] ?? []) as Array<Record<string, any>>;
    const storedIds = linked.map((x) => Number(x[elemIdKey]));

    const deletedStoredId = storedIds.some((storedId) => !nextValues.includes(storedId));

    if (deletedStoredId) {
      const elemName = field === 'clientIds' ? 'client' : 'depot';
      setErrorMessage(`Cannot remove ${elemName} that is already stored! Consider disabling current checklist and creating a new one.`);
      setShowErrorModal(true);
      setMultiResetKey((k) => k + 1); // ✅ revert UI
      return;
    }
  }

  setFormData((prev: any) => {
    const next = { ...prev } as any;
    const isEXA = field === 'clientIds' && nextValues.includes(20);

    if (isEXA) {
      next.clientIds = [20];
      next.ownedEquipment = 1;
      next.defaultConfig = 0;
    } else {
      next[field] = nextValues;
      if (field === 'clientIds') next.ownedEquipment = 0;
    }

    return next;
  });
};



const numericFields = new Set([
  'equipmentTypeId',
  'gensetTypeId',
  'sizeEquipmentId',
  'gateTypeId',
  // add any other numeric selects here
])

const handleChange = (e: any) => {
  const { name } = e.target
  const isCheckbox = e.target instanceof HTMLInputElement && e.target.type === 'checkbox'

  const raw = isCheckbox ? (e.target.checked ? 1 : 0) : e.target.value

  // ✅ only cast if it's a known numeric field
  const value =
    isCheckbox ? raw : numericFields.has(name) ? (raw === '' ? null : Number(raw)) : String(raw ?? '')

  const next = { ...formData } as any

  console.log('handleChange name: ', name, ', value: ', value);

  if (name === 'equipmentTypeId') {
    const genset = detectGenset(value)
    const nullField = genset ? 'sizeEquipmentId' : 'gensetTypeId'
    next[nullField] = null
    next.parts = []
    next.equipmentTypeId = value

    setIsGenset(genset)
    storeDeletedFormItem(null, 'REMOVE_ALL_PARTS_AND_SECTIONS')

    setFormData(next)
    return
  }

  if (name === 'sizeEquipmentId') {
    next.parts = []
  }

  if (name === 'part') {
    next.parts = [...(next.parts ?? []), value]
    setFormData(next)
    return
  }

  if (name === 'ownedEquipment') {
    next.ownedEquipment = value
    if (value === 1) {
      next.clientIds = [20]
      next.defaultConfig = 0
    } else {
      next.clientIds = []
    }
    setFormData(next)
    return
  }

  if (name === 'defaultConfig') {
    next.defaultConfig = value
    if (value === 1) {
      next.ownedEquipment = 0
      next.clientIds = []
    }
    setFormData(next)
    return
  }

  next[name] = value
  setFormData(next)
}


const normalizeMulti = (selected: any): number[] => {
  if (!Array.isArray(selected)) return []

  // if CoreUI returns [{value,label}, ...]
  if (selected.length > 0 && typeof selected[0] === 'object') {
    return (selected as any[]).map((x) => x.value)
  }

  // if CoreUI returns [1,2,3]
  return selected as number[]
}

const baseSchema = useMemo(() => {
  return schema;
}, []);

const buildSchema = useCallback(
  (formData: any) => {
    let s: any = baseSchema;

    // if defaultConfig, remove clientIds requirement
    if (formData.defaultConfig === 1 || formData.defaultConfig === true) {
      s = s.shape({
        clientIds: Yup.array().notRequired(),
      });
    }

    // genset logic: require gensetTypeId, remove sizeEquipmentId requirement
    if (isGenset) {
      s = s.shape({
        gensetTypeId: Yup.number().required("Genset type is required"),
        sizeEquipmentId: Yup.number().notRequired(),
      });
    }

    return s;
  },
  [baseSchema, isGenset]
);

const getBoxErrors = (partIndex: number): Record<string, string> | false => {
  if (!FEChecklistErrors) return false;

  const boxErrors: Record<string, string> = {};
  const prefix = `parts[${partIndex}].`;

  Object.keys(FEChecklistErrors).forEach((key) => {
    if (key.startsWith(prefix)) {
      boxErrors[key] = FEChecklistErrors[key];
    }
  });

  console.log("boxErrors", boxErrors);

  return Object.keys(boxErrors).length > 0 ? boxErrors : false;
};



const validateChecklist = async (formData: any): Promise<boolean> => {
    setFEChecklistErrors(false);

    try {
      const schemaToUse = buildSchema(formData);
      console.log("schemaToUse", schemaToUse);

      await schemaToUse.validate(formData, {
        abortEarly: false,
        stripUnknown: false,
      });

      return true;
    } catch (err: any) {
      if (err) {
        const formattedErrors: Record<string, string> = {};

        err.inner.forEach((e: any) => {
          const path = e.path as string;
          let message = e.message as string;

          if (message.includes(path)) {
            const fieldName =
              path.replace(/\[\d+\]/g, "").split(".").pop() || path;

            message = `* ${message.replace(path, fieldName)}`;
          }

          formattedErrors[path] = message;
        });

        console.log("formattedErrors", formattedErrors);

        setFEChecklistErrors(formattedErrors);
        return false;
      }

      return false;
    }
}

const handleSaveForm = async () => {

    if (formData.parts.length === 0) {
      setErrorMessage("At least one equipment part is required!");
      setShowErrorModal(true);
      return;
    }

    const isValid = await validateChecklist(formData);
    console.log("isValid", isValid);
    if (!isValid) return;

    console.log("validation passed", formData);

    const hasId =
      Number.isFinite(Number(formData.checkListBuilderId)) &&
      formData.checkListBuilderId !== "" &&
      formData.checkListBuilderId !== null &&
      formData.checkListBuilderId !== undefined;

    if (hasId) {
      formData.checklistSectionIdsToDelete = deletedChecklistSectionIds;
      formData.checklistClientIdsToDelete = deletedChecklistClientIds;
      formData.checklistDepotIdsToDelete = deletedChecklistDepotIds;
      formData.checklistPartIdsToDelete = deletedChecklistPartIds;
    }

    let response: any = null;

    if(hasId) {
      response = await dispatch(saveChecklist(formData));
    } else {
      response = await dispatch(addChecklist(formData));
    }

    console.log("response: ", response);
    console.log("response.meta.requestStatus: ", response?.meta?.requestStatus);

    if (response?.meta?.requestStatus === "rejected") {
      setErrorMessage(response?.payload || "Something went wrong!");
      setShowErrorModal(true)
    } else if (response?.meta?.requestStatus === "fulfilled") {
      setSavedChecklist(response?.payload)
      dispatch(loadChecklist(response?.payload?.checkListBuilderId))
      setShowSuccessModal(true)
    } else{
      navigate("/depot/checklist-builder");
    }
}

const scrollToBottom = () => {
  window.scrollTo(0, document.body.scrollHeight);
}


return (
   <div className="animated fadeIn">
    <CToaster ref={toaster} push={toast} placement="top-end" />
    <CCol xs={12}>
    <PageHero 
        kicker={ isEdit ? "EDIT CHECKLIST" : "CREATE CHECKLIST" }
        icon={cilList}
        title="Checklist Builder"
        subtitle={`${isEdit ? "Edit this" : "Create an"} equipment inspection checklist.`}
        //actions={{}}
    />
    </CCol>
    <ChecklistTopForm
      // STATE data
      data={formData}
      FEerrors={FEChecklistErrors}
      BEerrors={BEerrors}
      isEdit={isEdit}
      isGenset={isGenset}
      showModal={showModal}
      multiResetKey={multiResetKey}
      viewMode={isView}

      // setters, functions
      setFormData={setFormData}
      setSections={setSections}
      saveForm={handleSaveForm}
      toggleModal={toggleModal}
      removePart={removePart}
      storeDeletedFormItem={storeDeletedFormItem}
      setShowErrorModal={setShowErrorModal}
      setErrorMessage={setErrorMessage}
      setShowRefImageModal={setShowRefImageModal}
      setPartBoxClicked={setPartBoxClicked}

      // handlers 
      onChange={handleChange}
      onChangeMulti={handleChangeMulti}
      normalizeMulti={normalizeMulti}
      getBoxErrors={getBoxErrors}
      getSectionOptions={getSectionOptions}

      // options, lists
      equipmentTypeOptions={equipmentTypeOptions}
      depotOptions={depotOptions}
      gateTypeOptions={gateTypeOptions}
      gensetTypeOptions={gensetTypeOptions}
      equipmentSizeOptions={equipmentSizeOptions}
      clientOptions={clientOptions}
      partsList={partsList}
    />

    <SuccesModalWithActions
      isEdit={isEdit}
      showSuccessModal={showSuccessModal}
      setShowSuccessModal={setShowSuccessModal}
      savedData={savedChecklist}
      recordIdKey="checkListBuilderId"
      successMessage={`Checklist has been ${isEdit ? 'updated' : 'created'}`}
      onClickCreateAnother={() => {
        setShowSuccessModal(false)
        setSavedChecklist(null)
        dispatch(setDefaultChecklist())
      }}
      onClickContinueEditing={() => {
        setShowSuccessModal(false)
        navigate(`/depot/checklist-builder/${savedChecklist?.checkListBuilderId}`)
      }}
      onClickBackToOverview={() => navigate("/depot/checklist-builder")}
    />
    <ErrorMessageModal
      showErrorModal={showErrorModal}
      setShowErrorModal={setShowErrorModal}
      errorMessage={errorMessage}
    />
    <InfoModal
      showInfoModal={showInfoModal}
      setInfoModal={setShowInfoModal}
      infoMessage={infoMessage}
    />
    <RefImageModal
      isOpen={showRefImageModal}
      data={formData}
      partsList={partsList}
      toggleModal={setShowRefImageModal}
      setSections={setSections}
      scrollToBottom={scrollToBottom} 
      setShowErrorModal={setShowErrorModal}
      showErrorMessage={setErrorMessage}
      equipmentPartId={partBoxClicked}
      />
    </div>
    
  )
}

export default ChecklistBuilderEditPage;