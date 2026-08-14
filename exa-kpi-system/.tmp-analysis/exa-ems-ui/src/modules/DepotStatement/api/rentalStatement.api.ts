import apiClient from 'src/services/api/axios.config'
import { v4 as uuidv4 } from 'uuid'
import type {
  RentalDepotStatement,
  RentalInvoiceLine,
  RentalStatementSearchParams,
} from '../types/rentalStatement.types'

class RentalStatementAPI {
  private groupByKey<T extends Record<string, any>>(
    array: T[],
    key: keyof T
  ): T[][] {
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

  /** Legacy invoice line normalization */
  private formatInvoiceLines(data: RentalInvoiceLine[]): any[][] {

    const fixed = (data ?? []).map((invoiceLine) => {
    const subtotal =
      Math.round(
        Number(invoiceLine.comboPrice ?? 0) *
          Number(invoiceLine.duration ?? 0) *
          100
      ) / 100;

    const taxes = subtotal * Number(invoiceLine.taxRate);
    const total = subtotal + taxes;
    const lineTotal = subtotal.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    return {
      ...invoiceLine,
      comboPriceLabel: `${invoiceLine.comboPrice}/${invoiceLine.periodLabel}`,
      durationLabel: `${invoiceLine.duration} ${invoiceLine.periodLabel}${invoiceLine?.duration > 1 ? 's' : ''}`,
      proratedLabel: 'Prorated',
      proratedOptionId: 1,
      prorated: 1,
      lineTotal: `$ ${lineTotal}`,
      subtotal,
      taxes,
      total,
      id: uuidv4(),
    };
  });

    return this.groupByKey(fixed, 'depotId')
  }

  /** Legacy edit normalization */
  private fixEditPageData(
    statement: RentalDepotStatement
  ): RentalDepotStatement {
    const oneMoreDay = 86400

    console.log('fixEditPageData statement', statement);

    return {
      ...statement,
      startDate: statement.startDate
        ? Math.floor(new Date(statement.startDate).getTime() / 1000) + oneMoreDay
        : null,
      endDate: statement.endDate
        ? Math.floor(new Date(statement.endDate).getTime() / 1000) + oneMoreDay
        : null,
      createDate: statement.createDate
        ? Math.floor(new Date(statement.createDate).getTime() / 1000)
        : null,
      createUserName: `${statement.create_user.firstName} ${statement.create_user.lastName}`
    }
  }

  /** Keeps only BE expected fields before create */
  private toBackendPayload(
    data: RentalInvoiceLine[][],
    searchParams: RentalStatementSearchParams
  ) {
    const invoiceLines: Partial<RentalInvoiceLine>[] = []
    const invoiceLinesUngrouped = (data ?? []).flat()

    invoiceLinesUngrouped.forEach((invoiceLine) => {
      invoiceLines.push({
        comboLabel: invoiceLine.comboLabel,
        dateOut: invoiceLine.dateOut,
        dateIn: invoiceLine.dateIn,
        depot: invoiceLine.depot,
        depotId: invoiceLine.depotId,
        gateOutId: invoiceLine.gateOutId,
        gateInId: invoiceLine.gateInId,
        periodLabel: invoiceLine.periodLabel,
        periodId: invoiceLine.periodId,
        comboPrice: invoiceLine.comboPrice,
        taxRate: invoiceLine.taxRate,
        comboId: invoiceLine.comboId,
        prorated: invoiceLine.prorated,
        chassisId: invoiceLine.chassisId,
        containerId: invoiceLine.containerId,
        gensetId: invoiceLine.gensetId,
        chassisNo: invoiceLine.chassisNo,
        containerNo: invoiceLine.containerNo,
        gensetNo: invoiceLine.gensetNo,
        startDate: invoiceLine.startDate,
        endDate: invoiceLine.endDate,
        billingRange: invoiceLine.billingRange,
        days: invoiceLine.days,
        duration: invoiceLine.duration,
      })
    })

    return {
      ...searchParams,
      invoiceLines,
    }
  }

  async loadOne(id: number): Promise<{ depotStatement: RentalDepotStatement }> {
    const { data } = await apiClient.get<RentalDepotStatement>(
      `/depot-statement-service/rental/${id}`
    )

    return {
      depotStatement: this.fixEditPageData(data),
    }
  }

  async loadInvoiceLines(
    filters: RentalStatementSearchParams
  ): Promise<{ invoiceLines: RentalInvoiceLine[][] }> {
    console.log('api filters', filters);
    const { data } = await apiClient.post<RentalInvoiceLine[]>(
      '/depot-statement-service/rental/invoice-lines',
      filters
    )

    return {
      invoiceLines: this.formatInvoiceLines(data ?? []),
    }
  }

  async create(
    data: RentalInvoiceLine[][],
    searchParams: RentalStatementSearchParams
  ): Promise<{ depotStatement: RentalDepotStatement }> {
    const payload = this.toBackendPayload(data, searchParams)

    const response = await apiClient.post<RentalDepotStatement>(
      '/depot-statement-service/rental/',
      payload
    )

    return {
      depotStatement: response.data,
    }
  }

  async delete(id: number): Promise<{ id: number }> {
    await apiClient.delete(`/depot-statement-service/rental/${id}`)
    return { id }
  }

  async downloadRentalStatementPDF(id: number | string): Promise<any> {
    const response = await apiClient.get(`/depot-statement-service/rental/statement-pdf/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `depot_rental_statement_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    return response;
  }

  async downloadRentalStatementXLSX(id: number | string): Promise<any> {
    const response = await apiClient.get(`/depot-statement-service/rental/statement-xlsx/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `depot_rental_statement_${id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    return response;
  }
}

export const rentalStatementAPI = new RentalStatementAPI()