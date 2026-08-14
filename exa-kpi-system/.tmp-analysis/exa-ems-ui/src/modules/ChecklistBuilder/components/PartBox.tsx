import React, { useEffect, useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import BoxRow from './BoxRow'
import { RenderOptions } from '../../../helpers/RenderOptionsHelper';
import '../styles/ChecklistBuilder.css'

import {
  cilPlus,
  cilImage,
  cilXCircle
} from '@coreui/icons'

import {
  CCard,
  CCardBody,
  CCardHeader
} from '@coreui/react-pro'

/* ---------- Types ---------- */

type Id = string | number | null

export type Section = {
  name: string
  id: Id
  instruction: string
  // present when section already exists in DB
  checkListSectionId?: number | string
  [key: string]: any
}

export type PartData = {
  id: number
  name: string
  sections: Section[]
  [key: string]: any
}

export type OptionSource = {
  sectionId: string | number
  isoCode: string
  [key: string]: any
}

type RowErrors = { name?: any; instruction?: any } | false

/* ---------- Component ---------- */

const PartBox: React.FC<any> = ({
  data: dataProp,
  partData,
  partIndex,
  options: optionsProp,
  errors,
  setSections,
  removePart,
  toggleModal,
  storeDeletedFormItem,
  setShowErrorModal,
  setErrorMessage,
  setShowRefImageModal,
  viewMode,
  setPartBoxClicked,
  //showErrorMessage,
}) => {
  // mirror the old state shape (you can simplify later if desired)
  const [data, setData] = useState<any>(dataProp)
  const [sections, setSectionsState] = useState<Section[]>(partData.sections ?? [])
  const [options, setOptionsState] = useState<OptionSource[]>(optionsProp ?? [])

  // sync props -> local state (replaces componentWillReceiveProps)
  useEffect(() => setData(dataProp), [dataProp])
  useEffect(() => setSectionsState(partData.sections ?? []), [partData.sections])
  useEffect(() => setOptionsState(optionsProp ?? []), [optionsProp])

  console.log('partData', partData);

const getRowErrors = (sectionIndex: number): RowErrors => {
  console.log('BOX errors: ', errors);
  if (!errors) return false;

  const rowErrors: { name?: string; instruction?: string } = {};
  const base = `parts[${partIndex}].sections[${sectionIndex}]`;

  Object.keys(errors).forEach((key) => {
    if (key.startsWith(`${base}.id`)) {
      rowErrors.name = errors[key];
    }

    if (key.startsWith(`${base}.instruction`)) {
      rowErrors.instruction = errors[key];
    }
  });

  console.log('rowErrors', rowErrors);

  return Object.keys(rowErrors).length > 0 ? rowErrors : false;
};

const getSectionOptions = (selectedSectionId: Id) => {
  const allOptions = RenderOptions(options, 'sectionId', 'isoCode') as Array<{
    label: string
    value: string | number
  }>

  const filteredOptions = [...allOptions]
  const addedSections = [...sections]
  const indexesToRemove: number[] = []

  addedSections.forEach((addedSection) => {
    const index = allOptions.findIndex(
      (opt) => opt.value === addedSection.id && opt.value !== selectedSectionId
    )
    if (index > -1) indexesToRemove.push(index)
  })

  indexesToRemove.sort((a, b) => b - a)
  indexesToRemove.forEach((idx) => filteredOptions.splice(idx, 1))

  // ✅ prepend placeholder
  return [{ label: 'Select Section...', value: '' }, ...filteredOptions]
}


const deleteRow = (sectionIndex: number) => {
  const sectionToDelete = sections?.[sectionIndex];
  const sectionIdToDelete = sectionToDelete?.id ?? null;

  if (sectionToDelete && "checkListSectionId" in sectionToDelete) {
    setErrorMessage("Cannot remove section that is already stored! Consider disabling current checklist and creating a new one.");
    setShowErrorModal(true);
    return;
  }

  const nextSections = (sections ?? []).filter((_, i) => i !== sectionIndex);

  // ✅ deep immutable update: clone parts array + clone the part object
  const nextData = {
    ...data,
    parts: (data?.parts ?? []).map((p: any, i: number) =>
      i === partIndex ? { ...p, sections: nextSections } : p
    ),
  };

  setData(nextData);
  setSectionsState(nextSections);

  // keep parent in sync (this already does immutable update in your parent)
  setSections(partIndex, nextSections);

  if (sectionIdToDelete != null) {
    storeDeletedFormItem(sectionIdToDelete, "REMOVE_SECTION");
  }
};


  const handleOpen = () => {
    const nextData = { ...data, part: partData }
    setData(nextData)
    toggleModal(true)
  }

  const handleChange = (
  e: any,
  sectionIndex: number
) => {
  const { name, value } = e.target
  const nextSections = [...sections]

  if (name === 'instruction') {
    nextSections[sectionIndex].instruction = value
  }

  if (name === 'name') {
    if (value === '') {
      nextSections[sectionIndex].id = null
      nextSections[sectionIndex].name = ''
    } else {
      const selectEl = e.target as HTMLSelectElement
      nextSections[sectionIndex].id = isNaN(Number(value)) ? value : Number(value)
      nextSections[sectionIndex].name = selectEl.options[selectEl.selectedIndex]?.text ?? ''
    }
  }

  setSectionsState(nextSections)

  // if you also mirror into data.parts[...] keep that update too (same as before)
}


const addRow = () => {
  const nextSections = (sections ?? []).concat({
    name: "",
    id: null,
    instruction: "",
  });

  // update local
  setSectionsState(nextSections);

  // update data immutably (deep enough)
  setData((prev: any) => {
    if (!prev?.parts?.[partIndex]) return prev;

    const nextParts = [...prev.parts];
    nextParts[partIndex] = {
      ...nextParts[partIndex],
      sections: nextSections,
    };

    return {
      ...prev,
      parts: nextParts,
    };
  });

  // notify parent
  setSections(partIndex, nextSections);
};


  // render list once per change
  const renderedRows = useMemo(
    () =>
      sections.map((section, index) => (
        <BoxRow
          key={`${String(section.id ?? 'new')}-${index}`}
          section={section as any}
          options={getSectionOptions(section.id)}
          deleteRow={deleteRow}
          onChange={handleChange}
          index={index}
          errors={getRowErrors(index)}
          disabled={'checkListSectionId' in section || viewMode}
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sections, options, errors, data]
  )

  return (
    <CCard className="part-box-container animated fadeIn">
      <CCardHeader>
        <div className="box-header">
          <p className="eq-part-name">{partData.name}</p>

         {!viewMode && <CIcon 
            icon={cilPlus} 
            size='lg'
            className="box-icn"
            onClick={addRow}
            onKeyDown={(e) => e.key === 'Enter' && addRow()}
            role="button"
            tabIndex={0}
          />}

          {!viewMode && <CIcon
            icon={cilImage}
            size='lg'
            className="fa fa-image box-icn"
            onClick={() =>{ 
              setShowRefImageModal(true)
              setPartBoxClicked(Number(partData.id))}}
            //onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
            role="button"
            tabIndex={0}
          />}

          {!viewMode && <CIcon
            icon={cilXCircle}
            size='lg'
            className="fa fa-close box-icn"
            onClick={() => removePart(partData.id)}
            onKeyDown={(e) => e.key === 'Enter' && removePart(partData.id)}
            role="button"
            tabIndex={0}
          />}
        </div>
      </CCardHeader>

      <CCardBody className="part-box-body">{renderedRows}</CCardBody>
    </CCard>
  )
}

export default PartBox
