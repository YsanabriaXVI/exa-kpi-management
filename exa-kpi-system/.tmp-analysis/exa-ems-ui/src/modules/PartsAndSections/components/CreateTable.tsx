
import React, { useEffect, useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid';
import ximage from '../components/icons8-x-48.png'

import {
  CSmartTable,
  CButton,
  CAvatar, CBadge, CCollapse, CFormInput,
  CModal, CModalBody, CModalFooter, CModalHeader
} from '@coreui/react-pro'

import { set, type AppDispatch } from '../../../store'
import { useDispatch } from 'react-redux'

import { CIcon } from '@coreui/icons-react';
import { cilTrash } from '@coreui/icons'
import ConfirmDialog from '../../../components/ConfirmationModal';
import { deleteSection } from '../store/partsAndSectionsSlice';

//import type { Item } from '@coreui/react-pro/components/smart-table/types'

export interface Section {
  sectionID?: string
  sectionId?: string
  code: string
  isoCode: string
  coordinates?: string
  description: string
  [key: string]: any
}

export type SectionError = {
  [field: string]: string | undefined
}

export interface ErrorMessage {
  rowIndex: number
  message: string
}

interface CreateTableProps {
  sections: Section[]
  setSections: (sections: Section[]) => void
  errors: any
  errorMessage?: ErrorMessage | null
  setSuccessMessage: (arg: string) => void
  setShowSuccessModal: (arg: boolean) => void
  viewMode?: boolean
}


  const columns = [
    { key: 'code'},
    { key: 'isoCode' },
    { key: 'coordinates' },
    { key: 'description' },
    {
      key: 'actions',
      label: '',
      _style: { width: '1%' },
      filter: false,
      sorter: false,
    },
  ]

const CreateTable: React.FC<CreateTableProps> = ({ 
  sections = [], 
  setSections, 
  errors, 
  setSuccessMessage, 
  setShowSuccessModal, 
  viewMode 
}) => {

  console.log("sections prop", sections);

  const [details, setDetails] = useState<number[]>([])
  const initialized = useRef(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogOptions, setDialogOptions] = useState({
    title: "",
    message: "Are you sure you want to delete this record?",
    onConfirm: null as null | (() => void)
  });
  const dispatch = useDispatch<AppDispatch>()


  const assignTempUUID = () => {
  const _sections = sections.map((section) => ({
    ...section,            
    rowID: uuidv4(),      
    }));
    setSections(_sections);
  };

  useEffect(() => {
    if (!initialized.current && sections && sections.length > 0) {
      assignTempUUID();
      initialized.current = true;
    }
  }, [sections]);


  const addRow = () => {
    const _sections = [...sections];
    _sections.push({
      rowID: uuidv4(),
      code: 'Click to Edit...',
      isoCode: 'Click to Edit...',
      coordinates: 'Click to Edit...',
      description: 'Click to Edit...',
    });
    setSections(_sections);
  };

   const handleChange = (e: any, field: string, index: number) => {
    const _sections = [...sections];
    _sections[index] = {..._sections[index], [field]: e.target.value}
    setSections(_sections);
  };

  const removeRow = async(index: number) => {
    const _sections = [...sections];
    console.log("ROW TO DELETE: ", _sections[index]);
    if ('sectionId' in _sections[index]) {
      const id = Number(_sections[index].sectionId)
      const result = await dispatch(deleteSection({id}));
      if (result.meta.requestStatus === 'fulfilled') {
        setSuccessMessage(`Section deleted successfully!`);
        setShowSuccessModal(true);
      } else {
        throw new Error('Failed to delete section');
      }
    } else {
      _sections.splice(index, 1);
      setSections(_sections);
    }

  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  setDialogOptions({ title, message, onConfirm });
  setShowDialog(true);
};

  return (
    <div>
      <CSmartTable
      //activePage={2}
      //cleaner
      //clickableRows
      columns={columns}
      columnFilter
      columnSorter
      footer
      items={sections}
      //itemsPerPageSelect
      itemsPerPage={sections.length}
      pagination={false}
      onFilteredItemsChange={(items) => {
        console.log('onFilteredItemsChange')
        console.table(items)
      }}
      onSelectedItemsChange={(items) => {
        console.log('onSelectedItemsChange')
        console.table(items)
      }}
      scopedColumns={{
        code: (item: Section, index: number) => (
            <td className="text-center">
              <CFormInput
                value={item.code === 'Click to Edit...' ? '' : item.code ?? ''}
                placeholder={item.code === 'Click to Edit...' ? 'Click to Edit...' : ''}
                onChange={(e) => handleChange(e, "code", index)}
                invalid={!!errors[`sections_data[${index}].code`]}
                feedbackInvalid={errors[`sections_data[${index}].code`]}
                disabled={viewMode}
              />
            </td>
        ),
        isoCode: (item: Section, index: number) => (
            <td className="text-center">
              <CFormInput
                value={item.isoCode === 'Click to Edit...' ? '' : item.isoCode ?? ''}
                placeholder={item.isoCode === 'Click to Edit...' ? 'Click to Edit...' : ''}
                onChange={(e) => handleChange(e, "isoCode", index)}
                invalid={!!errors[`sections_data[${index}].isoCode`]}
                feedbackInvalid={errors[`sections_data[${index}].isoCode`]}
                disabled={viewMode}
              />
            </td>
          ),
        coordinates: (item: Section, index: number) => (
            <td className="text-center">
              <CFormInput
                value={item.coordinates === 'Click to Edit...' ? '' : item.coordinates ?? ''}
                placeholder={item.coordinates === 'Click to Edit...' ? 'Click to Edit...' : ''}
                onChange={(e) => handleChange(e, "coordinates", index)}
                invalid={!!errors[`sections_data[${index}].coordinates`]}
                feedbackInvalid={errors[`sections_data[${index}].coordinates`]}
                disabled={viewMode}
              />
            </td>
          ),
        description: (item: Section, index: number) => (
            <td className="text-center">
              <CFormInput
                value={item.description === 'Click to Edit...' ? '' : item.description ?? ''}
                placeholder={item.description === 'Click to Edit...' ? 'Click to Edit...' : ''}
                onChange={(e) => handleChange(e, "description", index)}
                invalid={!!errors[`sections_data[${index}].description`]}
                feedbackInvalid={errors[`sections_data[${index}].description`]}
                disabled={viewMode}
              />
            </td>
          ),
        actions: (item: Section, index: number) => {
          return (
            <td className="py-2">
            <CButton color="danger"
            onClick={() => 
              showConfirm("Delete Confirmation", "Are you sure you want to delete this record?", () => {
              removeRow(index);
              })}
              disabled={viewMode}
            >
              <CIcon icon={cilTrash} />
            </CButton>
            </td>
          )
        },
      }}
      //selectable
      tableFilter
      tableProps={{
        className: 'add-this-custom-class',
        responsive: true,
        //striped: true,
        //hover: true,
      }}
      tableBodyProps={{
        className: 'align-middle',
      }}
    />
    {!viewMode && <div className="d-grid gap-2 col-1 mx-auto">
      !<CButton color="success" onClick={addRow}>Add Row +</CButton>
    </div>}
      <ConfirmDialog
        visible={showDialog}
        title={dialogOptions.title}
        message={dialogOptions.message}
        onClose={() => setShowDialog(false)}
        onConfirm={dialogOptions.onConfirm || undefined}
      />
    </div>
  );
};

export default CreateTable;