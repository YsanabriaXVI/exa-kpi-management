import apiClient from '../../../services/api/axios.config'
import { FixedEquipmentParts, EquipmentParts, EquipmentType, EquipmentSize, DefaultPart, DefaultSection, EquipmentPartImage } from '../types'
import fixListPageData from '../helpers/fixListPageData'
import { v4 as uuidv4 } from "uuid";

interface PartsAndSecsState {
  list: FixedEquipmentParts[]
  part: EquipmentParts | boolean
  errors: string | null
  isLoading: boolean,
  total: number
  gensetTypesList: any[]
}


class PartsAndSectionsAPI {
  async loadPartsList(): Promise<{ list: FixedEquipmentParts[], total: number }> {
    // Tell axios that data is FixedEquipmentParts[]
    const { data } = await apiClient.get<FixedEquipmentParts[]>('/equipment-service/parts');
    const total = data.length;
    console.log("p & s DATA", data);

    const fixedResponse = fixListPageData(data)

    console.log("fixedResponse", fixedResponse)

    return {
      list: fixedResponse,
      total
    }
  }

  // Transfer this method to equipment size
  async loadEquipmentTypes(): Promise<{ equipmentTypesList: EquipmentType[] }> {
    const { data } = await apiClient.get<EquipmentType[]>('/equipment-service');
    return {
      equipmentTypesList: data
    }
  }

  // Transfer this method to equipment size
  async loadSizesList(): Promise<{ equipmentSizesList: EquipmentSize[] }> {
    const { data } = await apiClient.get<EquipmentSize[]>('/equipment-service/size');
    return {
      equipmentSizesList: data
    }
  }

  async loadPart(id: number): Promise<PartsAndSecsState> {
    const { data } = await apiClient.get<EquipmentParts>(
      `/equipment-service/parts/${id}`,
    )

    return {
      list: [],
      part: data,
      errors: null,
      isLoading: false,
      total: 0,
    }
  }

private isFile(v: any): v is File {
  return typeof File !== "undefined" && v instanceof File;
}

  _fixForm(form: any): any {
   return {
    partData: {
      equipmentTypeId:
        form.equipmentTypeId != null ? Number(form.equipmentTypeId) : null,
      sizeEquipmentId:
        form.sizeEquipmentId != null ? Number(form.sizeEquipmentId) : null,
      gensetTypeId:
        form.gensetTypeId != null ? Number(form.gensetTypeId) : null,
      partName: form.partName ?? null,
      outerRef: form.outerRef ?? 0,
      description: form.description ?? null,
    },
    sectionsData: (form.sections_data ?? []).map((section: any) => ({
      sectionId: section.sectionId ?? null,
      code: section.code ?? null,
      isoCode: section.isoCode ?? null,
      coordinates: section.coordinates ?? null,
      referent: section.referent ?? null,
      description: section.description ?? null,
    })),
    imageFile: this.isFile(form.imageFile) ? form.imageFile : null,
  };
  };

  getDefaultPart(): DefaultPart {
  const sectionsDefault = {
    sectionID: '',
    code: 'Click to Edit...',
    isoCode: 'Click to Edit...',
    coordinates: 'Click to Edit...',
    description: 'Click to Edit...',
  };

  const defaultPartObj = {
    partName: null,
    description: null,
    equipmentTypeId: null,
    sizeEquipmentId: null,
    gensetTypeId: null,
    sections_data: [{ ...sectionsDefault }],
    status: 1,
  };

  return defaultPartObj;
};

async addPartAndSections(form: any): Promise<any> {
  try {
    const fixedForm = this._fixForm(form);
    const formData = new FormData();

    formData.append("partData", JSON.stringify(fixedForm.partData));
    formData.append("sectionsData", JSON.stringify(fixedForm.sectionsData));

    if (fixedForm.imageFile) {
      formData.append(
        "imageFile",
        fixedForm.imageFile,
        fixedForm.imageFile.name
      );
    }

    //console.log("form data sent: ", formData);

    const response = await apiClient.post<any>(
      "/equipment-service/parts",
      formData,
      {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
    );

    return response?.data;
  } catch (error: any) {
    console.error("FULL AXIOS ERROR:", error);
    throw error;
  }
}

async savePartAndSections(id: number, form: any): Promise<any> {
  try {
    const fixedForm = this._fixForm(form);
    const formData = new FormData();

    formData.append("partData", JSON.stringify(fixedForm.partData));
    formData.append("sectionsData", JSON.stringify(fixedForm.sectionsData));

    if (fixedForm.imageFile) {
      formData.append(
        "imageFile",
        fixedForm.imageFile,
        fixedForm.imageFile.name
      );
    }

    console.log("form data sent by PUT: ", formData);

    for (const [key, value] of formData.entries()) {
      console.log("FormData entry:", key, value);
    }

    const response = await apiClient.put<any>(
      `/equipment-service/parts/${id}`,
      formData,
       {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      
    );

    return response?.data?.data ?? response?.data;
  } catch (error: any) {
    console.error("FULL AXIOS ERROR:", error);
    console.error("error.response:", error?.response);
    console.error("error.request:", error?.request);
    console.error("error.message:", error?.message);
    console.error("error.code:", error?.code);
    throw error;
  }
}

loadDefaultPart(): DefaultPart {
  const defaultPartObj = this.getDefaultPart();
  return defaultPartObj;
};


public async loadEquipmentPartImage(id: number): Promise<EquipmentPartImage | null> {
    try {

      const v = Date.now(); 

      const res = await apiClient.get<Blob>(
        `/equipment-service/parts/img-file/${id}`,
        {
          params: { v },
          responseType: "blob",   
          validateStatus: (status) => status < 500 
        }
      );

      // Handle no-image case
      if (res.status === 404) {
        return null;
      }

      // Handle error case
      if (res.status < 200 || res.status >= 300) {
        let text = "";
        try {
          text = await res.data.text();
        } catch {}
        throw new Error(`HTTP ${res.status} ${res.statusText} ${text}`);
      }

      // axios gives us the Blob directly as res.data
      const blob = res.data;
      const contentType = res.headers["content-type"] || blob.type || "image/png";
      const lastModified = res.headers["last-modified"] ?? null;

      // Create a browser URL from the blob
      const objectUrl = URL.createObjectURL(blob);

      // Build response structure
      const image: EquipmentPartImage = {
        control_id: uuidv4(),
        attachment_id: id,
        name: `equipment-part-${id}`,
        type: contentType,
        url: objectUrl,
        lastModified
      };

      return image;

    } catch (error) {
      console.error("Failed to load equipment part image", error);
      return null;
    }
  }

  public async deletePart(id: number) {
    try {
      await apiClient.delete(`/equipment-service/parts/${id}`);
    } catch (error) {
      throw error;
    }
  }

  public async deleteSection(id: number) {
    console.log("delete section:", id)
    
    try {
      await apiClient.delete(`/equipment-service/section/${id}`);
    } catch (error) {
      throw error;
    }
  }


  async loadAttributeItems(attributeFlatNameId: string | number, moduleFlatNameId: string | number) {
    const url = `/attribute-service/attributes/?attribute_flat_name_id=${attributeFlatNameId}&module_flat_name_id=${moduleFlatNameId}`
    const { data } = await apiClient.get<any>(url)
    return { items: data }
  }


}

export const partsAndSectionsAPI = new PartsAndSectionsAPI()
