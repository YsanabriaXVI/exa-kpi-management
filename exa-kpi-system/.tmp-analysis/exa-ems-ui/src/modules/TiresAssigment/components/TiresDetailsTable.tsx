// src/modules/TiresAssignment/components/TiresDetailsTable.tsx

import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash } from '@coreui/icons'
import type { TireDetail } from '../types/tiresAssignment.types'

interface Props {
  details: TireDetail[]
  setDetails: React.Dispatch<React.SetStateAction<TireDetail[]>>
}

const statusOptions = [
  { value: 1, label: 'Active' },
  { value: 0, label: 'Inactive' },
]

const TiresDetailsTable: React.FC<Props> = ({ details, setDetails }) => {
  const updateRow = (index: number, field: keyof TireDetail, value: any) => {
    setDetails((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: field.includes('Status') || field === 'position' ? Number(value) : value,
            }
          : row,
      ),
    )
  }

  const addRow = () => {
    setDetails((prev) => [
      ...prev,
      {
        position: prev.length + 1,
        outSideLeft: '',
        outSideLeftStatus: 1,
        inSideLeft: '',
        inSideLeftStatus: 1,
        outSideRight: '',
        outSideRightStatus: 1,
        inSideRight: '',
        inSideRightStatus: 1,
        status: 1,
      },
    ])
  }

  const removeRow = (index: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <CCard className="shadow-sm">
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <strong>Tires Details</strong>

        <CButton color="success" className="text-white" onClick={addRow}>
          <CIcon icon={cilPlus} className="me-2" />
          Add Position
        </CButton>
      </CCardHeader>

      <CCardBody>
        <div className="table-responsive">
          <CTable hover striped responsive className="align-middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Position</CTableHeaderCell>
                <CTableHeaderCell>Outside Left</CTableHeaderCell>
                <CTableHeaderCell>OL Status</CTableHeaderCell>
                <CTableHeaderCell>Inside Left</CTableHeaderCell>
                <CTableHeaderCell>IL Status</CTableHeaderCell>
                <CTableHeaderCell>Outside Right</CTableHeaderCell>
                <CTableHeaderCell>OR Status</CTableHeaderCell>
                <CTableHeaderCell>Inside Right</CTableHeaderCell>
                <CTableHeaderCell>IR Status</CTableHeaderCell>
                <CTableHeaderCell>Actions</CTableHeaderCell>
              </CTableRow>
            </CTableHead>

            <CTableBody>
              {details.map((row, index) => (
                <CTableRow key={index}>
                  <CTableDataCell>
                    <CFormInput
                      type="number"
                      value={row.position}
                      onChange={(e) => updateRow(index, 'position', e.target.value)}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormInput
                      value={row.outSideLeft ?? ''}
                      onChange={(e) => updateRow(index, 'outSideLeft', e.target.value)}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormSelect
                      value={row.outSideLeftStatus ?? 1}
                      onChange={(e) => updateRow(index, 'outSideLeftStatus', e.target.value)}
                      options={statusOptions}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormInput
                      value={row.inSideLeft ?? ''}
                      onChange={(e) => updateRow(index, 'inSideLeft', e.target.value)}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormSelect
                      value={row.inSideLeftStatus ?? 1}
                      onChange={(e) => updateRow(index, 'inSideLeftStatus', e.target.value)}
                      options={statusOptions}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormInput
                      value={row.outSideRight ?? ''}
                      onChange={(e) => updateRow(index, 'outSideRight', e.target.value)}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormSelect
                      value={row.outSideRightStatus ?? 1}
                      onChange={(e) => updateRow(index, 'outSideRightStatus', e.target.value)}
                      options={statusOptions}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormInput
                      value={row.inSideRight ?? ''}
                      onChange={(e) => updateRow(index, 'inSideRight', e.target.value)}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CFormSelect
                      value={row.inSideRightStatus ?? 1}
                      onChange={(e) => updateRow(index, 'inSideRightStatus', e.target.value)}
                      options={statusOptions}
                    />
                  </CTableDataCell>

                  <CTableDataCell>
                    <CButton
                      color="danger"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(index)}
                      disabled={details.length === 1}
                    >
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default TiresDetailsTable
