import React from 'react'
import CIcon from '@coreui/icons-react'
//import Col from 'reactstrap/lib/Col'
//import Row from 'reactstrap/lib/Row'
//import { Input, Select } from '../../../components/FormFieldsWithError'
//import '../styles/ChecklistBuilder.css'

import {
  CCol,
  CFormSelect,
  CRow,
  CFormInput,
  CButton
} from '@coreui/react-pro'

import {
  cilTrash
} from '@coreui/icons'

/* 🔹 Types */

interface Section {
  id?: string | number
  [key: string]: any
}

type SelectOption = { value: string | number; label: string }

type BoxRowChangeEvent =
  | React.ChangeEvent<HTMLInputElement>
  | { target: { name: 'name'; selectedItem: SelectOption } }

interface BoxRowProps {
  options: any[]
  errors?: any
  section: Section
  index: number
  disabled?: boolean
  onChange: (
    e: BoxRowChangeEvent,
    index: number
  ) => void
  deleteRow: (index: number) => void
}

/* 🔹 Component */

const BoxRow: React.FC<BoxRowProps> = ({
  options,
  errors,
  section,
  index,
  disabled,
  onChange,
  deleteRow,
}) => {

  return (
    <CRow className="g-3 mt-1">
      <CCol sm={12} xl={5}>
        <CFormSelect
          name="name"                
          size="lg"
          value={section.id ?? ''}   
          onChange={(e: any) => onChange(e, index)}
          options={options}
          disabled={disabled}
          invalid={!!errors.name}
          feedbackInvalid={errors.name} 
        />

      </CCol>

      <CCol sm={12} xl={6}>
        <CFormInput
          name="instruction"
          type="text"
          placeholder="Add an instruction.."
          size="lg"
          value={section.instruction ?? ''}  
          onChange={(e) => onChange(e, index)} 
          disabled={disabled}
          invalid={!!errors.instruction}
          feedbackInvalid={errors.instruction}
        />

      </CCol>

      <CCol sm={12} xl={1}>
        <CButton
          size="lg"
          color="danger"
          variant="ghost"
          onClick={() => deleteRow(index)}
          onKeyDown={(e: React.KeyboardEvent<HTMLElement>) =>
            e.key === 'Enter' && deleteRow(index)
          }
          disabled={disabled}
        >
          <CIcon icon={cilTrash} />
        </CButton>
      </CCol>
    </CRow>
  )
}

export default BoxRow
