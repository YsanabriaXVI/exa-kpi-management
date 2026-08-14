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


const ActivityReportTable: React.FC<any> = ({ filters, data}) => {

    console.log('ActivityReportTable - data: ', data);

    function getLabelParagraphs(obj: any) {
      const labels = Object.entries(obj)
          .filter(([key]) => key.endsWith("Label"))
          .map(([key, value]) => (
          <p className="subtitle-span" key={key}>{value as string}</p>
          ));
      
      return labels;
    }

    function getRangeLabel(filters: any) {
       const hasDateRange = (filters?.startDateString && filters?.endDateString);

       if (hasDateRange) {
        return `Range: ${filters?.startDateString} to ${filters?.endDateString}`;
       } else {
        return "Up to Date";
       }
    }

    const columns_by_equipment = [
        {
        key: 'gateId',
        label: 'Gate ID',
        sorter: true,
        filter: true,
      },
            {
        key: 'gateType',
        label: 'Gate Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'formattedGateDate',
        label: 'Gate Date',
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
        key: 'equipment_no',
        label: 'Equipment No.',
        sorter: true,
        filter: true,
      },
      {
        key: 'assetsid',
        label: 'Equipment ID',
        sorter: true,
        filter: true,
      }, 
      {
        key: 'client',
        label: 'Equipment Owner',
        sorter: true,
        filter: true,
      },
      {
        key: 'equipmentSizeType',
        label: 'Equipment Size/Type',
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
        key: 'equipmentRequestId',
        label: 'Request ID',
        sorter: true,
        filter: true,
      },

      {
        key: 'requestId',
        label: 'Requirement ID',
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

    const columns_by_gate = [
        {
        key: 'gateId',
        label: 'Gate ID',
        sorter: true,
        filter: true,
      },
            {
        key: 'gateType',
        label: 'Gate Type',
        sorter: true,
        filter: true,
      },
      {
        key: 'formattedGateDate',
        label: 'Gate Date',
        sorter: true,
        filter: true,
      },
      {
        key: 'chassis_no',
        label: 'Chassis No.',
        sorter: true,
        filter: true,
      },
      {
        key: 'container_no',
        label: 'Container No.',
        sorter: true,
        filter: true,
      },
      {
        key: 'genset_no',
        label: 'Genset No.',
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
        key: 'equipmentRequestId',
        label: 'Request ID',
        sorter: true,
        filter: true,
      },

      {
        key: 'requestId',
        label: 'Requirement ID',
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

    const isDateRange = (filters?.startDateString && filters?.endDateString);
    const columns = filters?.sortBy === "gate" ? columns_by_gate : columns_by_equipment;


    return (
    <div >
        <p className="report-title">Gate Activity</p>
        <p className="storage-rp-filters-label">{getRangeLabel(filters)}</p>
        <div className="storage-rp-filters-label">{getLabelParagraphs(filters)}</div>
        <br/>
        {data.map((depotgroup: any, index: number) => {

            return (  
            <CCard key={index} className="table-ccard">
            <CCardHeader>
                <strong>DEPOT {depotgroup.depotName}</strong>
            </CCardHeader>

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

export default ActivityReportTable;