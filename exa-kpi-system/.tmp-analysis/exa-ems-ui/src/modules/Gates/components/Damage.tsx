import React, { useMemo, useRef, useState, useEffect } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CModal,
  CModalBody,
  CModalHeader,
  CRow,
} from '@coreui/react-pro'

import CIcon from '@coreui/icons-react'
import { cilPlus, cilImage, cilTrash, cilReload } from '@coreui/icons'
import type { DamageTypeOption, EquipmentPartForDamage, GateDamageDraft } from '../types'
import { loadGateImage, clearImage } from '../store/gates.slice'
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from 'src/store'
import { RootState } from 'src/store'
import { loadPartImage } from 'src/modules/PartsAndSections/store/partsAndSectionsSlice'
import RefImageModal from 'src/modules/Gates/components/RefImageModal';
import { EquipmentPart, EquipmentPartSection } from 'src/modules/PartsAndSections/types';


type SelectedFile = { name: string; imageId: number | string; url: string }

type Props = {
  title?: string
  gateIdTemp: number | string
  damageList: GateDamageDraft[]
  damageOptions: any[]
  errors?: Record<string, string | null> | null
  damagePrefix: string
  damageTypeOptions: DamageTypeOption[]
  equipmentParts: EquipmentPartForDamage[]
  isEdit: boolean
  isViewMode?: boolean
  onUploadImage?: (file: File, gateIdTemp: number | string) => Promise<{
    gateIdTemp: number | string
    imageId: number | string
    originalName: string
  }>
  onDeleteImage?: (imageId: number | string, gateIdTemp: number | string) => Promise<void>
  onSetFileDetails?: (
    gateIdTemp: number | string,
    imageId: number | string,
    listKey: string,
    originalName: string,
    damageIndex: number,
  ) => void
  loadPartImageUrl?: (equipmentPartId: number | string) => Promise<string | null>
  getExistingDamageImageUrl?: (gateDamageDataId: number | string, gateIdTemp: number | string) => string
  setDamages: any
  onChange: any
  imagesInfo?: any
  partsList?: EquipmentPart[]
}

export default function Damage({
  title = 'Damages',
  damageList,
  damageOptions,
  errors,
  damagePrefix,
  equipmentParts,
  isEdit,
  isViewMode = false,
  setDamages,
  onChange,
  imagesInfo,
  partsList
}: Props) {
  const fileInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const dispatch = useDispatch<AppDispatch>();

  const { imageFile: image } = useSelector((state: RootState) => (state as any).gates);
  const [selectedFiles, setSelectedFiles] = useState<Array<SelectedFile | null>>([])
  const [previewOpen, setPreviewOpen] = useState(false);
  const [imgViewOpen, setImgViewOpen] = useState(false);
  const [imgHeader, setImgHeader] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedOuterRef, setSelectedOuterRef] = useState<EquipmentPartSection | null>(null);

  const [partModalOpen, setPartModalOpen] = useState(false)
  const [selectedPart, setSelectedPart] = useState<EquipmentPartForDamage | null>(null)
  const [partImageUrl, setPartImageUrl] = useState<string | null>(null)

  const isTouchDevice = typeof window !== "undefined" &&
  (window.matchMedia?.("(pointer: coarse)").matches ||
   window.matchMedia?.("(hover: none)").matches);

  console.log("isTouchDevice ?", isTouchDevice);


useEffect(() => {
  return () => {
    damageList.forEach((d: any) => {
      const url = d?.damageImagePreview;
      if (typeof url === "string" && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });
  };
  // run once on unmount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

 //selector
 const { imageFile } = useSelector((state: RootState) => (state as any).partsAndSections);

  const getError = (index: number, field: string) => {
    if (!errors) return null
    const key = `${damagePrefix}.${index}.${field}`
    return (errors[key] ?? null) as string | null
  }

  const handleImageViewer = (img: any, damage: any) => {
    if (isEdit) {
      const img_id = img.depotImageId;
      const img_key = img.key;
      dispatch(loadGateImage({ id: img_id, key: img_key }));
      setImgViewOpen(true)
      setImgHeader(`${img_key}`)
    }
  }

  const openPartModal = () => {
    if (isViewMode) return
    setSelectedPart(null)
    setPartImageUrl(null)
    setPartModalOpen(true)
  }

  const selectReferent = (part: any, section: any) => {

    console.log("ref part", part)
    console.log("ref section", section)

    const next: GateDamageDraft = {
      damageId: null,
      partName: part.partName,
      partId: part.equipmentPartId,
      sectionId: section?.sectionId,
      sectionName: section?.isoCode ?? '',
      remarks: '',
      gateDamageDataId: null,
      additional: true,
    }
    
    setDamages((prev : any) => {
      return [...prev, next]
    })

    setPartModalOpen(false);
}

const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, index: number, damageType: string) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ✅ revoke only the previous preview for THIS index
  const prevUrl = damageList[index]?.damageImagePreview;
  if (prevUrl?.startsWith("blob:")) URL.revokeObjectURL(prevUrl);

  const imageURL = URL.createObjectURL(file);

  onChange({ target: { name: "damageImage", value: file } }, index, damageType);
  onChange({ target: { name: "damageImagePreview", value: imageURL } }, index, damageType);
};

  const handleOpenPreview = (damage: any) => {
    console.log("handleOpenPreview damage:", damage.damageImagePreview)
    setPreviewOpen(true);
    setPreview(damage.damageImagePreview);
  };

const clearFileInput = (index: number) => {
  const input = fileInputRefs.current[index];
  if (input) input.value = ""; // ✅ clears "No file chosen"
};

  const handleDeleteSelected = (index: number, damageType: string) => {
    onChange({ target: { name: "damageImage", value: null } }, index, damageType);
    onChange({ target: { name: "damageImagePreview", value: null } }, index, damageType);
    clearFileInput(index);
  }

  const selectOuterRef = (refSection: any) => {
    console.log("selectOuterRef", refSection)
    setSelectedOuterRef(refSection)
  }

 const deleteAdditionalDamage = (index: number) => {
  setDamages((prev : any) => {
    return [...prev.slice(0, index), ...prev.slice(index + 1)]
  })
 }

  const outerRefParts = useMemo(
    () => (partsList ?? []).filter((x: any) => x?.outerRef === 1),
    [partsList]
  );

  const referentParts = useMemo(
    () => (partsList ?? []).filter((x: any) => x?.outerRef !== 1),
    [partsList]
  )

const [imagesByPartId, setImagesByPartId] = useState<Record<number, any>>({})
const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set())

useEffect(() => {
  if (!outerRefParts?.length || isEdit) return

  let cancelled = false
  const ids = [...new Set(outerRefParts.map(p => Number(p.equipmentPartId)))]

  ;(async () => {
    // mark loading
    setLoadingIds(prev => new Set([...prev, ...ids]))

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const payload = await dispatch(loadPartImage({ id })).unwrap()
          return [id, payload] as const
        } catch (e) {
          return [id, null] as const
        }
      })
    )

    if (cancelled) return

    setImagesByPartId(prev => ({
      ...prev,
      ...Object.fromEntries(results),
    }))

    setLoadingIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  })()

  return () => {
    cancelled = true
  }
}, [dispatch, outerRefParts])

useEffect(() => {
  if (selectedOuterRef == null && !isEdit) return

  ;(async () => {
    const ids = [selectedOuterRef?.referent].filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id)
    )

    if (ids.length === 0) return

    setLoadingIds(prev => new Set([...prev, ...ids]))

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const payload = await dispatch(loadPartImage({ id })).unwrap()
          return [id, payload] as const
        } catch {
          return [id, null] as const
        }
      })
    )

    setImagesByPartId(prev => ({
      ...prev,
      ...Object.fromEntries(results),
    }))

    setLoadingIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  })()

  console.log("selectOuterRef", selectedOuterRef)
}, [selectedOuterRef?.referent, isEdit, dispatch])

  return (
    <>
      <CCard>
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <div style={{ minHeight : "28px"}}>
            <strong>{title}</strong>
          </div>
          {!isViewMode && (
            <CButton color="light" size="sm" onClick={openPartModal}>
              <CIcon icon={cilPlus} size="sm" onClick={openPartModal}/> Add Damage
            </CButton>
          )}
        </CCardHeader>

        <CCardBody>
          {damageList.length === 0 ? (
            <div className="text-muted">* No damages added.</div>
          ) : (
            damageList.map((d, index) => {
              const img = imagesInfo?.images.find((i: any) => String(i.controlId2) === String(d.gateDamageDataId))
              const imgFound = img !== undefined;
              const hasDamageImage = d.damageImage instanceof File;
    
              return (
              <div key={`${d.partId}-${d.sectionId}-${index}`} className="mb-3">
                <div className="mb-2">
                  <strong>Part:</strong> {d.partName}, <strong>Section:</strong> {d.sectionName}
                </div>

                <CRow className="g-2 align-items-start">
                  <CCol xs={12} xl={4}>
                    <CFormSelect
                      name="damageId"
                      //label="Damage"
                      onChange={(e) => onChange(e, index, `${damagePrefix}Damage`)}
                      value={d.damageId ?? ''}
                      options={damageOptions as any}
                      disabled={isViewMode}
                      invalid={!!getError(index, 'damageId')}
                      feedbackInvalid={getError(index, 'damageId')}
                    />
                  </CCol>

                  <CCol xs={12} xl={4}>
                    <CFormInput
                      type="text"
                      name="remarks"
                      required
                      onChange={(e) => onChange(e, index, `${damagePrefix}Damage`)}
                      value={d.remarks ?? ''}
                      invalid={!!getError(index, 'remarks')}
                      feedbackInvalid={getError(index, 'remarks')}
                      disabled={isViewMode}
                    />
                  </CCol>

                  <CCol xs={12} xl={3}>
                    <div className="d-flex gap-2 flex-wrap">
                      {!isEdit && (
                        <>
                        <CFormInput
                          //key={fileInputKey}
                          type="file"
                          //size="sm"
                          id="formFileDisabled"
                          //label="Attach Image File"
                          accept="image/*"
                          ref={(el) => (fileInputRefs.current[index] = el) as any}
                          onChange={(e) => handleImageSelect(e, index, `${damagePrefix}Damage`)}
                          style={{ background: hasDamageImage ? "#4cebb8": "#fff" }}
                           {...(isTouchDevice ? { capture: "environment" } : {})}
                          //disabled={viewMode}
                        />
                        { hasDamageImage && 
                        <CButton variant="outline" onClick={()=> handleOpenPreview(d)}>
                          <CIcon icon={cilImage} />
                        </CButton>}
                        { hasDamageImage && 
                        <CButton variant="outline" onClick={()=> handleDeleteSelected(index, `${damagePrefix}Damage`)}>
                          <CIcon icon={cilReload} />
                        </CButton>}
                      </>
                      )}

                      {isEdit && imgFound && (
                        <CButton
                          //color="primary"
                          variant="outline"
                          size="md"
                          onClick={() => handleImageViewer(img, d)}
                          disabled={!d.gateDamageDataId}
                          //style={{ backgroundColor: "#4cebb8"}}
                        >
                          <CIcon icon={cilImage} />
                        </CButton>
                      )}

                    </div>

                    {!isEdit && selectedFiles[index] && (
                      <div className="mt-1 text-muted" style={{ fontSize: 12 }}>
                        {selectedFiles[index]?.name}
                      </div>
                    )}
                  </CCol>
                  <CCol xs={12} xl={1}>
                  { d?.additional && <CButton variant="outline" onClick={()=> deleteAdditionalDamage(index)}>
                    <CIcon icon={cilTrash} />
                  </CButton>}
                  </CCol>
                </CRow>
              </div>
            )})
          )}
        </CCardBody>
      </CCard>

      {/* Image viewer (image already stored) */}
      <CModal visible={imgViewOpen} onClose={() => {
        setImgViewOpen(false); 
        dispatch(clearImage());
        }} size="lg">
        <CModalHeader closeButton>{imgHeader}</CModalHeader>
        <CModalBody>{image ? <img src={image?.url} alt="Preview" style={{ width: '100%' }} /> : null}</CModalBody>
      </CModal>
      { /* Image preview (before upload) */}
      <CModal visible={previewOpen} onClose={() => {
        setPreviewOpen(false); 
        }} size="lg">
        <CModalHeader closeButton>{imgHeader}</CModalHeader>
        <CModalBody><img src={preview as string} alt="Preview" style={{ width: '100%' }} /></CModalBody>
      </CModal>

      {/* Select part modal */}
     <RefImageModal
        isOpen={partModalOpen}
        toggleModal={
          (BOOL : boolean) => {
            setPartModalOpen(BOOL);
          }
        }
        backToOuterRef = {() => setSelectedOuterRef(null)}
        outerRefParts = {outerRefParts}
        referentParts = {referentParts}
        imagesByPartId = {imagesByPartId}
        onSelectOuterRef={selectOuterRef}
        onSelectReferent={selectReferent}
        selectedOuterRef={selectedOuterRef}
     />
    </>
  )
}
