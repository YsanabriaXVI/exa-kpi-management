import React, { useState } from 'react'
import {
  CButton,
  CFormSelect,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CBadge,
  CCardFooter,
  CFooter
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilTrash } from '@coreui/icons'
import { EquipmentRequirement, Option, Trip } from '../../EquipmentRequest/types'
import ConfirmDialog from 'src/components/ConfirmationModal'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch } from 'src/store'
import { deleteRequirement, bootstrapWorkOrderEquipmentRequestEdit } from '../../EquipmentRequest/store/equipmentRequest.slice'

import { MODULE_EQUIPMENT_REQUEST } from 'src/constants/modules'
import { permissionService, DELETE } from '../../../services/auth/permission.service'
import { Link } from 'react-router-dom'
import type { WorkOrderTrip } from '../types'


const canDelete = permissionService.checkPermission(MODULE_EQUIPMENT_REQUEST, DELETE)

type Props = {
  rows: EquipmentRequirement[]
  current: any
  isTripRequest?: boolean
  sizeOptions: [Option[], Option[]]
  trips: WorkOrderTrip[]
  onCellChange: (rowIndex: number, field: string, value: string) => void
  onDeleteRow: (rowIndex: number) => void
  errors?: string
  isView?: boolean
  onChange: (field: string, idx: number, v: any) => void
}

export function RequestTable({
  rows,
  current,
  isTripRequest = true,
  sizeOptions,
  trips,
  onCellChange,
  onDeleteRow,
  errors,
  isView,
  onChange
}: Props) {

   const dispatch = useDispatch<AppDispatch>()

  const getChassisOptions = (containerSizeId: number | string) => {
  if (!containerSizeId) return sizeOptions[1]

  const selectedId = Number(containerSizeId)

  const container = sizeOptions[0].find(
    (option: any) => Number(option.value) === selectedId
  )

  if (!container) return []

  const relatedSizes =
    container?.relatedSizes?.map((x: any) => Number(x.relatedSizeId)) ?? []

  return sizeOptions[1].filter(
    (size: any) => relatedSizes.includes(Number(size.value))
  )
}

const isFridgeContainer = (containerSizeId: number | string) => {
  const selectedId = Number(containerSizeId)
  const container = sizeOptions[0].find(
    (option: any) => Number(option.value) === selectedId
  )
  return !!container?.fridge
}

  const isLocked = (tripid: number) => {
    const trip = trips.find((t: any) => t.trip_id === tripid)
     const isLocked = !!trip?.payment || !!trip?.invoice || (!!trip?.close_trip_date && trip?.close_trip_date !== '')
     return isLocked;
  }

  const [showDialog, setShowDialog] = useState(false);
  const [notice, setNotice] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [dialogOptions, setDialogOptions] = useState({
    title: "",
    message: "Are you sure you want to delete this record?",
    onConfirm: null as null | (() => void)
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  setDialogOptions({ title, message, onConfirm });
  setShowDialog(true);
};

  const deleteRow = async (row: any, rowIndex: number) => {
  showConfirm(
    "Delete Confirmation",
    `Are you sure you want to delete requirement #${row.requestId}?`,
    async () => {
      try {
        const result = await dispatch(deleteRequirement(row.requestId as any));

        if (result?.meta?.requestStatus === "fulfilled") {
          //setSuccessMessage("Request deleted successfully!");
          //setShowSuccessModal(true);
          const workOrderId = current?.requestDetails?.workOrderId ?? undefined;
          dispatch(bootstrapWorkOrderEquipmentRequestEdit({ id: workOrderId ?? undefined }))
        } else {
          throw new Error("Failed to delete equipment request");
        }
      } catch (error) {
        console.error("Delete failed:", error);
      }
    }
  );
};

  return (
    <div className="mt-2">
      <CTable className="eq-table">
        <colgroup>
          <col />
          <col />
          <col />
          <col />
          <col />
          <col />
          <col />
        </colgroup>

        <CTableHead>
          <CTableRow>
            <CTableHeaderCell style={{width: '8%'}}>Trip Id</CTableHeaderCell>
            <CTableHeaderCell style={{width: '10%'}}>Container Ref *</CTableHeaderCell>
            <CTableHeaderCell style={{width: '8%'}}>State</CTableHeaderCell>
            <CTableHeaderCell style={{width: '8%'}}>Requirement ID</CTableHeaderCell>
            <CTableHeaderCell style={{width: '20%'}}>Container</CTableHeaderCell>
            <CTableHeaderCell style={{width: '20%'}}>Chassis</CTableHeaderCell>
            <CTableHeaderCell style={{width: '20%'}}>Genset</CTableHeaderCell>
            <CTableHeaderCell style={{width: '6%'}}>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>

        <CTableBody>
          {rows.map((row, idx) => {
            const LockedTrip = isLocked(row.tripId as number);
            const isSaved = row?.requestId ?? false;
            const trip = trips.find((t: any) => t.trip_id === row.tripId);
            let isEdited = false;

            if (isSaved) {
              const savedRow = current?.requirements.find((r: any) => Number(r?.requestId) === Number(row?.requestId));
              isEdited = Number(savedRow?.chassisSizeId) !== Number(row?.chassisSizeId) || 
              Number(savedRow?.containerSizeId) !== Number(row?.containerSizeId) || 
              Number(savedRow?.genset) !== Number(row?.genset) ||
              Number(savedRow?.equipmentClientContainer) !== Number(row?.equipmentClientContainer) ||
              Number(savedRow?.equipmentClientChassis) !== Number(row?.equipmentClientChassis) ||
              Number(savedRow?.equipmentClientGenset) !== Number(row?.equipmentClientGenset)
            }

          return (
            <CTableRow key={(row as any).requestId ?? idx}>
                <CTableDataCell>
                  {row.tripId ? (
                    <Link
                      to={`/operations/trips/${row.tripId}`}
                      className="text-decoration-none font-weight-bold"
                    >
                      <strong className="text-primary">{row.tripId}</strong>
                    </Link>
                  ) : (
                    <strong className="text-primary">—</strong>
                  )}
                   {LockedTrip && (
                    <div className="mt-1">
                      <CBadge color="dark" size="sm" shape="rounded-pill">
                        Locked
                      </CBadge>
                    </div>
                  )}
                </CTableDataCell>
                <CTableDataCell>{trip?.container_ref}</CTableDataCell>
              
                <CTableDataCell>
                  { isSaved && !isEdited ? (
                    <div className="mt-1">
                      <CBadge color="success" size="sm" shape="rounded-pill">
                        SAVED
                      </CBadge>
                    </div>
                  ) : (
                    <div className="mt-1">
                      <CBadge color="secondary" size="sm" shape="rounded-pill">
                        UNSAVED
                      </CBadge>
                    </div>
                  )
                  }
                </CTableDataCell>
                <CTableDataCell>
                  {(
                    <p>{row?.requestId ?? '-'}</p>
                  )}
                </CTableDataCell>
              <CTableDataCell>
                <CFormSelect
                  value={(row as any).containerSizeId ?? ''}
                  onChange={(e) => onChange("containerSizeId", idx, e.target.value)}
                  disabled
                  size="sm"
                >
                  <option value=""></option>
                  {sizeOptions[0]
                  .map((o) => (
                    <option key={String(o.value)} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </CFormSelect>
              </CTableDataCell>

              <CTableDataCell>
                <CFormSelect
                  value={(row as any).chassisSizeId ?? ''}
                  onChange={(e) => onChange("chassisSizeId", idx, e.target.value)}
                  disabled={isView}
                  size="sm"
                >
                  <option value=""></option>
                  {getChassisOptions((row as any).containerSizeId)?.map((o) => (
                    <option key={String(o.value)} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </CFormSelect>
              </CTableDataCell>

              <CTableDataCell>
                <CFormSelect
                  size="sm"
                  value={(row as any).genset === 1 ? 'yes' : 'no'} // MODIFY 12345
                   
                  onChange={(e) => onChange("genset", idx, e.target.value)}
                  disabled
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </CFormSelect>
              </CTableDataCell>

              <CTableDataCell>
                <CButton
                  color="danger"
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteRow(row, idx)}
                  disabled={isView || !canDelete}
                  title="Remove Requirement"
                >
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              </CTableDataCell>
            </CTableRow>
          )})}
        </CTableBody>
      </CTable>
      {errors && <div className="text-danger text-center mt-2">{errors}</div>}
       <ConfirmDialog
        visible={showDialog}
        title={dialogOptions.title}
        message={dialogOptions.message}
        onClose={() => setShowDialog(false)}
        onConfirm={dialogOptions.onConfirm || undefined}
      />
    </div>
  )
}

export default RequestTable;