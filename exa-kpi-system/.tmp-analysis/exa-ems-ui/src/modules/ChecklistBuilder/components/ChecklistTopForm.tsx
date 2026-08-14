import React, { useMemo } from "react";
import AddPartModal from "./AddPartModal";
import CIcon from "@coreui/icons-react";
import PartBox from "./PartBox";
import { useNavigate } from "react-router-dom";

import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormSelect,
  CRow,
  CFormInput,
  CCardFooter,
  CFormSwitch,
  CMultiSelect,
} from "@coreui/react-pro";

import { cilPlus, cilSave, cilArrowThickFromRight } from "@coreui/icons";

export default function ChecklistTopForm(props: any) {
  const {
    // state
    data,
    FEerrors,
    BEerrors,
    isEdit,
    isGenset,
    showModal,
    multiResetKey,
    viewMode,

    // setters / actions
    setFormData,
    setSections,
    saveForm,
    toggleModal,
    removePart,
    storeDeletedFormItem,
    setShowErrorModal,
    setErrorMessage,
    setShowRefImageModal,
    setPartBoxClicked,

    // handlers
    onChange,
    onChangeMulti,
    normalizeMulti,
    getBoxErrors,
    getSectionOptions,

    // options / lists
    equipmentTypeOptions,
    depotOptions,
    gateTypeOptions,
    gensetTypeOptions,
    equipmentSizeOptions,
    clientOptions,
    partsList,
  } = props;


  const ErrMessage1 = "Error: At least one equipment part is required."
  const ErrMessage2 = "Error: All sections and instructions are required."

  const checklistNameValue = data.checkListName ?? "";
  const equipmentTypeValue = data.equipmentTypeId ?? "";
  const gateTypeValue = data.gateTypeId ?? "";
  const gensetTypeValue = data.gensetTypeId ?? "";
  const sizeEquipmentValue = data.sizeEquipmentId ?? "";

  const isEditDisabled = Boolean(isEdit);
  const isEquipmentSizeDisabled = isEditDisabled || data.equipmentTypeId === null;
  const isClientDisabled = Boolean(data.defaultConfig);
  const navigate = useNavigate();

const SectionOrInstructionErrors = () => {
    const { FEerrors } = props;    

    if (!FEerrors) return false;

    let FEerrorsFound = false;

    Object.keys(FEerrors).forEach((key) => {
        if (key.includes(`parts.`)) {
        FEerrorsFound = true;
        }
    });

    return FEerrorsFound;
}

  return (
    <CCard className="mb-4 shadow-sm trips-card">
      <CCardBody>
        <CRow>
          <CCol xs={12} md={6}>
            <CFormInput
              type="text"
              label="Checklist Name"
              name="checkListName"
              size="lg"
              required
              onChange={onChange}
              value={checklistNameValue}
              invalid={!!FEerrors?.checkListName}
              feedbackInvalid={FEerrors?.checkListName}
              disabled={viewMode}
            />

            <CFormSelect
              name="equipmentTypeId"
              label="Equipment-Type"
              size="lg"
              onChange={onChange}
              value={equipmentTypeValue}
              options={equipmentTypeOptions as any}
              disabled={isEditDisabled || viewMode}
              invalid={!!FEerrors?.equipmentTypeId}
              feedbackInvalid={FEerrors?.equipmentTypeId}
            />

            <CMultiSelect
              name="depotIds"
              label="Depots"
              size="lg"
              key={`depots-${multiResetKey}`}
              options={depotOptions as any}
              value={data.depotIds ?? []}
              onChange={(vals) => onChangeMulti("depotIds", normalizeMulti(vals))}
              invalid={!!FEerrors?.depotIds}
              feedbackInvalid={FEerrors?.depotIds}
              disabled={viewMode}
            />

            <br />

            <CFormSwitch
              size="xl"
              label="Owned Equipment"
              name="ownedEquipment"
              checked={Number(data.ownedEquipment) === 1}
              onChange={onChange}
              disabled={isEditDisabled || viewMode}
            />

            <br />

            <CFormSwitch
              size="xl"
              label="Active"
              name="active"
              checked={Number(data.active) === 1}
              onChange={onChange}
              disabled={viewMode}
            />
          </CCol>

          {/* RIGHT */}
          <CCol xs={12} md={6}>
            <CFormSelect
              name="gateTypeId"
              label="Gate"
              size="lg"
              onChange={onChange}
              value={gateTypeValue}
              options={gateTypeOptions as any}
              disabled={isEditDisabled || viewMode}
              invalid={!!FEerrors?.gateTypeId}
              feedbackInvalid={FEerrors?.gateTypeId}
            />

            {isGenset ? (
              <CFormSelect
                name="gensetTypeId"
                label="Genset Type"
                size="lg"
                onChange={onChange}
                value={gensetTypeValue}
                options={gensetTypeOptions as any}
                disabled={isEditDisabled || viewMode}
                invalid={!!FEerrors?.gensetTypeId}
                feedbackInvalid={FEerrors?.gensetTypeId}
              />
            ) : (
              <CFormSelect
                name="sizeEquipmentId"
                label="Equipment Size"
                size="lg"
                onChange={onChange}
                value={sizeEquipmentValue}
                options={equipmentSizeOptions as any}
                disabled={isEquipmentSizeDisabled || viewMode}
                invalid={!!FEerrors?.sizeEquipmentId}
                feedbackInvalid={FEerrors?.sizeEquipmentId}
              />
            )}

            <CMultiSelect
              name="clientIds"
              label="Applies For"
              size="lg"
              key={`clients-${multiResetKey}`}
              options={clientOptions as any}
              value={data.clientIds ?? []}
              onChange={(vals) => onChangeMulti("clientIds", normalizeMulti(vals))}
              disabled={isClientDisabled || viewMode || data.ownedEquipment === 1}
              invalid={!!FEerrors?.clientIds}
              feedbackInvalid={FEerrors?.clientIds}
            />

            <br />

            <CFormSwitch
              size="xl"
              label="Default Configuration"
              name="defaultConfig"
              checked={Number(data.defaultConfig) === 1}
              onChange={onChange}
              disabled={isEditDisabled || viewMode}
            />
          </CCol>
        </CRow>

        <br />

        {/* Actions */}
        {!viewMode && <CButton color="success" className="text-white" onClick={() => toggleModal(true)}>
          <CIcon icon={cilPlus} className="me-2" />
          Add Equipment Part
        </CButton>}

        {/* Parts */}
        <CRow>
          {(data.parts ?? []).map((part: any, index: number) => (
            <CCol xs={12} lg={6} key={part?.id ?? index}>
              <PartBox
                data={data}
                partData={part}
                partIndex={index}
                removePart={removePart}
                options={getSectionOptions(part.id)}
                toggleModal={toggleModal}
                setSections={setSections}
                errors={getBoxErrors(index)}
                storeDeletedFormItem={storeDeletedFormItem}
                setShowErrorModal={setShowErrorModal}
                setErrorMessage={setErrorMessage}
                setShowRefImageModal={setShowRefImageModal}
                viewMode={viewMode}
                setPartBoxClicked={setPartBoxClicked}
              />
            </CCol>
          ))}
        </CRow>
      </CCardBody>

      <CCardFooter>
        <CButton color="secondary" className="text-white" 
          onClick={() => navigate("/depot/checklist-builder")}>
          <CIcon icon={cilArrowThickFromRight} className="me-2" />
          Go Back
        </CButton>
        {!viewMode && 
        <CButton color="primary" className="text-white" onClick={saveForm} style={{marginLeft: "3px"}}>
          <CIcon icon={cilSave} className="me-2" />
          Save Checklist
        </CButton> 
        } 
      </CCardFooter>

      <AddPartModal
        data={data}
        toggleModal={toggleModal}
        isOpen={showModal}
        parts={partsList}
        isGenset={isGenset}
        setState={setFormData}
      />
      
    </CCard>
  );
}