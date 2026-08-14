import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CSmartTable,
} from '@coreui/react-pro'

interface Props {
  data: any[]
}

const StoragePreview: React.FC<Props> = ({ data }) => {
  return (
    <CCard className="mt-4 shadow-sm">
      <CCardHeader>
        <strong>Storage Invoice Preview</strong>
      </CCardHeader>

      <CCardBody>
        <CSmartTable
          items={data}
          columns={[
            { key: 'equipmentSize', label: 'Size' },
            { key: 'gateCreateDate', label: 'Charge Date' },
            { key: 'job', label: 'Charge Type' },
            { key: 'billingCycles', label: 'Billing Range' },
            { key: 'daysToInvoice', label: 'Days' },
            { key: 'freeDaysAvailable', label: 'Free Days' },
            { key: 'totalDays', label: 'Total Days' },
            { key: 'unitPrice', label: 'Unit Price' },
            { key: 'subtotal', label: 'Subtotal' },
            { key: 'taxRate', label: 'Tax Rate' },
            { key: 'taxes', label: 'Taxes' },
            { key: 'total', label: 'Total' },
          ]}
          pagination
          columnSorter
          tableProps={{
            hover: true,
            striped: true,
            responsive: true,
          }}
        />
      </CCardBody>
    </CCard>
  )
}

export default StoragePreview