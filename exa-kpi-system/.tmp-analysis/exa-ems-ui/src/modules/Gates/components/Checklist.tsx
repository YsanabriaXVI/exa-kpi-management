import React, { useEffect, useState } from 'react'

import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CAlert,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormSelect,
  CFormText,
  CRow,
  CTooltip,
} from '@coreui/react-pro'

import type { GateChecklistSection, SelectOption } from '../types'
import './styles/Checklist.css'
import { cleanChecklist } from '../store/gates.slice'
import { useDispatch, useSelector } from "react-redux";

type Props = {
  checkList: any
  errors?: Record<string, string>
  isInsert: 'new' | 'edit' | string
  onChange: (e: any, partId: number, sectionId: number, type: 'conditionId' | 'remarks') => void
  equipmentTypeId: number | string
  statusOptions: SelectOption
  removeError: (
    partIndex: number,
    sectionIndex: number,
    field: 'conditionId' | 'remarks',
    errorBagKey: string,
  ) => void
  errorPrefix: string
  clientId?: number | string | null
  equipmentId?: number | string | null
  sizeEquipmentId?: number | string | null
  isViewMode?: boolean
}

function getChecklistFieldError(
  errors: Record<string, string> | undefined,
  partIndex: number,
  sectionIndex: number,
  field: 'conditionId' | 'remarks',
) {
  if (!errors) return null

  const legacyKey = `checkListData.equipmentParts[${partIndex}].partSections[${sectionIndex}].${field}`
  if (legacyKey in errors) return errors[legacyKey] ?? null

  const modernKey = `equipmentParts[${partIndex}].partSections[${sectionIndex}].${field}`
  return errors[modernKey] ?? null
}

export default function Checklist(props: Props) {
  const {
    checkList,
    errors,
    isInsert,
    onChange,
    equipmentTypeId,
    statusOptions,
    removeError,
    errorPrefix,
    clientId,
    equipmentId,
    sizeEquipmentId,
    isViewMode,
  } = props;

  const hasConfigInputs = clientId != null && clientId !== '' && sizeEquipmentId != null && sizeEquipmentId !== '';
  const checkListNotFound = "rejected" in checkList ? checkList.rejected : false;

  console.log("equipmentId:", equipmentId)
  console.log("checkList:", checkList)


  return (
    <div>
      <CCard>
        <CCardHeader color="primary">
          <div style={{ minHeight: '30px' }}>
            <strong>Inspection Checklist</strong>
          </div>
        </CCardHeader>

        <CCardBody>
          {checkListNotFound && (
            <CAlert color="danger" className="d-flex align-items-center gap-2">
              <span>
                ⚠️ Checklist not found for the selected combination of <strong>Location</strong>,{' '}
                <strong>Gate Type</strong>, <strong>Client</strong>, and{' '}
                <strong>Equipment Size/Type</strong>.
              </span>
            </CAlert>
          )}
          {errors && errors['checkListData.equipmentParts'] && (
            <CAlert color="danger" className="d-flex align-items-center gap-2">
              <span>
                ⚠️ {errors['checkListData.equipmentParts']}
              </span>
            </CAlert>
          )}

          {checkList?.defaultConfig === 1 && equipmentId !== null && (
            <CAlert color="primary" className="d-flex align-items-center gap-2 info-alert">
              <i className="icon-info box-icn" />
              <span> ℹ️ This is a default checklist.</span>
            </CAlert>
          )}

          {!hasConfigInputs ? (
            <div className="text-muted">
              * Choose Location, Gate Type, Client, and Equipment Size/Type to see configured checklist.
            </div>
          ) : (
            <CAccordion alwaysOpen>
              {checkList?.equipmentParts?.map((part: any, partIndex: number) => (
                <CAccordionItem key={String(part.equipmentPartId)}>
                  <CAccordionHeader>
                    <div>
                      <span className="fw-semibold">{part.partName}</span>

                      {isInsert === 'new' && part.description ? (
                        <span className="ms-auto">
                          <CTooltip content={part.description} placement="right">
                            <span style={{ cursor: 'pointer' }}>
                              <i className="icon-info box-icn" />
                            </span>
                          </CTooltip>
                        </span>
                      ) : null}
                    </div>
                  </CAccordionHeader>

                  <CAccordionBody>
                    {part.partSections?.map((section: any, sectionIndex: number) => {
                      const sectionId =
                        // legacy shape compatibility
                        'partSectionId' in section ? (section as any).partSectionId : (section as any).sectionId

                      const conditionErr = getChecklistFieldError(errors, partIndex, sectionIndex, 'conditionId')
                      const remarksErr = getChecklistFieldError(errors, partIndex, sectionIndex, 'remarks')

                      return (
                        <CRow key={String(sectionId)} className="align-items-start mb-2">
                          <strong>
                            {sectionIndex + 1}. {section.instruction}{' '}
                          </strong>
                          <br />
                          <br />

                          <CCol sm={12} xl={3} className="pt-2">
                            <p style={{ paddingLeft: '10%' }}> Section {section.code}</p>
                          </CCol>

                          <CCol sm={12} xl={3}>
                            <CFormSelect
                              name="conditionId"
                              onChange={(e) => {
                                onChange(e, part.equipmentPartId, sectionId, 'conditionId')
                                removeError(partIndex, sectionIndex, 'conditionId', `${errorPrefix}Errors`)
                              }}
                              value={section.conditionId ?? ''}
                              options={statusOptions as any}
                              disabled={!!isViewMode}
                              invalid={!!conditionErr}
                              feedbackInvalid={conditionErr}
                            />
                          </CCol>

                          <CCol sm={12} xl={5}>
                            <CFormInput
                              type="text"
                              placeholder="add remarks"
                              value={String((section as GateChecklistSection).remarks ?? '')}
                              invalid={!!remarksErr}
                              disabled={!!isViewMode}
                              onChange={(e) => {
                                onChange(e, part.equipmentPartId, sectionId, 'remarks')
                                removeError(partIndex, sectionIndex, 'remarks', `${errorPrefix}Errors`)
                              }}
                            />
                            {remarksErr && <CFormText className="text-danger">{remarksErr}</CFormText>}
                          </CCol>
                        </CRow>
                      )
                    })}
                  </CAccordionBody>
                </CAccordionItem>
              ))}
            </CAccordion>
          )}
        </CCardBody>
      </CCard>
    </div>
  )
}
