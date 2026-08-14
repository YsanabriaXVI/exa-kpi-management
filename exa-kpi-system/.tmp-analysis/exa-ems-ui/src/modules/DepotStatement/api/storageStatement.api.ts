import apiClient from 'src/services/api/axios.config'
import type {
  StorageDepotStatement,
  StorageInvoiceDepotGroup,
  StorageStatementLine,
  StorageStatementPostedInvoiceLine,
  StorageStatementSearchParams,
} from '../types/storageStatement.types'

import { StorageServiceGroup } from '../types/storageStatement.types'

class StorageStatementAPI {
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

private calculateDays(
  invoiceLineDates: Array<{ startDate: string; endDate: string }>
): number {
  let days = 0

  invoiceLineDates.forEach((cycle) => {
    const start = new Date(cycle.startDate)
    const end = new Date(cycle.endDate)
    const diffInTime = end.getTime() - start.getTime()
    const diffInDays = diffInTime / (1000 * 60 * 60 * 24)
    days += diffInDays + 1
  })

  return days
}


private fixStorageInvoiceLines = (
  viewDataInvoiceLines: StorageStatementLine[],
  postedInvoiceLines: StorageStatementPostedInvoiceLine[] = [],
  statement: StorageDepotStatement | null = null
): StorageInvoiceDepotGroup[] => {
  console.log("viewDataInvoiceLines before fix", viewDataInvoiceLines);
  console.log("postedInvoiceLines before fix", postedInvoiceLines);

  const formatDate = (dateStr?: string) =>
    dateStr ? dateStr.split("T")[0] : "";

    
  type DepotGroup = {
    depotId: number;
    depotName: string;
    invoiceLines: StorageStatementLine[];
  };

  const groupInvoiceLinesByDepot = (invoiceLines: StorageStatementLine[]): DepotGroup[] => {
    const grouped = new Map<number, DepotGroup>();

    invoiceLines.forEach((line) => {
      const depotId = line.depotId;

      if (!grouped.has(depotId)) {
        grouped.set(depotId, {
          depotId,
          depotName: line.depot,
          invoiceLines: [],
        });
      }

      grouped.get(depotId)!.invoiceLines.push(line);
    });

    return Array.from(grouped.values());
};

  const buildGroupedResult = (
    lines: StorageStatementLine[]
  ): any[] => {
    console.log("lines --> ", lines);
    const invoicesByDepot = groupInvoiceLinesByDepot(lines);
    return invoicesByDepot;
  };

  // SEARCH / NEW MODE:
  // no posted lines yet, so just normalize/group view data
  if (postedInvoiceLines.length === 0 || !statement) {
    const normalizedViewLines = viewDataInvoiceLines.map((line) => ({
      ...line,
      gateCreateDate: formatDate(line.gateCreateDate),
      id: line.id ?? `${line.gateId}-${line.equipmentId}`,
    }));

    const result = buildGroupedResult(normalizedViewLines);
    console.log("newDataArray (search mode)", result);
    return result;
  }

  // EDIT MODE:
  // use posted lines as source of truth, enrich with view data
  const viewLineMap = new Map<string, StorageStatementLine>();
  viewDataInvoiceLines.forEach((line) => {
    viewLineMap.set(`${line.equipmentId}-${line.gateId}-${line.jobId}`, line);
  });

  console.log("postedInvoiceLines", postedInvoiceLines);

  const mergedLines: StorageStatementLine[] = postedInvoiceLines
    .map((postedLine) => {
      const key = `${postedLine.equipmentId}-${postedLine.gateId}-${postedLine.jobId}`;
      const viewLine = viewLineMap.get(key);

      if (!viewLine) return null;

      const { invoiceLineDates, unitPrice, freeDaysApplied } = postedLine;
      const days = this.calculateDays(invoiceLineDates);
      const freeDays = Number(freeDaysApplied);
      const taxRate = Number(postedLine.taxRate);
      const subtotal = Number(unitPrice) * (Number(days) - freeDays);
      const taxes = subtotal * taxRate;
      const total = subtotal + taxes;

      return {
        ...viewLine,
        gateCreateDate: formatDate(viewLine.gateCreateDate),
        daysToInvoice: days,
        freeDaysAvailable: freeDays,
        totalDays: days - freeDays,
        unitPrice,
        subtotal: subtotal,
        taxes: taxes,
        total: total.toFixed(2),
        id: `${viewLine.gateId}-${viewLine.equipmentId}-${viewLine.jobId}`,
        billingCycles: invoiceLineDates
          .map(
            ({ startDate, endDate }) =>
              `${formatDate(startDate)} to ${formatDate(endDate)}`
          )
          .join(",\n"),
      } as StorageStatementLine;
    })
    .filter((line): line is StorageStatementLine => line !== null);

  const result = buildGroupedResult(mergedLines);
  console.log("newDataArray (edit mode)", result);
  return result;
};


  private destructureSearchData(
    data: StorageInvoiceDepotGroup[],
    searchParams: StorageStatementSearchParams | null = null
) {
  const destructuredData: StorageStatementLine[] = data.flatMap((depotGroup) =>
    depotGroup.invoiceLines.map((line) => ({
      ...line,
      depotId: line.depotId ?? depotGroup.depotId,
      depot: line.depot ?? depotGroup.depotName,
    }))
  )

  if (searchParams === null) {
    return destructuredData
  }

  return {
    ...searchParams,
    invoiceLines: destructuredData,
  }
}



  private fixEditPageData = (statement: any) => {
    console.log("fixEditPageData statement", statement);

    const weekIds: number[] = [];

    if ("weeks" in statement) {
      statement.weeks.forEach((week: any) => {
        weekIds.push(week.weekId);
      });

      statement.weeks = weekIds;
    }

    const oneMoreDay = 86400;

    statement.startDate =
      Math.floor(new Date(statement.startDate).getTime() / 1000) + oneMoreDay;
    statement.endDate =
      Math.floor(new Date(statement.endDate).getTime() / 1000) + oneMoreDay;
    statement.createDate = Math.floor(
      new Date(statement.createDate).getTime() / 1000
    );
    statement.createUserName = `${statement.create_user.firstName} ${statement.create_user.lastName}`;

    statement.invoiceLines = this.fixStorageInvoiceLines(
      statement.viewData,
      statement.invoiceLines,
      statement
    );

    return statement;
};

  async loadAttributeItems(
    attributeFlatNameId: string | number,
    moduleFlatNameId: string | number
  ): Promise<{ items: unknown[] }> {
    const { data } = await apiClient.get(
      `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
    )
    return { items: data }
  }

  async loadInvoiceLines(
    filters: StorageStatementSearchParams
  ): Promise<{ invoiceLines: StorageInvoiceDepotGroup[] }> {
    const { data } = await apiClient.post<StorageStatementLine[]>(
      '/depot-statement-service/storage/invoice-lines',
      filters
    )

    return {
      invoiceLines: this.fixStorageInvoiceLines(data ?? []),
    }
  }

  async loadOne(id: number): Promise<{ depotStatement: StorageDepotStatement }> {
    const { data } = await apiClient.get<StorageDepotStatement>(
      `/depot-statement-service/storage/${id}`
    )

    return {
      depotStatement: this.fixEditPageData(data),
    }
  }

  async create(
    data: StorageInvoiceDepotGroup[],
    searchParams: StorageStatementSearchParams
  ): Promise<{ depotStatement: StorageDepotStatement }> {
    const payload = this.destructureSearchData(data, searchParams)
    const response = await apiClient.post<StorageDepotStatement>(
      '/depot-statement-service/storage/',
      payload
    )

    return {
      depotStatement: response.data,
    }
  }

  async save(
    data: StorageInvoiceDepotGroup[],
    searchParams: StorageStatementSearchParams
  ): Promise<{ depotStatement: StorageDepotStatement }> {
    const payload = this.destructureSearchData(data, searchParams)
    const response = await apiClient.post<StorageDepotStatement>(
      '/depot-statement-service/storage/',
      payload
    )

    return {
      depotStatement: response.data,
    }
  }

  async delete(id: number): Promise<{ id: number }> {
    await apiClient.delete(`/depot-statement-service/storage/${id}`)
    return { id }
  }

  async downloadStorageStatementPDF(id: number | string): Promise<any> {
    const response = await apiClient.get(`/depot-statement-service/storage/statement-pdf/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `depot_storage_statement_${id}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    return response;
  }

  async downloadStorageStatementXLSX(id: number | string): Promise<any> {
    const response = await apiClient.get(`/depot-statement-service/storage/statement-xlsx/${id}`, {
      responseType: 'blob',
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `depot_storage_statement_${id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    return response;
  }
}


export const storageStatementAPI = new StorageStatementAPI()