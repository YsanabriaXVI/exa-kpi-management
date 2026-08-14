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
import StorageReportSummary from './InventoryReportSummary';

const StorageTable: React.FC<any> = ({ filters, data, getChartData }) => {


  const equipment = data?.[0]?.records?.[0]?.equipmentType;
  const equipmentLabel = equipment === "Chassis" ? equipment : equipment+"s";
  const reportTitle = `Current ${equipmentLabel} In Yard`;
  const equipmentSizeTypeKey = equipment === "Genset" ? "gensetType" : "equipmentSize";

  const columns = [
      {
        key: 'gateId',
        label: 'Gate In ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'gateInDate',
        label: 'Date In',
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
        key: 'equipmentNumber',
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
        key: equipmentSizeTypeKey,
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
        key: 'storageDays',
        label: 'Days In Yard',
        sorter: true,
        filter: true,
      },
      /* {
        key: 'daysInvoiced',
        label: 'Days Invoiced',
        sorter: false,
        filter: false,
      }, */
  ]

  const containerColumns = [
    {
        key: 'haulage',
        label: 'Haulage',
        sorter: true,
        filter: true,
    },
    {
        key: 'loaded',
        label: 'Loaded',
        sorter: true,
        filter: true,
    }
  ]

  if (equipment === "Container") {
    columns.splice(6,0, containerColumns[0], containerColumns[1]);
  }

function getLabelParagraphs(obj) {
  return Object.entries(obj)
    .filter(([key]) => key.endsWith("Label"))
    .map(([key, value]) => (
      <p className="subtitle-span" key={key}>{value as string}</p>
    ));
}

    let chartTitle = "Equipment By Size/Type";

    if (equipment === "Chassis") {
      chartTitle = "Chassis By Size";
    }
    if (equipment === "Container") {
      chartTitle = "Containers By Size";
    }
    if (equipment === "Genset") {
      chartTitle = "Gensets By Type";
    }


return (
    <div>
      <p className="report-title">{reportTitle}</p>
      <p className="storage-rp-filters-label">{getLabelParagraphs(filters)}</p>
      <br/>
      {data.map((depotgroup: any, index: number) => {

        const chartData = getChartData(equipment, depotgroup.depotId);
            let chartSize = 4;
            if (chartData.labels.length <= 5) chartSize = 5;
            if (chartData.labels.length > 5 && chartData.labels.length <= 9) chartSize = 8;
            if (chartData.labels.length > 9) chartSize = 12;
        
        return (
        <CCard key={index} className="table-ccard">
          <CCardHeader>
            <strong>DEPOT {depotgroup.depotName}</strong>
          </CCardHeader>
          <CRow style={{ justifyContent: 'center', padding: '16px' }}>
            <CCol xs={12} md={chartSize} >
                <StorageReportSummary data={chartData} chartTitle={chartTitle} />
            </CCol>
            <CCardBody>
                    {equipmentLabel} Found: <span><strong>{depotgroup.records.length}</strong></span>
                </CCardBody>
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
      )})}
    </div>

)
}

export default StorageTable;




