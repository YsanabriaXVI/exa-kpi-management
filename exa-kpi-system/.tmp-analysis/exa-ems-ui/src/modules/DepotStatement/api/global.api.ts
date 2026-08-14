import apiClient from 'src/services/api/axios.config'
import type {
  AttributeItem,
  DepotStatementRecord,
  GroupedDepotInvoiceLines,
  PostedStorageInvoiceLine,
  StatementStorageInvoiceLine,
} from '../types/global.types';

class StatementAPI {
  private groupByKey<T extends Record<string, any>>(array: T[], key: keyof T): T[][] {
    return Object.values(
      array.reduce((result, item) => {
        const groupKey = item[key] as string | number
        if (!result[groupKey]) {
          result[groupKey] = []
        }
        result[groupKey].push(item)
        return result
      }, {} as Record<string | number, T[]>)
    )
  }

  private destructureSearchData(data: GroupedDepotInvoiceLines[]) {
    let destructuredData: StatementStorageInvoiceLine[] = []

    data.forEach((elem1) => {
      elem1.equipment.forEach((elem2) => {
        elem2.items.forEach((elem3) => {
          destructuredData = [...destructuredData, ...elem3.services]
        })
      })
    })

    return destructuredData
  }

  private daysBetweenDates(date1: string, date2: string): number {
    const d1 = new Date(date1)
    const d2 = new Date(date2)

    d1.setUTCHours(0, 0, 0, 0)
    d2.setUTCHours(0, 0, 0, 0)

    const diffTime = d2.getTime() - d1.getTime()
    return Math.abs(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  private calculateDays(invoiceLineDates: Array<{ startDate: string; endDate: string }>): number {
    let days = 0

    invoiceLineDates.forEach((cycle) => {
      const start = new Date(cycle.startDate)
      const end = new Date(cycle.endDate)
      const diffInTime = end.getTime() - start.getTime()
      const diffInDays = diffInTime / (1000 * 60 * 60 * 24)
      days += diffInDays
    })

    return days + 1
  }



private calculateTotalDays = (cycles: Array<{ startDate: string; endDate: string }>): number => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return cycles.reduce((total, cycle) => {
    const start = new Date(cycle.startDate);
    const end = new Date(cycle.endDate);

    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);

    const diffDays = (end.getTime() - start.getTime()) / MS_PER_DAY + 1;

    return diffDays > 0 ? total + diffDays : total;
  }, 0);
};
  

  private fixStorageInvoiceLines(
    viewDataInvoiceLines: StatementStorageInvoiceLine[],
    postedInvoiceLines: PostedStorageInvoiceLine[] = [],
    statement: DepotStatementRecord | null = null
  ): GroupedDepotInvoiceLines[] {
    const invoicesByDepot = this.groupByKey(viewDataInvoiceLines, 'depotId')
    const newDataArray: GroupedDepotInvoiceLines[] = []

    invoicesByDepot.forEach((invoices) => {
      const chassis: StatementStorageInvoiceLine[] = []
      const containers: StatementStorageInvoiceLine[] = []
      const gensets: StatementStorageInvoiceLine[] = []

      const newDataArrayItem: GroupedDepotInvoiceLines = {
        depotName: invoices[0].depot,
        equipment: [],
      }

      invoices.forEach((line) => {
        if (line.equipmentTypeId === 1) chassis.push(line)
        if (line.equipmentTypeId === 2) containers.push(line)
        if (line.equipmentTypeId === 3) gensets.push(line)
      })

      const chassisByEquipmentId = chassis.length > 0 ? this.groupByKey(chassis, 'equipmentId') : []
      const containersByEquipmentId =
        containers.length > 0 ? this.groupByKey(containers, 'equipmentId') : []
      const gensetsByEquipmentId = gensets.length > 0 ? this.groupByKey(gensets, 'equipmentId') : []

      const equipments = [chassis, containers, gensets]

      equipments.forEach((equipment) => {
        if (postedInvoiceLines.length > 0 && equipment.length > 0 && statement) {
          equipment.forEach((equipmentLine) => {
            const posteddata = postedInvoiceLines.find(
              (line) =>
                line.equipmentId === equipmentLine.equipmentId &&
                line.gateId === equipmentLine.gateId
            )

            if (!posteddata) return

            const { invoiceLineDates } = posteddata
            const days = this.calculateTotalDays(invoiceLineDates)
            const freeDays = posteddata.freeDaysApplied
            const { unitPrice } = posteddata
            const subtotal = Number(unitPrice) * (Number(days) - Number(freeDays))
            const taxrate = Number(statement.taxRate ?? 0).toFixed(4)
            const total = subtotal + subtotal * Number(taxrate)

            equipmentLine.daysToInvoice = days
            equipmentLine.freeDaysAvailable = freeDays
            equipmentLine.totalDays = days - Number(freeDays)
            equipmentLine.unitPrice = unitPrice
            equipmentLine.subtotal = subtotal.toFixed(4)
            equipmentLine.taxes = (subtotal * Number(taxrate)).toFixed(4)
            equipmentLine.id = `${equipmentLine.gateId}-${equipmentLine.equipmentId}`
            equipmentLine.total = total.toFixed(4)
          })
        }
      })

      if (chassisByEquipmentId.length > 0) {
        newDataArrayItem.equipment.push({
          type: 'Chassis',
          items: chassisByEquipmentId.map((chassisGroup) => ({
            id: chassisGroup[0].equipmentNumber,
            services: chassisGroup,
          })),
        })
      }

      if (containersByEquipmentId.length > 0) {
        newDataArrayItem.equipment.push({
          type: 'Container',
          items: containersByEquipmentId.map((containerGroup) => ({
            id: containerGroup[0].equipmentNumber,
            services: containerGroup,
          })),
        })
      }

      if (gensetsByEquipmentId.length > 0) {
        newDataArrayItem.equipment.push({
          type: 'Genset',
          items: gensetsByEquipmentId.map((gensetGroup) => ({
            id: gensetGroup[0].equipmentNumber,
            services: gensetGroup,
          })),
        })
      }

      if (newDataArrayItem.equipment.length > 0) {
        newDataArray.push(newDataArrayItem)
      }
    })

    return newDataArray
  }

  private fixListPageData(statements: DepotStatementRecord[]): DepotStatementRecord[] {
    statements.forEach((statement) => {
      let statementSubtotal = 0
      let statementTaxes = 0
      let statementTotal = 0

      const statementType = statement.statement_type.flat_name_id

      if (statementType === 'storage') {
        const fixedInvoiceLines = this.fixStorageInvoiceLines(
          statement.viewData ?? [],
          statement.invoiceLines ?? [],
          statement
        )

        const destructuredData = this.destructureSearchData(fixedInvoiceLines)

        destructuredData.forEach((line) => {
          statementSubtotal += Number(line.subtotal ?? 0)
          statementTaxes += Number(line.taxes ?? 0)
          statementTotal += Number(line.total ?? 0)
        })

        statement.subtotal = `$ ${Math.round(statementSubtotal * 100) / 100}`
        statement.taxes = `$ ${Math.round(statementTaxes * 100) / 100}`
        statement.total = `$ ${Math.round(statementTotal * 100) / 100}`
      }

      if (statementType === 'rental') {
        const durationMap: Record<string, number> = {
          Week: 7,
          Month: 30,
          Day: 1,
        }

        ;(statement.DSRentalComboInvoiceLines ?? []).forEach((invoiceLine) => {
          const dates = invoiceLine.DSComboInvoiceLineDates.find(
            (date) => invoiceLine.comboInvoiceLineId === date.comboInvoiceLineId
          )

          if (!dates) return

          const totalDays = this.daysBetweenDates(dates.startDate, dates.endDate)
          const period = invoiceLine.period_data.name
          const duration = Math.round((totalDays / (durationMap[period] ?? 1)) * 100) / 100
          const effectiveDuration =
            invoiceLine.prorated === 1 ? duration : Math.ceil(duration)

          invoiceLine.total =
            Math.round(Number(invoiceLine.comboPrice) * effectiveDuration * 100) / 100

          statementTotal += invoiceLine.total
        })

        statement.total = `$ ${Math.round(statementTotal * 100) / 100}`
      }
    })

    return statements
  }

async loadAttributeItems(attributeFlatNameId: string | number, moduleFlatNameId: string | number) {
    const url = `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
    const { data } = await apiClient.get<any>(url)
    return { items: data }
  }

  async loadDepotStatementsList(): Promise<{ list: DepotStatementRecord[] }> {
    const { data } = await apiClient.get<DepotStatementRecord[]>(
      '/depot-statement-service/statements/'
    )

    return {
      list: this.fixListPageData(data ?? []),
    }
  }
}

export const statementAPI = new StatementAPI()