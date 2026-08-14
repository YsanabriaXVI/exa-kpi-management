import React, { useEffect, useMemo, useState } from 'react'
import { CSmartTable, CFormInput, CFormSelect, CButton } from '@coreui/react-pro'
import ConfirmationModal from 'src/components/ConfirmationModal'
import CIcon from '@coreui/icons-react'
import { cilTrash, cilPlus } from '@coreui/icons'
import { v4 as uuidv4 } from "uuid";

type JobOption = {
  value: number
  label: string
}

type RowError = Record<string, string>

export type SizeChargeRow = {
  id?: string | number
  job?: string
  jobId?: number | string | null
  jobRateId?: number
  MHEmpty?: string
  MHLoaded?: string
  CHEmpty?: string
  CHLoaded?: string
  PriceOrQty?: string
}

type Props = {
  jobs: SizeChargeRow[]
  setJobs: (next: SizeChargeRow[]) => void // ✅ parent function receives an array
  jobOptions: JobOption[]
  errors: RowError[]
  deleteJobRates: (id: number) => void
  viewMode?: boolean
}

const makeRowId = () => uuidv4()


function SizeChargesTable({ jobs, setJobs, jobOptions, errors, deleteJobRates, viewMode }: Props) {
  const [filteredJobOptions, setFilteredJobOptions] = useState<JobOption[]>([])
  const [showModal, setShowModal] = useState(false);
  const [idToDelete, markIdToDelete] = useState<string | number | null>(null);

  const filterOptions = () => {
    const selectedJobIds = jobs
      .map((j) => Number(j.jobId))
      .filter((n) => Number.isFinite(n))

    const filtered = (jobOptions ?? []).filter((opt) => !selectedJobIds.includes(opt.value))
    setFilteredJobOptions(filtered)
  }

  useEffect(() => {
    filterOptions()
  }, [jobOptions, jobs])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: keyof SizeChargeRow | 'job',
    rowId: SizeChargeRow['id'],
  ) => {
    const value = e.target.value

    const nextJobs = jobs.map((r) => {
      if (r.id !== rowId) return r

      const row = { ...r }

      if (field === 'job') {
        if (value === '') {
          row.jobId = null
          row.job = ''
        } else {
          const jobId = Number(value)
          const job = jobOptions.find((o) => o.value === jobId)
          row.jobId = jobId
          row.job = job?.label ?? ''
        }
        return row
      }

      row[field] = value
      return row
    })

    setJobs(nextJobs)
  }

  const handleDelete = (id: string | number) => {
    if (typeof id === 'string') {
      const target = jobs.filter((r) => r.id !== id)
      setJobs(target)
    } else if (typeof id === 'number') {
      deleteJobRates(id);
    }
  }

  const displayDeleteModal = (rowId: SizeChargeRow['id']) => {
    const target = jobs.find((r) => r.id === rowId);
    
    if (typeof target?.jobRateId === 'number') {
      // if stored, delete in backend
      markIdToDelete(target.jobRateId)
    } else if (!(target?.jobRateId) && typeof target?.id === 'string') {
      // if not stored, delete in frontend
      markIdToDelete(target.id)
    }

    setShowModal(true);
  }

  const addRow = () => {
    if (jobs.length === jobOptions.length) return

    const next: SizeChargeRow[] = [
      ...jobs,
      {
        id: makeRowId(),
        job: '',
        jobId: null,
        MHEmpty: '',
        MHLoaded: '',
        CHEmpty: '',
        CHLoaded: '',
        PriceOrQty: '',
      },
    ]

    setJobs(next)
  }

  const columns = useMemo(
    () => [
      { key: 'rowNumber', label: 'Row#', _style: { width: '80px', textAlign: 'center' } },
      { key: 'job', label: 'Job' },
      { key: 'MHEmpty', label: 'Price for MH Empty' },
      { key: 'MHLoaded', label: 'Price for MH Loaded' },
      { key: 'CHEmpty', label: 'Price for CH Empty' },
      { key: 'CHLoaded', label: 'Price for CH Loaded' },
      { key: 'PriceOrQty', label: 'Price/Qty' },
      { key: 'actions', label: 'Actions', _style: { width: '100px' } },
    ],
    [],
  )

  const items = useMemo(
    () =>
      (jobs ?? []).map((row, index) => ({
        ...row,
        rowNumber: index + 1,
      })),
    [jobs],
  )

  return (
    <div>
      <CSmartTable
        items={items}
        columns={columns as any}
        pagination
        itemsPerPage={10}
        scopedColumns={{
          job: (item: SizeChargeRow, index: number) => (
          <td>
            <CFormSelect
              value={item.jobId ?? ''}
              onChange={(e) => handleChange(e, 'job', item.id)}
              invalid={!!errors[index]?.jobId}
              feedbackInvalid={errors[index]?.jobId}
              disabled={viewMode}
            >
              <option value="">Select Job</option>

              {[
                ...filteredJobOptions,
                ...(item.jobId
                  ? [
                      {
                        value: Number(item.jobId),
                        label: item.job ?? '',
                      },
                    ]
                  : []),
              ].map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </CFormSelect>
          </td>
        ),
          MHEmpty: (item: SizeChargeRow) => (
            <td>
              <CFormInput
                type="number"
                value={item.MHEmpty ?? ''}
                onChange={(e) => handleChange(e, 'MHEmpty', item.id)}
                disabled={viewMode}
              />
            </td>
          ),

          MHLoaded: (item: SizeChargeRow) => (
            <td>
              <CFormInput
                type="number"
                value={item.MHLoaded ?? ''}
                onChange={(e) => handleChange(e, 'MHLoaded', item.id)}
                disabled={viewMode}
              />
            </td>
          ),

          CHEmpty: (item: SizeChargeRow) => (
            <td>
              <CFormInput
                type="number"
                value={item.CHEmpty ?? ''}
                onChange={(e) => handleChange(e, 'CHEmpty', item.id)}
                disabled={viewMode}
              />
            </td>
          ),

          CHLoaded: (item: SizeChargeRow) => (
            <td>
              <CFormInput
                type="number"
                value={item.CHLoaded ?? ''}
                onChange={(e) => handleChange(e, 'CHLoaded', item.id)}
                disabled={viewMode}
              />
            </td>
          ),

          PriceOrQty: (item: SizeChargeRow) => (
            <td>
              <CFormInput
                type="number"
                value={item.PriceOrQty ?? ''}
                onChange={(e) => handleChange(e, 'PriceOrQty', item.id)}
                disabled={viewMode}
              />
            </td>
          ),
          actions: (item: SizeChargeRow) => {
            return (
              <td className="text-center">
              <CButton color="danger" 
                onClick={() => displayDeleteModal(item.id)}
                disabled={viewMode}>
                <CIcon icon={cilTrash} />
              </CButton>
              </td>
            )
          },
        }}
      />
      {!viewMode && <div className="d-flex justify-content-center mt-3">
        <CButton
          color="success"
          className="text-white"
          type="button"
          onClick={addRow}
        >
          <CIcon icon={cilPlus} className="me-2" />
          Add Row
        </CButton>
      </div>}

      <ConfirmationModal 
        visible={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={() => {handleDelete(idToDelete as any)} }
      />
    </div>
  )
}

export default SizeChargesTable
