/**
 * Rate Builder Matrix Component
 * Displays a matrix/grid of Subdivisions × Clients with editable dropdown cells
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CMultiSelect,
  CSpinner,
} from '@coreui/react-pro'
import { RateBuilderRow, RateBuilderCell } from '../types'

interface RateBuilderMatrixProps {
  data: RateBuilderRow[]
  clients: any[]
  ratePlans: any[]
  updatingCells: string[]
  isEditable: boolean
  onCellChange: (cell: RateBuilderCell, ratePlanId: number) => void
}

const RateBuilderMatrix: React.FC<RateBuilderMatrixProps> = ({
  data,
  clients,
  ratePlans,
  updatingCells,
  isEditable,
  onCellChange,
}) => {
  const [editingCellId, setEditingCellId] = useState<string | null>(null)
  const [tableWidth, setTableWidth] = useState<number>(0)
  const [tableHeight, setTableHeight] = useState<number>(0)
  const [tableViewportHeight, setTableViewportHeight] = useState<number>(0)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const topScrollbarRef = useRef<HTMLDivElement>(null)
  const sideScrollbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidths = () => {
      if (tableRef.current) {
        setTableWidth(tableRef.current.scrollWidth)
        setTableHeight(tableRef.current.scrollHeight)
      }
      if (tableContainerRef.current) {
        setTableViewportHeight(tableContainerRef.current.clientHeight)
      }
    }
    updateWidths()
    window.addEventListener('resize', updateWidths)
    return () => window.removeEventListener('resize', updateWidths)
  }, [data, clients])

  const handleTopScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
  }

  const handleBodyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (topScrollbarRef.current) {
      topScrollbarRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
    if (sideScrollbarRef.current) {
      sideScrollbarRef.current.scrollTop = event.currentTarget.scrollTop
    }
  }

  const handleSideScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = event.currentTarget.scrollTop
    }
  }

  const handleCellChange = (cell: RateBuilderCell, value: string) => {
    const currentValue = cell.data?.rate_builder?.id ? String(cell.data.rate_builder.id) : ''
    if (!value) {
      setEditingCellId(null)
      return
    }
    if (currentValue && currentValue === value) {
      return
    }
    onCellChange(cell, Number(value))
    setEditingCellId(null)
  }

  const handleCellClick = (cellId: string) => {
    if (isEditable && !updatingCells.includes(cellId)) {
      setEditingCellId(cellId)
    }
  }

  return (
    <div className="rate-builder-matrix-wrapper">
      {tableWidth > 0 && (
        <div className="rate-builder-scrollbar" ref={topScrollbarRef} onScroll={handleTopScroll}>
          <div style={{ width: tableWidth }} />
        </div>
      )}
      <div className="rate-builder-scroll-area">
        <div className="rate-builder-table-container" ref={tableContainerRef} onScroll={handleBodyScroll}>
          <CTable hover responsive align="middle" className="rate-builder-matrix" ref={tableRef}>
          <CTableHead color="light" className="rate-builder-header">
            <CTableRow>
              <CTableHeaderCell scope="col" className="rate-builder-col--subdivision">Subdivision</CTableHeaderCell>
              {clients.map((client) => (
                <CTableHeaderCell key={client.client_id} className="rate-builder-col--client text-center">
                  {client.name}
                </CTableHeaderCell>
              ))}
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {data.map((row, rowIndex) => (
              <CTableRow key={row.subdivisionId}>
              <CTableDataCell>
                <strong>{row.subdivisionName}</strong>
              </CTableDataCell>
              {clients.map((client) => {
                const cellKey = `client-${client.client_id}`
                const cell: RateBuilderCell | undefined = row[cellKey]

                if (!cell) {
                  return (
                    <CTableDataCell
                      key={`pending-${client.client_id}-${row.subdivisionId}`}
                      style={{
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        minWidth: '180px',
                        height: '50px',
                      }}
                    >
                      <CSpinner size="sm" />
                    </CTableDataCell>
                  )
                }

                const isUpdating = updatingCells.includes(cell.id)
                const isEditing = editingCellId === cell.id

                return (
                  <CTableDataCell
                    key={cell.id}
                    onClick={() => handleCellClick(cell.id)}
                    style={{
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      position: 'relative',
                      cursor: isEditable && !isUpdating ? 'pointer' : 'default',
                      minWidth: '180px',
                      height: '50px'
                    }}
                  >
                    {isUpdating ? (
                      <CSpinner size="sm" />
                    ) : isEditing ? (
                      <div onClick={(e) => e.stopPropagation()}>
                        <CMultiSelect
                          options={ratePlans.map(p => ({ value: String(p.id), label: p.name }))}
                          value={cell.data?.rate_builder?.id ? String(cell.data.rate_builder.id) : ''}
                          onChange={(selected: any) => {
                             const option = Array.isArray(selected) ? selected[0] : selected
                             handleCellChange(cell, option?.value ?? '')
                          }}
                          multiple={false}
                          selectionType="text"
                          optionsStyle="text"
                          placeholder="Select Plan"
                          clearSearchOnSelect
                          autoFocus
                        />
                      </div>
                    ) : (
                      <span className="d-block w-100 h-100 d-flex align-items-center justify-content-center">
                        {cell.colValue || <span className="text-body-secondary small fst-italic">Select Plan</span>}
                      </span>
                    )}
                  </CTableDataCell>
                )
              })}
            </CTableRow>
            ))}
          </CTableBody>
        </CTable>
        </div>
        {tableHeight > 0 && tableViewportHeight > 0 && (
          <div
            className="rate-builder-vertical-scrollbar"
            ref={sideScrollbarRef}
            onScroll={handleSideScroll}
            style={{ height: tableViewportHeight }}
          >
            <div style={{ height: tableHeight }} />
          </div>
        )}
      </div>
      <style>{`
        .rate-builder-matrix-wrapper {
          background: linear-gradient(180deg, var(--rb-bg-start) 0%, var(--rb-bg-end) 100%);
          border-radius: 18px;
          padding: 1rem 1rem 0.5rem;
          box-shadow: 0 15px 35px rgba(15, 48, 84, 0.08);
        }

        .rate-builder-scrollbar {
          overflow-x: auto;
          border-radius: 999px;
          margin-bottom: 0.75rem;
          background-color: var(--rb-scroll-track);
        }

        .rate-builder-scrollbar::-webkit-scrollbar,
        .rate-builder-table-container::-webkit-scrollbar {
          height: 6px;
        }

        .rate-builder-scrollbar::-webkit-scrollbar-thumb,
        .rate-builder-table-container::-webkit-scrollbar-thumb {
          background: var(--rb-scroll-thumb);
          border-radius: 999px;
        }

        .rate-builder-scroll-area {
          position: relative;
        }

        .rate-builder-vertical-scrollbar {
          width: 14px;
          overflow-y: auto;
          border-radius: 999px;
          background-color: var(--rb-scroll-track);
          position: absolute;
          top: 0;
          right: 0;
          margin-left: 0.5rem;
        }

        .rate-builder-table-container {
          padding-right: 1.5rem;
        }

        .rate-builder-vertical-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .rate-builder-vertical-scrollbar::-webkit-scrollbar-thumb {
          background: var(--rb-scroll-thumb);
          border-radius: 999px;
        }

        .rate-builder-table-container {
          overflow-x: auto;
          border-radius: 14px;
          background: var(--rb-table-bg);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .rate-builder-matrix {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
        }

        .rate-builder-matrix thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .rate-builder-matrix th {
          background-color: var(--rb-header-bg) !important;
          color: var(--rb-header-fg);
          font-weight: 600;
          font-size: 0.78rem;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          border: none;
          white-space: nowrap;
          padding: 0.85rem 0.75rem;
          vertical-align: middle;
          box-shadow: inset 0 -1px var(--rb-header-divider);
        }

        .rate-builder-matrix td {
          padding: 0.65rem;
          border: none;
          color: var(--rb-cell-fg);
          box-shadow: inset 0 -1px var(--rb-row-divider);
          transition: background-color 0.2s, color 0.2s;
        }

        .rate-builder-matrix tr:hover td {
          background-color: var(--rb-cell-hover);
        }

        .rate-builder-matrix th:first-child,
        .rate-builder-matrix td:first-child {
          position: sticky;
          left: 0;
          z-index: 11;
          background-color: var(--rb-side-bg);
          color: var(--rb-side-fg);
          box-shadow: inset -1px 0 var(--rb-side-border), inset 0 -1px var(--rb-row-divider);
        }

        .rate-builder-matrix th:first-child {
          z-index: 12;
          background-color: var(--rb-corner-bg) !important;
          color: var(--rb-header-fg);
          box-shadow: inset -1px 0 var(--rb-side-border), inset 0 -1px var(--rb-header-divider);
        }

        .rate-builder-matrix td:first-child {
          font-weight: 600;
        }

        .rate-builder-matrix tr:hover td:first-child {
          background-color: var(--rb-side-hover) !important;
        }

        :root,
        [data-coreui-theme='light'] {
          --rb-bg-start: #f8fbff;
          --rb-bg-end: #f1f6ff;
          --rb-table-bg: #ffffff;
          --rb-header-bg: #eff4ff;
          --rb-header-fg: #0b3a7a;
          --rb-header-divider: #d6e0f5;
          --rb-row-divider: #e9edf4;
          --rb-cell-hover: #f6faff;
          --rb-cell-fg: #1f2a37;
          --rb-side-bg: #edf4ff;
          --rb-side-fg: #0c3051;
          --rb-side-border: #cdd8f0;
          --rb-corner-bg: #e4efff;
          --rb-side-hover: #dbe8ff;
          --rb-scroll-track: rgba(12, 48, 94, 0.08);
          --rb-scroll-thumb: rgba(12, 48, 94, 0.35);
          --rb-filter-bg: #f6f8fd;
          --rb-filter-border: #d9e2f5;
        }

        :root[data-coreui-theme='dark'],
        [data-coreui-theme='dark'] {
          --rb-bg-start: #111a2c;
          --rb-bg-end: #090f1d;
          --rb-table-bg: #1b2437;
          --rb-header-bg: #2a3550;
          --rb-header-fg: #dae6ff;
          --rb-header-divider: #384466;
          --rb-row-divider: #243048;
          --rb-cell-hover: rgba(255, 255, 255, 0.04);
          --rb-cell-fg: #f2f6ff;
          --rb-side-bg: #26324a;
          --rb-side-fg: #f4f8ff;
          --rb-side-border: #3a4a63;
          --rb-corner-bg: #2f3c57;
          --rb-side-hover: rgba(255, 255, 255, 0.08);
          --rb-scroll-track: rgba(255, 255, 255, 0.05);
          --rb-scroll-thumb: rgba(255, 255, 255, 0.3);
          --rb-filter-bg: #1a253b;
          --rb-filter-border: #2c3b58;
        }
      `}</style>
    </div>
  )
}

export default RateBuilderMatrix
