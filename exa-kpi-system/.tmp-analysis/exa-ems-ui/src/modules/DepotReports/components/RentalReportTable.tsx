import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CRow,
  CCol,
  CFormSelect,
  CFormCheck,
  CSmartTable,
} from '@coreui/react-pro';
import '../styles/reportStyles.css';
import RentalReportSummary from './RentalReportSummary';

const RentalTable: React.FC<any> = ({ filters, data, getChartData }) => {

  const reportTitle = `Current Rental Equipment On Street`;

  const columns = [
      {
        key: 'gateId',
        label: 'Gate Out ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'dateOut',
        label: 'Date Out',
        sorter: true,
        filter: true,
      },
      {
        key: 'equipmentType',
        label: 'Equipment Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'equipmentNo',
        label: 'Equipment No.',
        sorter: true,
        filter: true,
      },
      {
        key: 'equipmentId',
        label: 'Equipment ID',
        sorter: true,
        filter: true,
      },
      {
        key: "equipmentSizeType",
        label: 'Equipment Size/Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'client',
        label: 'Client',
        sorter: true,
        filter: true,
      },
      {
        key: 'requestId',
        label: 'Request ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'rentDays',
        label: 'Rent Days',
        sorter: true,
        filter: true,
      },
      {
        key: 'truckId',
        label: 'Taken By Truck ID',
        filter: false,
        sorter: false,
      },
      {
        key: 'driverId',
        label: 'Taken By Driver ID',
        filter: false,
        sorter: false,
      }
  ]

function getLabelParagraphs(obj) {
  return Object.entries(obj)
    .filter(([key]) => key.endsWith("Label"))
    .map(([key, value]) => (
      <p className="subtitle-span" key={key}>{value as string}</p>
    ));
}

return (
  <div>
      <p className="report-title">{reportTitle}</p>
      <p className="storage-rp-filters-label">{getLabelParagraphs(filters)}</p>
      <br/>
      {data.map((depotgroup: any, index: number) => (
          <CCard className="table-ccard" key={index}>
            <CCardHeader>
            <strong>DEPOT {depotgroup.depotName}</strong>
          </CCardHeader>
        <CRow className="g-3">
          <CCol xs={12} md={4}>
            <RentalReportSummary data={getChartData("Container", depotgroup.depotId)} chartTitle="Containers by Size" />
          </CCol>

          <CCol xs={12} md={4}>
            <RentalReportSummary data={getChartData("Chassis", depotgroup.depotId)} chartTitle="Chassis by Size"/>
          </CCol>

          <CCol xs={12} md={4}>
            <RentalReportSummary data={getChartData("Genset", depotgroup.depotId)} chartTitle="Gensets by Type"/>
          </CCol>
        </CRow>
          

          <CCardBody>
            <CSmartTable
              items={depotgroup.records}
              columns={columns}
              tableProps={{
                hover: true,
                responsive: true,
                striped: true,
                className: 'text-center',
              }}
              //columnFilter
              //columnSorter
              pagination
            />
          </CCardBody>
        </CCard>
      ))}

  </div>
)
}

export default RentalTable;




