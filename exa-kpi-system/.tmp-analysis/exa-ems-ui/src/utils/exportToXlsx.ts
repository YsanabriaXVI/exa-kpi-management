const EXCELJS_CDN = 'https://cdn.jsdelivr.net/npm/exceljs@1.7.0/dist/exceljs.min.js'

declare global {
  interface Window {
    ExcelJS?: any
  }
}

let excelPromise: Promise<any> | null = null

const ensureExcelJS = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Excel export is only supported in the browser'))
  }

  if (window.ExcelJS) {
    return Promise.resolve(window.ExcelJS)
  }

  if (!excelPromise) {
    excelPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = EXCELJS_CDN
      script.async = true
      script.onload = () => {
        if (window.ExcelJS) {
          resolve(window.ExcelJS)
        } else {
          reject(new Error('ExcelJS failed to load'))
        }
      }
      script.onerror = () => reject(new Error('Unable to load ExcelJS from CDN'))
      document.head.appendChild(script)
    })
  }

  return excelPromise
}

export interface ExportColumn {
  key: string
  label: string
}

export interface ExportOptions {
  columns: ExportColumn[]
  rows: any[]
  fileName: string
  sheetName?: string
}

const formatCellValue = (value: any) => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

export const exportToXlsx = async ({ columns, rows, fileName, sheetName = 'Sheet' }: ExportOptions) => {
  const ExcelJS = await ensureExcelJS()
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  worksheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.key,
    width: Math.max(15, String(column.label || '').length + 5),
  }))

  rows.forEach((row) => {
    const rowValues = columns.map((column) => formatCellValue(row?.[column.key]))
    worksheet.addRow(rowValues)
  })

  worksheet.getRow(1).font = { bold: true }
  worksheet.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => window.URL.revokeObjectURL(url), 1000)
}

export default exportToXlsx
