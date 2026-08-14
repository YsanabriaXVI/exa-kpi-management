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
import InventoryReportSummary from './InventoryReportSummary';


const InventoryReportTable: React.FC<any> = ({ filters, data, getChartData}) => {

    console.log('InventoryReportTable - data: ', data);

    function getLabelParagraphs(obj) {
    return Object.entries(obj)
        .filter(([key]) => key.endsWith("Label"))
        .map(([key, value]) => (
        <p className="subtitle-span" key={key}>{value as string}</p>
        ));
    }

    const container_columns = [
      {
        key: 'container_no',
        label: 'Container No.',
        sorter: true,
        filter: true,
      },
      {
        key: 'assetsid',
        label: 'Container ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'equipmentSize',
        label: 'Equipment Size/Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'module',
        label: 'Module',
        sorter: true,
        filter: true,
      },
      {
        key: 'tare',
        label: 'Tare',
        sorter: true,
        filter: true,
      },
      {
        key: 'gateId',
        label: 'Gate ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'gateType',
        label: 'Current Gate Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'requestType',
        label: 'Request Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'daysInCurrentGate',
        label: 'Days In Current Gate',
        sorter: true,
        filter: true,
      },
      {
        key: 'gateDate',
        label: 'Gate Date',
        sorter: true,
        filter: true,
      },
      {
        key: 'tripId',
        label: 'Trip ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'tripStatus',
        label: 'Trip Status',
        sorter: true,
        filter: true,
      },
      {
        key: 'truckId',
        label: 'Truck ID',
        sorter: true,
        filter: true,
      },
      {
        key: 'driverId',
        label: 'Driver ID',
        sorter: true,
        filter: true,
      }
    ]

    const chassis_columns = [
        {
            key: 'chassis_no',
            label: 'Chassis No.',
            sorter: true,
            filter: true,
        },
                {
            key: 'assetsid',
            label: 'Chassis ID',
            sorter: true,
            filter: true,
        },
        {
            key: 'module',
            label: 'Module',
            sorter: true,
            filter: true,
        },
        {
            key: 'equipmentSize',
            label: 'Equipment Size/Type',
            sorter: true,
            filter: true,
        },
        {
            key: 'serial_no',
            label: 'Series',
            sorter: true,
            filter: true,
        },
        {
            key: 'plate',
            label: 'Plate',
            sorter: true,
            filter: true,
        },
        {
            key: 'gateType',
            label: 'Current Gate Type',
            sorter: true,
            filter: true,
        },
        {
            key: 'requestType',
            label: 'Request Type',
            sorter: true,
            filter: true,
        },
        {
            key: 'gateId',
            label: 'Gate ID',
            sorter: true,
            filter: true,
        },
        {
            key: 'gateDate',
            label: 'Gate Date',
            sorter: true,
            filter: true,
        },
        {
            key: 'daysInCurrentGate',
            label: 'Days In Current Gate',
            sorter: true,
            filter: true,
        },
        {
            key: 'tripId',
            label: 'Trip ID',
            sorter: true,
            filter: true,
        },
        {
            key: 'tripStatus',
            label: 'Trip Status',
            sorter: true,
            filter: true,
        },
        {
            key: 'truckId',
            label: 'Truck ID',
            sorter: true,
            filter: true,
        },
        {
            key: 'driverId',
            label: 'Driver ID',
            sorter: true,
            filter: true,
        },
    ];

    const genset_columns = [
    {
        key: 'genset_no',
        label: 'Genset No.',
        sorter: true,
        filter: true,
    },
        {
        key: 'assetsid',
        label: 'Genset ID',
        sorter: true,
        filter: true,
    },
    {
        key: 'module',
        label: 'Module',
        sorter: true,
        filter: true,
    },
    {
        key: 'gensetType',
        label: 'Genset Type',
        sorter: true,
        filter: true,
    },
    {
        key: 'serial_no',
        label: 'Series',
        sorter: true,
        filter: true,
    },
    {
        key: 'fuel_type',
        label: 'Fuel Type',
        sorter: true,
        filter: true,
    },
    {
        key: 'gateType',
        label: 'Current Gate Type',
        sorter: true,
        filter: true,
    },
    {
        key: 'gateId',
        label: 'Gate ID',
        sorter: true,
        filter: true,
    },
    {
        key: 'requestType',
        label: 'Request Type',
        sorter: true,
        filter: true,
    },
    {
        key: 'gateDate',
        label: 'Gate Date',
        sorter: true,
        filter: true,
    },
    {
        key: 'daysInCurrentGate',
        label: 'Days In Current Gate',
        sorter: true,
        filter: true,
    },
    {
        key: 'tripId',
        label: 'Trip ID',
        sorter: true,
        filter: true,
    },
    {
        key: 'tripStatus',
        label: 'Trip Status',
        sorter: true,
        filter: true,
    },
    {
        key: 'truckId',
        label: 'Truck ID',
        sorter: true,
        filter: true,
    },
    {
        key: 'driverId',
        label: 'Driver ID',
        sorter: true,
        filter: true,
    }
    ];

    const equipment = filters.equipmentTypeId;
    let equipmentLabel = "Equipment";
    let chartTitle = "Equipment By Size/Type";
    const columns: any = [];

    if (equipment === 1 || equipment === "1") {
      equipmentLabel = "Chassis";
      chartTitle = "Chassis By Size";
      columns.push(...chassis_columns);
    }
    if (equipment === 2 || equipment === "2") {
      chartTitle = "Containers By Size";
      equipmentLabel = "Container";
      columns.push(...container_columns);
    }
    if (equipment === 3 || equipment === "3") {
      chartTitle = "Gensets By Type";
      equipmentLabel = "Genset";
      columns.push(...genset_columns);
    }
    const reportTitle = `${equipmentLabel} Inventory - Owned Equipment`;

    return (
    <div >
        <p className="report-title">{reportTitle}</p>
         <p className="storage-rp-filters-label">{getLabelParagraphs(filters)}</p>
        <br/>
        {data.map((depotgroup: any, index: number) => {
            const chartData = getChartData(equipmentLabel, depotgroup.depotId);
            let chartSize = 4;
            if (chartData.labels.length <= 5) chartSize = 5;
            if (chartData.labels.length > 5 && chartData.labels.length <= 9) chartSize = 8;
            if (chartData.labels.length > 9) chartSize = 12;

            return (
            <CCard key={index} className="table-ccard">
            <CCardHeader>
                <strong>DEPOT {depotgroup.depotName}</strong>
            </CCardHeader>
            <CCard>
            <CRow style={{ justifyContent: 'center', padding: '16px' }}>
            <CCol xs={12} md={chartSize} >
                <InventoryReportSummary data={chartData} chartTitle={chartTitle} />
            </CCol>
            <CCardBody>
                    {equipmentLabel} Found: <span><strong>{depotgroup.records.length}</strong></span>
                </CCardBody>
            </CRow>
            </CCard>
            <br/>

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

export default InventoryReportTable;