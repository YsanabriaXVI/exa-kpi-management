
import apiClient from '../../../../services/api/axios.config'
import { v4 as uuidv4 } from "uuid";
import { 
  JobRateRow, 
  JobRateFormRow, 
  JobRatesForm, 
  AddJobRatesResponse, 
  LoadJobRatesListResponse, 
  LoadJobRatesGroupResponse 
} from '../types/index';

export type Id = string | number
export type AttributeItem = any

export class JobsAPI {
  getDefaultJob(setupId: number): JobRatesForm {
    const defaultJobs: JobRateFormRow = {
      job: 'Click to Edit...',
      jobId: 'Click to Edit...' as any,
      MHEmpty: 'Click to Edit...' as any,
      MHLoaded: 'Click to Edit...' as any,
      CHEmpty: 'Click to Edit...' as any,
      CHLoaded: 'Click to Edit...' as any,
      PriceOrQty: 'Click to Edit...' as any,
    }

    return {
      setupId,
      equipmentSizeId: null,
      gensetTypeId: null,
      jobs_data: [{ ...defaultJobs }],
    }
  }

  async loadAttributeItems(
    attributeFlatNameId: string,
    moduleFlatNameId: string,
  ): Promise<AttributeItem[]> {
    const { data } = await apiClient.get<AttributeItem[]>(
      `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`,
    )
    return data
  }


  public _fixForm(form: JobRatesForm): {
    fixedData: JobRateRow[]
    wasUpdated: boolean
    wasAdded: boolean
  } {
    const fixedData: JobRateRow[] = []
    let wasUpdated = false
    let wasAdded = false

    form.jobs_data.forEach((job) => {
      if ('jobRateId' in job && typeof job.jobRateId === 'number') {
        wasUpdated = true
        fixedData.push(job as any)
        return
      }

      wasAdded = true

      fixedData.push({
        equipmentSizeId: form.equipmentSizeId === null ? null : parseInt(String(form.equipmentSizeId), 10),
        gensetTypeId: form.gensetTypeId === null ? null : parseInt(String(form.gensetTypeId), 10),
        setupId: parseInt(String(form.setupId), 10),

        jobId: parseInt(String(job.jobId), 10),

        MHEmpty: Number(String(job.MHEmpty ?? 0)),
        MHLoaded: Number(String(job.MHLoaded ?? 0)),
        CHEmpty: Number(String(job.CHEmpty ?? 0)),
        CHLoaded: Number(String(job.CHLoaded ?? 0)),
        PriceOrQty: Number(String(job.PriceOrQty ?? 0)),

        active: 1,
        status: 1,
      })
    })

    return { fixedData, wasUpdated, wasAdded }
  }

  /** JS: _fixResult(result, sizeId, setupId) */
  private _fixResult(result: any, sizeId: number, setupId: number) {
    if (!sizeId) return result

    const fixedJobsData: any[] = []

    result.forEach((elem: any) => {
      if (elem.equipmentSizeId === sizeId) {
        if ('attribute_data' in elem) elem.job = elem.attribute_data.name
        fixedJobsData.push(elem)
      }
      if (elem.gensetTypeId === sizeId) {
        if ('attribute_data' in elem) elem.job = elem.attribute_data.name
        fixedJobsData.push(elem)
      }
    })

    return {
      setupId,
      equipmentSizeId: sizeId,
      jobs_data: this._assigJobRowId(fixedJobsData),
    }
  }

  private _assigJobRowId (jobs_data: any[]) {
    jobs_data.forEach((job: any) => {
      job.id = uuidv4()
    })
    return jobs_data;
  }


  async loadJobRatesList(setupId: number): Promise<LoadJobRatesListResponse> {
    const { data } = await apiClient.get<JobRateRow[]>(
      `/depot-setup-service/jobs/setup/${setupId}`,
    )
    console.log('🔍 [API] Raw job rates data:', this._assigJobRowId(data))
    return { list: data }
  }


  async loadJobRatesGroup(setupId: number, sizeId: number): Promise<LoadJobRatesGroupResponse> {
    const { data } = await apiClient.get<JobRateRow[]>(
      `/depot-setup-service/jobs/setup/${setupId}`,
    )

    const fixedJobsData: any[] = []
    let isGenset = false

    data.forEach((elem: any) => {
      if (elem.equipmentSizeId !== null && elem.equipmentSizeId === sizeId) {
        elem.job = elem.attribute_data?.name ?? elem.job
        fixedJobsData.push(elem)
      } else if (elem.gensetTypeId !== null && elem.gensetTypeId === sizeId) {
        elem.job = elem.attribute_data?.name ?? elem.job
        fixedJobsData.push(elem)
        isGenset = true
      }
    })

    const fixedResult: JobRatesForm = {
      setupId,
      equipmentSizeId: isGenset ? null : sizeId,
      gensetTypeId: isGenset ? sizeId : null,
      sizeType: sizeId,
      jobs_data: this._assigJobRowId(fixedJobsData),
    }

    return { job: fixedResult }
  }


  async addJobRates(form: JobRatesForm): Promise<AddJobRatesResponse> {
    const fixed = this._fixForm(form)

    const { data } = await apiClient.post<JobRateRow[]>(
      '/depot-setup-service/jobs',
      fixed.fixedData,
    )

    // old thunk used first record's sizeId/setupId to refix response
    const first = Array.isArray(data) && data.length ? data[0] : null
    const sizeId = first?.equipmentSizeId || first?.gensetTypeId
    const setupId = first?.setupId

    const job = (sizeId && setupId) ? this._fixResult(data, sizeId, setupId) : data

    return {
      job,
      stats: { wasAdded: fixed.wasAdded, wasUpdated: fixed.wasUpdated },
    }
  }


  async deleteJobRates({ jobRateId: id }: { jobRateId: number }): Promise<void> {
    await apiClient.delete(`/depot-setup-service/jobs/${id}`)
  }


  async deleteJobRatesGroup(setupId: number, sizeId: number): Promise<boolean> {
    const res = await apiClient.delete(`/depot-setup-service/jobs/setup/${setupId}/equipmentSize/${sizeId}`)
    console.log('🔍 [API] deleteJobRatesGroup - Response:', res)
    return Boolean(res?.data?.deleted);
  }
}

export const jobsAPI = new JobsAPI()
