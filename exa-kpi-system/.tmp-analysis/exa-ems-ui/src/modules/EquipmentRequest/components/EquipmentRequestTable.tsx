import React, { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  CButton,
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
import { data, Link } from 'react-router-dom'
import { cilSearch, cilTrash } from '@coreui/icons'
import { EquipmentRequirement, Option, Trip } from '../types'
import {
  CHASSIS_LABEL_KEY,
  CONTAINER_LABEL_KEY,
  DELETE_ALL_ACTION,
  DELETE_MANY_ACTION,
  DECREMENT_ACTION,
  EQUIPMENT_LABEL_KEYS_ARRAY,
  EQUIPMENT_SIZE_ID_KEYS_ARRAY,
  INCREMENT_ACTION,
  PLACEHOLDER,
  REQUEST_ID_KEY,
  TRIP_LABEL_KEY,
} from './feConstants'

import { MODULE_EQUIPMENT_REQUEST } from 'src/constants/modules'
import { permissionService, DELETE } from '../../../services/auth/permission.service'

// Permission checks
const canDelete = permissionService.checkPermission(MODULE_EQUIPMENT_REQUEST, DELETE)

type CounterAction = [number | null, string | null]

type Props = {
  rows: EquipmentRequirement[]
  setRows: (rows: EquipmentRequirement[]) => void
  deletedIds: number[]
  setDeletedIds: (ids: number[]) => void
  counter: [number, number, number]
  counterAction: CounterAction
  isTripRequest: boolean
  sizeOptions: [Option[], Option[]]
  trips: Trip[]
  onCellChange: (rowIndex: number, field: string, value: string) => void
  onDeleteRow: (rowIndex: number) => void
  errors?: string
  isView?: boolean
  isEdit: boolean
}

const newRowObject: Partial<EquipmentRequirement> = {
  tripId: null,
  equipmentClientContainer: null,
  equipmentClientChassis: null,
  equipmentClientGenset: null,
}

export function EquipmentRequestTable({
  rows,
  setRows,
  deletedIds,
  setDeletedIds,
  counter,
  counterAction,
  isTripRequest,
  sizeOptions,
  trips,
  onCellChange,
  onDeleteRow,
  errors,
  isView,
  isEdit,
}: Props) {
  const [filters, setFilters] = useState({
  trip: '',
  container: '',
  chassis: '',
  genset: '',
  requestId: '',
  gate: '',
})

const deferredFilters = useDeferredValue(filters)

  useEffect(() => {
    const equipmentType = counterAction[0]
    const actionType = counterAction[1]
    if (equipmentType == null || !actionType) return

    const sizeIdFor = EQUIPMENT_SIZE_ID_KEYS_ARRAY
    const labelFor = EQUIPMENT_LABEL_KEYS_ARRAY
    const maxCounter = Math.max(...counter)
    const lastIndex = counter[equipmentType]
    const popLastRow = counter[equipmentType] === maxCounter
    const isGenset = equipmentType === 2

    const nextRows = [...rows]
    const nextDeleted = [...deletedIds]

    const ensureRow = (i: number) => {
      if (!nextRows[i]) {
        nextRows[i] = {
          ...(newRowObject as EquipmentRequirement),
          tripId: null,
          containerSizeId: null,
          chassisSizeId: null,
          genset: null,
          equipmentClientContainer: 0,
          equipmentClientChassis: 0,
          equipmentClientGenset: 0,
          containerlabel: null,
          chassislabel: null,
          gensetlabel: null,
          triplabel: PLACEHOLDER,
        }
      }
    }

    switch (actionType) {
      case INCREMENT_ACTION: {
        for (let i = 0; i < counter[equipmentType]; i++) {
          ensureRow(i)

          const sizeKey = sizeIdFor[equipmentType]
          const labelKey = labelFor[equipmentType]

          if ((nextRows[i] as any)[sizeKey] == null || (nextRows[i] as any)[sizeKey] === 0) {
            ;(nextRows[i] as any)[sizeKey] = null
            ;(nextRows[i] as any)[labelKey] = isGenset ? 'Yes' : PLACEHOLDER
            if (isGenset) nextRows[i].genset = 1
          }

          if (!(nextRows[i] as any).triplabel) (nextRows[i] as any).triplabel = PLACEHOLDER
        }
        break
      }

      case DECREMENT_ACTION: {
        if (popLastRow) {
          const row = nextRows[lastIndex]
          if (!row) break
          const createdId = REQUEST_ID_KEY in row && (row as any).requestId
          if (createdId) nextDeleted.push((row as any).requestId as number)
          nextRows.pop()
        } else {
          const row = nextRows[lastIndex]
          if (!row) break
          const sizeKey = sizeIdFor[equipmentType]
          const labelKey = labelFor[equipmentType]
          ;(row as any)[sizeKey] = isGenset ? 0 : null
          ;(row as any)[labelKey] = null
          if (isGenset) row.genset = 0
        }
        break
      }

      case DELETE_MANY_ACTION:
      case DELETE_ALL_ACTION: {
        for (let i = counter[equipmentType]; i < nextRows.length; i++) {
          const sizeKey = sizeIdFor[equipmentType]
          const labelKey = labelFor[equipmentType]
          ;(nextRows[i] as any)[sizeKey] = isGenset ? 0 : null
          ;(nextRows[i] as any)[labelKey] = null
          if (isGenset) nextRows[i].genset = 0
        }

        for (let i = nextRows.length - 1; i >= maxCounter; i--) {
          const row = nextRows[i]
          const createdId = REQUEST_ID_KEY in row && (row as any).requestId
          if (createdId) nextDeleted.push((row as any).requestId as number)
          nextRows.pop()
        }
        break
      }

      default:
        break
    }

    setDeletedIds(nextDeleted)
    setRows(nextRows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter])

  const tripOptions: Option[] = useMemo(
    () => trips.map((t) => ({ label: String(t.tripsid), value: t.tripsid })),
    [trips],
  )

  const containerLabelById = useMemo(() => {
  const map = new Map<string, string>()
  sizeOptions[0].forEach((opt) => {
    map.set(String(opt.value), String(opt.label))
  })
  return map
}, [sizeOptions])

const chassisLabelById = useMemo(() => {
  const map = new Map<string, string>()
  sizeOptions[1].forEach((opt) => {
    map.set(String(opt.value), String(opt.label))
  })
  return map
}, [sizeOptions])

  const tripLabelById = useMemo(() => {
    const map = new Map<string, string>()
    tripOptions.forEach((opt) => {
      map.set(String(opt.value), String(opt.label))
    })
    return map
  }, [tripOptions])

  const includesText = (value: unknown, search: string) => {
    if (!search.trim()) return true
    return String(value ?? '')
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  }

  const getChassisOptions = (containerSizeId: number | string) => {
    if (!containerSizeId) return sizeOptions[1]

    const selectedId = Number(containerSizeId)

    const container = sizeOptions[0].find(
      (option: any) => Number(option.value) === selectedId,
    )

    if (!container) return []

    const relatedSizes =
      container?.relatedSizes?.map((x: any) => Number(x.relatedSizeId)) ?? []

    return sizeOptions[1].filter((size: any) =>
      relatedSizes.includes(Number(size.value)),
    )
  }

  const filteredRows = useMemo(() => {
  const tripFilter = deferredFilters.trip.trim().toLowerCase()
  const idFilter = deferredFilters.requestId.trim().toLowerCase()
  const gateFilter = deferredFilters.gate.trim().toLowerCase()
  const containerFilter = deferredFilters.container.trim().toLowerCase()
  const chassisFilter = deferredFilters.chassis.trim().toLowerCase()
  const gensetFilter = deferredFilters.genset.trim().toLowerCase()

  return rows
    .map((row, originalIndex) => ({ row, originalIndex }))
    .filter(({ row, originalIndex }) => {
      const tripText =
        (row as any).tripId != null && (row as any).tripId !== ''
          ? tripLabelById.get(String((row as any).tripId)) ?? String((row as any).tripId)
          : ''

       const IDText =
        (row as any).requestId != null && (row as any).requestId !== ''
          ? String((row as any).requestId)
          : ''

      const containerText =
        counter[0] > originalIndex
          ? containerLabelById.get(String((row as any).containerSizeId)) ?? ''
          : ''

      const chassisText =
        counter[1] > originalIndex
          ? chassisLabelById.get(String((row as any).chassisSizeId)) ?? ''
          : ''

      const gensetText = (row as any).genset ? 'yes' : ''

      const gateText =
      (row as any).gate?.gateId != null && (row as any).gate?.gateId !== ''
        ? String((row as any).gate.gateId)
        : ''

      return (
        (!tripFilter || tripText.toLowerCase().includes(tripFilter)) &&
        (!idFilter || IDText.toLowerCase().includes(idFilter)) &&
        (!gateFilter || gateText.toLowerCase().includes(gateFilter)) &&
        (!containerFilter || containerText.toLowerCase().includes(containerFilter)) &&
        (!chassisFilter || chassisText.toLowerCase().includes(chassisFilter)) &&
        (!gensetFilter || gensetText.includes(gensetFilter))
      )
    })
}, [
  rows,
  deferredFilters,
  tripLabelById,
  containerLabelById,
  chassisLabelById,
  counter,
])

  return (
    <div className="mt-2">
      <CTable bordered className="eq-table">
        <colgroup>
          <col className="col-row" />
          { isEdit && <col className="col-id" />}
          { isEdit && <col className="col-id" />}
          {isTripRequest && <col className="col-id" />}
          <col className="col-main" />
          <col className="col-main" />
          <col className="col-main" />
          <col className="col-actions" />
        </colgroup>

        <CTableHead> 
          <CTableRow>
            <CTableHeaderCell>Row#</CTableHeaderCell>
            { isEdit && <CTableHeaderCell>Requirement id</CTableHeaderCell>}
            { isEdit && <CTableHeaderCell>Gate Out id</CTableHeaderCell>}
            {isTripRequest && <CTableHeaderCell>Trip</CTableHeaderCell>}
            <CTableHeaderCell>Container</CTableHeaderCell>
            <CTableHeaderCell>Chassis</CTableHeaderCell>
            <CTableHeaderCell>Genset</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>

        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>
              <CIcon icon={cilSearch} />
            </CTableHeaderCell>
            
            { isEdit && <CTableHeaderCell>
              <CFormInput
                value={filters.requestId}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, requestId: e.target.value }))
                }
                placeholder="Filter Id"
              />
            </CTableHeaderCell> }
            { isEdit && <CTableHeaderCell>
              <CFormInput
                value={filters.gate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, gate: e.target.value }))
                }
                placeholder="Filter gate id"
              />
            </CTableHeaderCell>}

            {isTripRequest && (
              <CTableHeaderCell>
                <CFormInput
                  value={filters.trip}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, trip: e.target.value }))
                  }
                  placeholder="Filter trip"
                />
              </CTableHeaderCell>
            )}

            <CTableHeaderCell>
              <CFormInput
                value={filters.container}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, container: e.target.value }))
                }
                placeholder="Filter container"
              />
            </CTableHeaderCell>

            <CTableHeaderCell>
              <CFormInput
                value={filters.chassis}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, chassis: e.target.value }))
                }
                placeholder="Filter chassis"
              />
            </CTableHeaderCell>

            <CTableHeaderCell>
              <CFormInput
                value={filters.genset}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, genset: e.target.value }))
                }
                placeholder="Filter genset"
              />
            </CTableHeaderCell>

            <CTableHeaderCell></CTableHeaderCell>
          </CTableRow>
        </CTableHead>

        <CTableBody>
          {filteredRows.map(({ row, originalIndex }) => (
            <CTableRow key={(row as any).requestId ?? originalIndex}>
              <CTableDataCell>{originalIndex + 1}</CTableDataCell>
              { isEdit && <CTableDataCell><strong>{(row as any).requestId ?? '-'}</strong>
              </CTableDataCell>}
             { isEdit && <CTableDataCell>
             <Link
                to={`/depot-main/gates/${(row as any).gate?.gateId}/OUT`}
                className="text-decoration-none font-weight-bold"
              >
                <strong>{(row as any).gate?.gateId ?? ''}</strong>
              </Link>
              </CTableDataCell>}
              {isTripRequest && (
                <CTableDataCell>
                  <CFormSelect
                    value={(row as any).tripId ?? ''}
                    onChange={(e) =>
                      onCellChange(originalIndex, TRIP_LABEL_KEY, e.target.value)
                    }
                    disabled
                  >
                    <option value="">Select trip...</option>
                    {tripOptions.map((o) => (
                      <option key={String(o.value)} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CTableDataCell>
              )}

              <CTableDataCell>
                {counter[0] > originalIndex && (
                  <CFormSelect
                    value={(row as any).containerSizeId ?? ''}
                    onChange={(e) =>
                      onCellChange(originalIndex, CONTAINER_LABEL_KEY, e.target.value)
                    }
                    disabled={isView || isTripRequest}
                  >
                    <option value="">
                      {(row as any).requestId ? '' : 'Select size...'}
                    </option>
                    {sizeOptions[0].map((o) => (
                      <option key={String(o.value)} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                )}
              </CTableDataCell>

              <CTableDataCell>
                {counter[1] > originalIndex && (
                  <CFormSelect
                    value={(row as any).chassisSizeId ?? ''}
                    onChange={(e) =>
                      onCellChange(originalIndex, CHASSIS_LABEL_KEY, e.target.value)
                    }
                    disabled={isView}
                  >
                    <option value="">
                      {(row as any).requestId ? '' : 'Select size...'}
                    </option>
                    {getChassisOptions((row as any).containerSizeId ?? '').map((o) => (
                      <option key={String(o.value)} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </CFormSelect>
                )}
              </CTableDataCell>

              <CTableDataCell>{(row as any).genset ? 'Yes' : ''}</CTableDataCell>

              <CTableDataCell>
                <CButton
                  color={isView || !canDelete ? 'secondary' : 'danger'}
                  size="sm"
                  variant="outline"
                  onClick={() => onDeleteRow(originalIndex)}
                  disabled={isView}
                >
                  <CIcon icon={cilTrash} />
                </CButton>
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>

      {errors && <div className="text-danger text-center mt-2">{errors}</div>}
    </div>
  )
}