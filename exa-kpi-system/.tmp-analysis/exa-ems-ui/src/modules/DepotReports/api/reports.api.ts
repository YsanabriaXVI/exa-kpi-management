import apiClient from 'src/services/api/axios.config'
import ISODateFormatter from 'src/helpers/IsoDateFormatter'

class ReportsAPI {

  private groupByDepot(data: any) {
    return Object.values(
      data.reduce((acc: any, item: any) => {
        const { depotId, depot, ...record } = item;

        const groupKey = depotId ?? 'noDepot';
        const depotName = depotId === null ? '(No Depot Found)' : depot;

        if (!acc[groupKey]) {
          acc[groupKey] = {
            depotId,
            depotName,
            records: [],
          };
        }

        acc[groupKey].records.push({
          depotId,
          depot: depotName,
          ...record,
        });

        return acc;
      }, {})
    );
  }

  private fixStorageReport (data: any) {
    
    return data.map((item: any) => {
      return {
        ...item,
        loaded: item.loaded == 1 ? "Yes" : "No",
      }
    })
  }

  private fixRentalReport(data: any) {
    
    return data.map((item: any) => {
      return {
        ...item,
        equipmentSizeType: item.equipmentTypeId == 3 ? item.gensetType : item.equipmentSize,
      }
    })
  }

  async loadAttributeItems(attributeFlatNameId: string | number, moduleFlatNameId: string | number) {
      const url = `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
      const { data } = await apiClient.get<any>(url)
      return { items: data }
  }

    async loadStorageReportLines(
        filters: any
      ): Promise<any> {
        const { data } = await apiClient.post<any>(
          '/depot-service/reports',
          filters
        )
 
        const fixedData = this.fixStorageReport(data);
        const dataGroupedByDepot = this.groupByDepot(fixedData);
    
        return {
          storageReportLines: dataGroupedByDepot,
        }
    }

    async loadRentalReportLines(
        filters: any
      ): Promise<any> {
        const { data } = await apiClient.post<any>(
          '/depot-service/reports',
          filters
        )
 
        const fixedData = this.fixRentalReport(data);
        console.log('fixedData', fixedData);
        const dataGroupedByDepot = this.groupByDepot(fixedData);
        console.log('dataGroupedByDepot', dataGroupedByDepot);
    
        return {
          rentalReportLines: dataGroupedByDepot,
        }
    }

    async loadInventoryReportLines(
        filters: any
      ): Promise<any> {
        const { data } = await apiClient.post<any>(
          '/depot-service/reports',
          filters
        )
 
        /* const fixedData = this.fixRentalReport(data);
        console.log('fixedData', fixedData); */
        const dataGroupedByDepot = this.groupByDepot(data);
        console.log('dataGroupedByDepot', dataGroupedByDepot);
    
        return {
          inventoryReportLines: dataGroupedByDepot,
        }
    }

    private sortRowsByGateIdDesc = (rows: any[]) => {
      return rows
        .map((row, index) => ({ row, index }))
        .sort((a, b) => {
          const gateDiff = Number(b.row.gateId) - Number(a.row.gateId);

          if (gateDiff !== 0) {
            return gateDiff;
          }

          return a.index - b.index;
        })
        .map(({ row }) => row);
    };

    private fixActivityReport = (data: any) => {
      const sortedData = this.sortRowsByGateIdDesc(data);

      sortedData.forEach((item: any) => {
        item.equipmentSizeType = item.equipmentTypeId == 3 ? item.gensetType : item.equipmentSize;
        item.formattedGateDate = ISODateFormatter(item.gateDate);
      })

      return sortedData;
    }

    async loadActivityReportLines(
        filters: any
      ): Promise<any> {
        const { data } = await apiClient.post<any>(
          '/depot-service/reports',
          filters
        )
 
        const fixedData = this.fixActivityReport(data);
        const dataGroupedByDepot = this.groupByDepot(fixedData);
        console.log('dataGroupedByDepot', dataGroupedByDepot);
    
        return {
          activityReportLines: dataGroupedByDepot,
        }
    }

    async downloadReportPDF(
        filters: any,
        reportType: string
      ): Promise<any> {
        const response = await apiClient.post(
          `/depot-service/reports/PDF`,
          filters,
          {
            responseType: 'blob',
          }
        )

        //console.log('pdf response', response);

        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')

        link.href = url
        link.setAttribute('download', `${reportType}_report.pdf`)

        document.body.appendChild(link)
        link.click()
        link.remove()

        window.URL.revokeObjectURL(url)
        return response;
      } 

}

export default new ReportsAPI()