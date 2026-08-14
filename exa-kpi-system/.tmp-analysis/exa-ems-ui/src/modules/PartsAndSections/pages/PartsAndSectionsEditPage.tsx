import React, { use, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import PageHero from '../../../components/PageHero'
import reactimg from '../../../assets/images/react.jpg'
import CreateTable from '../components/CreateTable'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import CIcon from '@coreui/icons-react'
import { cilSave, cilCheckCircle, cilNotes, cilArrowThickFromRight } from '@coreui/icons'
import { set, type AppDispatch, type RootState } from '../../../store'
import { 
  loadPart, 
  loadEquipmentTypes, 
  loadSizesList, 
  addPartAndSections, 
  savePartAndSections,
  loadPartImage,
  deleteSection,
  loadGensetTypes
} from '../store/partsAndSectionsSlice'

import { setDefaultPart } from '../store/partsAndSectionsSlice';
import { Section, EquipmentPartImage } from '../types';
import SuccesModalWithActions from 'src/components/SuccesModalWithActions'
import ErrorMessageModal from 'src/components/ErrorMessageModal'

import { RenderOptions } from '../../../helpers/RenderOptionsHelper'
import * as Yup from "yup";

import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CCollapse,
  CFormSelect,
  CPagination,
  CPaginationItem,
  CRow,
  CSmartTable,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CMultiSelect,
  CBadge,
  CCardText,
  CCardTitle,
  CToaster,
  CFormLabel,
  CFormInput,
  CForm,
  CImage,
  CCardFooter
} from '@coreui/react-pro'

import {
  cilPuzzle
} from '@coreui/icons'

const forbiddenChars = /[?()[\]{}|¬°$<>~¨"#!*¡%¿=^+]/;

const schema = Yup.object({
  partName: Yup.string().required("* part name is required"),
  equipmentTypeId: Yup.string().required("* equipment type is required"),
  description: Yup.string().trim().min(6).max(255),

  sizeEquipmentId: Yup.string().when("equipmentTypeId", {
    is: (val: string) => val !== "3",
    then: (s: any) => s.required("* equipment size-type is required"),
    otherwise: (s: any) => s.notRequired().nullable(),
  }),

  gensetTypeId: Yup.string().when("equipmentTypeId", {
    is: "3",
    then: (s: any) => s.required("* genset type is required"),
    otherwise: (s: any) => s.notRequired().nullable(),
  }),

  sections_data: Yup.array().of(
    Yup.object({
      code: Yup.string().trim().min(6).max(10).required("* section code is required"),
      isoCode: Yup.string().trim().min(1).required("* section iso code is required"),
      description: Yup.string().trim().min(6).required("* description is required"),
      coordinates: Yup.string()
        .trim()
        .min(3)
        .max(1000)
        .matches(/^[0-9.,\s-]+$/, "* invalid coordinate format")
        .required("* coordinates are required"),
    })
  ),
});


const getOptions = (list: any[], id: string, label: string) => {
  let options: any[];
  options = RenderOptions(list, id, label)
  options.unshift({ label: "", value: ""})
  return options
}

const getFilteredSizeOptions = (list: any[], equipmentTypeId: number) => {
  console.log("getFilteredSizeOptions list", list, equipmentTypeId)
  let filteredList: any[] = list.filter((size: any) => size.equipmentTypeId === Number(equipmentTypeId));
  let options = RenderOptions(filteredList, "sizeEquipmentId", "sizeType");
  options.unshift({ label: "", value: ""});
  return options;
}

const PartsAndSectionEditPage: React.FC = () => {

  const { part, equipmentTypesList, equipmentSizesList, imageFile, gensetTypesList } = useSelector((state: RootState) => state.partsAndSections);
  const dispatch = useDispatch<AppDispatch>()
  const toaster = React.useRef<any>(null)
  const [toast, setToast] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})
  const [sizeOptions, setSizeOptions] = useState<any>([])
  const [errors, setErrors] = useState<any>(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<EquipmentPartImage | null>(null);
  const [imageUpload, setImageUpload] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>("")
  const [savedPart, setSavedPart] = useState<any | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const location = useLocation()
  const viewMode = Boolean(location.state?.viewMode)
  const isView = viewMode


  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = Number(id)
  console.log("LOCAL STATE:", formData)
  console.log("REDUX IMG FILE:", imageFile)
  console.log("errors: ", errors)

  useEffect(() => {
    if (isEdit) {
      dispatch(loadPart({ id: isEdit }));
      dispatch(loadPartImage({ id: isEdit }));
    } else {
      dispatch(setDefaultPart());
    }

    dispatch(loadEquipmentTypes());
    dispatch(loadSizesList());
    dispatch(loadGensetTypes());
  }, [isEdit, dispatch]);


  useEffect(() => {
    //if (!isEdit) return;
    if (!part || typeof part === 'boolean') return; 

    setFormData(part);
    setImage(imageFile);
  
    console.log("part.equipmentTypeId", part.equipmentTypeId)
    if (part.equipmentTypeId) {
      displaySizeOptions(part.equipmentTypeId);
    }
  }, [isEdit, part, equipmentSizesList, imageFile]);


  const equipmentTypeOptions = getOptions(equipmentTypesList, "equipmentTypeId", "equipmentName");

  const displaySizeOptions = (equipmentTypeId: string) => {
    console.log("displaySizeOptions equipmentTypeId", typeof equipmentTypeId, equipmentTypeId)
    let filteredSizeOption: any[] = [];
    const type = Number(equipmentTypeId);

    if (type === 1 || type === 2) {
      filteredSizeOption = getFilteredSizeOptions(equipmentSizesList, type);
    } 

    if (type === 3) {
      console.log("gensetTypesList", gensetTypesList)
      filteredSizeOption = RenderOptions(gensetTypesList, "attributeItemId", "name") ?? [];
      filteredSizeOption = [{ label: "", value: "" }, ...filteredSizeOption];
    }

    setSizeOptions(filteredSizeOption);
  }

  const handleChange = (e: any, name: string) => {
    const { value } = e.target

    const newState = { ...formData }; 

    newState[name] = value; 

    if (name === "equipmentTypeId") {
      newState.sizeEquipmentId = null;
      newState.gensetTypeId = null;
      displaySizeOptions(newState.equipmentTypeId);
    }
    
    setFormData(newState)
  }

  const setSections = (newSections: any[]) => {
    const newState = { ...formData }; 
    newState.sections_data = newSections;
    setFormData(newState);
  }

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (preview) URL.revokeObjectURL(preview);

  const imageURL = URL.createObjectURL(file);
  setPreview(imageURL);
  setImageUpload(file);
};


const validateForm = async (formData: any): Promise<boolean> => {
  try {
    setErrors({});
    await schema.validate(formData, { abortEarly: false });

    console.log("Valid!", formData);
    return true;
  } catch (err: any) {
    if (err.inner) {
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
      setErrors(formattedErrors);
    } else {
      console.error(err);
    }

    return false;
  }
};

const clearSections = (sections: Partial<Section>[]): Partial<Section>[] => {
  const placeholder = 'Click to Edit...';

  let sectionsClone = sections.map(s => ({ ...s }));

  sectionsClone = sectionsClone.filter((section) => {
    let isEmpty = true;

    Object.keys(section).forEach((key) => {
      const sKey = key as keyof Section;

      if (typeof section[sKey] === 'string') {
        const value = section[sKey]?.trim() ?? '';

        if (value === placeholder) {
          section[sKey] = '' as any; 
        } else if (value !== '') {
          isEmpty = false;            
        }
      }
    });

    return !isEmpty; 
  });

  return sectionsClone;
};


const handleSubmit = async () => {
  try {
    const cleanedSections = clearSections(formData.sections_data || []);

    const cleanedFormData = {
      ...formData,
      sections_data: cleanedSections,
      imageFile: imageUpload, 
    };

    setFormData(cleanedFormData);

    const validForm = await validateForm(cleanedFormData);
    if (!validForm) return;

    let result: any;

    if (isEdit && id) {
      console.log('FORM DATA SENT: ', cleanedFormData);
      result = await dispatch(
        savePartAndSections({ id: parseInt(id), psData: cleanedFormData }),
      );
    } else {
      result = await dispatch(addPartAndSections(cleanedFormData));
    }

    console.log("result --> ", result);

    if (result?.meta?.requestStatus === "rejected") {
      setErrorMessage(result?.payload || "Something went wrong!");
      setShowErrorModal(true)
    } else if (result.meta.requestStatus === 'fulfilled') {
      //alert(`Parts and sections ${isEdit ? 'updated' : 'created'} successfully!`);
      console.log("setSavedPart", result.payload);
      setSavedPart(result.payload);
      dispatch(loadPart({ id: Number(result?.payload?.equipmentPartId) }));
      setSuccessMessage(`Equipment part has been ${isEdit ? 'updated' : 'created'}`)
      setShowSuccessModal(true);
    } else {
      throw new Error(result.payload || 'Failed to save parts and sections');
    }
  } catch (err: any) {
    setErrorMessage(`Error: ${err.message || 'An error occurred while saving the charge.'}`);
    setShowErrorModal(true)
  }
};


  const displayImageUrl = preview || image?.url || null;
  console.log("displayImageUrl", displayImageUrl)
  const isGenset = formData.equipmentTypeId === 3 || formData.equipmentTypeId === '3';

  console.log("imageFile STATE", imageFile);
  console.log("Preview STATE", preview);
  console.log("STATE", formData);
  console.log("Size Options", sizeOptions);
  console.log("genset TYPE", formData.gensetTypeId)


  return (
    <div className="animated fadeIn">
    <CToaster ref={toaster} push={toast} placement="top-end" />
    <CCol xs={12}>
    <PageHero 
        kicker="Add Parts & Sections"
        icon={cilPuzzle}
        title="Parts & Sections"
        //subtitle={`Manage your trip audits • ${filteredTotal} items`}
        //actions={{}}
    />
    </CCol>
    <CCard className="mb-4 shadow-sm trips-card">
      <CCardBody>
        <CRow>
        <CCol xs={6}>
        <CForm>
        <CFormInput
            type="text"
            id="exampleFormControlInput1"
            label="Part Name"
            placeholder=""
            size="lg"
            required
            onChange={(e) => handleChange(e, "partName")}
            value={formData.partName === null ? "": formData.partName}
            //text="Must be 8-20 characters long."
            //aria-describedby="exampleFormControlInputHelpInline"
            invalid={!!errors.partName}
            feedbackInvalid={errors.partName}
            disabled={viewMode}
        />
        <CFormSelect
            aria-label="Default select example"
            label="Equipment Type"
            size="lg"
            onChange={(e) => handleChange(e, "equipmentTypeId")}
            value={formData.equipmentTypeId === null ? "": formData.equipmentTypeId}
            options={equipmentTypeOptions as any}
            invalid={!!errors.equipmentTypeId}
            feedbackInvalid={errors.equipmentTypeId} 
            disabled={viewMode}
            />
        </CForm>
        </CCol>
        <CCol xs={6}>
        <CForm>
        <CFormInput
            type="text"
            id="exampleFormControlInput2"
            label="Part Description"
            placeholder=""
            size="lg"
            onChange={(e) => handleChange(e, "description")}
            value={formData.description === null ? "": formData.description}
            //text="Must be 8-20 characters long."
            //aria-describedby="exampleFormControlInputHelpInline"
            invalid={!!errors.description}
            feedbackInvalid={errors.description}
            disabled={viewMode}
        />
        {!isGenset && 
        <CFormSelect
            aria-label="Default select example"
            label="Equipment Size"
            size="lg"
            options={sizeOptions as any}
            value={formData.sizeEquipmentId === null ? "": formData.sizeEquipmentId}
            onChange={(e) => handleChange(e, "sizeEquipmentId")}
            invalid={!!errors.sizeEquipmentId}
            feedbackInvalid={errors.sizeEquipmentId}
            disabled={viewMode}
        />}
        {isGenset && 
        <CFormSelect
            aria-label="Default select example"
            label="Genset Type"
            size="lg"
            options={sizeOptions as any}
            value={formData.gensetTypeId === null ? "": formData.gensetTypeId}
            onChange={(e) => handleChange(e, "gensetTypeId")}
            invalid={!!errors.gensetTypeId}
            feedbackInvalid={errors.gensetTypeId}
            disabled={viewMode}
        />}
        </CForm>
        </CCol>
        </CRow>
        <br/>
        <div className="clearfix">
        { displayImageUrl && <CImage
          align="start"
          rounded
          src={displayImageUrl}
          width={200}
          height="auto"
        />}
      </div>

      <div className="mb-3">
        {!viewMode && <CFormInput
          key={fileInputKey}
          type="file"
          id="formFileDisabled"
          label="Attach Image File"
          accept="image/*"
          onChange={handleImageSelect}
          disabled={viewMode}
        />}
      </div>

        <br/>
        <CreateTable 
          sections={formData.sections_data} 
          setSections={setSections}
          errors={errors}
          setSuccessMessage={setSuccessMessage}
          setShowSuccessModal={setShowSuccessModal}
          viewMode={viewMode}
        />
      </CCardBody>
      <CCardFooter>
        <CButton color="secondary" className="text-white" 
            onClick={() => navigate("/depot/parts-and-sections")}>
            <CIcon icon={cilArrowThickFromRight} className="me-2" />
            Go Back
          </CButton>
        { !viewMode && 
        <CButton color="primary" className="text-white" onClick={handleSubmit} style={{marginLeft: "3px"}}>
            <CIcon icon={cilSave} className="me-2" />
            {'Save P&S'}
        </CButton>}
      </CCardFooter>
    </CCard>
    <SuccesModalWithActions
      isEdit={isEdit}
      showSuccessModal={showSuccessModal}
      setShowSuccessModal={setShowSuccessModal}
      savedData={savedPart}
      recordIdKey="equipmentPartId"
      successMessage={successMessage}
      onClickCreateAnother={() => {
        setShowSuccessModal(false);
        setSavedPart(null);
        setSuccessMessage("");
        setImage(null);
        setImageUpload(null);
        setPreview(null);
        setFileInputKey((k) => k + 1);
        dispatch(setDefaultPart());
      }}
      onClickContinueEditing={() => {
        setShowSuccessModal(false);
        setSuccessMessage("");
        const id = isEdit || savedPart?.equipmentPartId;
        navigate(`/depot/parts-and-sections/${id}`)
      }}
      onClickBackToOverview={() => {
        setSuccessMessage("")
        navigate("/depot/parts-and-sections")
      }}
      />
      <ErrorMessageModal
        showErrorModal={showErrorModal}
        setShowErrorModal={setShowErrorModal}
        errorMessage={errorMessage}
      />
    </div>
  );
};

export default PartsAndSectionEditPage;
