import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  CBadge,
  CButton,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react-pro'
import CurrencyDisplay from './CurrencyDisplay'
import type { CalculateChargesResponse } from '../types.v2'

interface ChargePreviewModalProps {
  visible: boolean
  onClose: () => void
  previewData: CalculateChargesResponse | null
  isLoading: boolean
  onConfirm: () => void
  isApplying: boolean
}

const ChargePreviewModal: React.FC<ChargePreviewModalProps> = ({
  visible,
  onClose,
  previewData,
  isLoading,
  onConfirm,
  isApplying,
}) => {
  const { t, i18n } = useTranslation('payments')
  const charges = previewData?.charges ?? []

  return (
    <CModal alignment="center" size="lg" visible={visible} onClose={onClose}>
      <CModalHeader closeButton>
        <CModalTitle>{t('chargePreview.title')}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isLoading ? (
          <div className="text-center py-4">
            <CSpinner />
            <div className="mt-2 text-body-secondary">{t('chargePreview.calculating')}</div>
          </div>
        ) : charges.length === 0 ? (
          <div className="text-center py-4 text-body-secondary">
            {t('chargePreview.noCharges')}
          </div>
        ) : (
          <div className="table-responsive">
            <CTable hover striped className="align-middle mb-0">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>{t('detail.chargeType')}</CTableHeaderCell>
                  <CTableHeaderCell>{t('detail.chargeSection')}</CTableHeaderCell>
                  <CTableHeaderCell className="text-end text-danger">
                    {t('charges.entry.DEBIT')} USD
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end text-success">
                    {t('charges.entry.CREDIT')} USD
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end text-danger">
                    {t('charges.entry.DEBIT')} LPS
                  </CTableHeaderCell>
                  <CTableHeaderCell className="text-end text-success">
                    {t('charges.entry.CREDIT')} LPS
                  </CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {charges.map((charge, idx) => (
                  <CTableRow key={charge.id || idx}>
                    <CTableDataCell className="fw-semibold">
                      {(i18n.language === 'es' && charge.typeNameEs) || charge.typeName || '—'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CBadge color="secondary">{t(`charges.section.${charge.section}`, charge.section)}</CBadge>
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-danger">
                      {charge.debitUsd ? <CurrencyDisplay value={charge.debitUsd} currency="USD" /> : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-success">
                      {charge.creditUsd ? <CurrencyDisplay value={charge.creditUsd} currency="USD" /> : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-danger">
                      {charge.debitLps ? <CurrencyDisplay value={charge.debitLps} currency="LPS" /> : '—'}
                    </CTableDataCell>
                    <CTableDataCell className="text-end text-success">
                      {charge.creditLps ? <CurrencyDisplay value={charge.creditLps} currency="LPS" /> : '—'}
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
              {previewData && (
                <CTableFoot>
                  <CTableRow className="fw-bold">
                    <CTableDataCell colSpan={2} className="text-end">
                      {t('chargePreview.totalDebit')}
                    </CTableDataCell>
                    <CTableDataCell colSpan={2} className="text-end text-danger">
                      <CurrencyDisplay value={previewData.totalDebit} currency="USD" />
                    </CTableDataCell>
                    <CTableDataCell colSpan={2}></CTableDataCell>
                  </CTableRow>
                  <CTableRow className="fw-bold">
                    <CTableDataCell colSpan={2} className="text-end">
                      {t('chargePreview.totalCredit')}
                    </CTableDataCell>
                    <CTableDataCell colSpan={2} className="text-end text-success">
                      <CurrencyDisplay value={previewData.totalCredit} currency="USD" />
                    </CTableDataCell>
                    <CTableDataCell colSpan={2}></CTableDataCell>
                  </CTableRow>
                  <CTableRow className="fw-bold bg-body-tertiary">
                    <CTableDataCell colSpan={2} className="text-end">
                      {t('chargePreview.netEffect')}
                    </CTableDataCell>
                    <CTableDataCell colSpan={2} className="text-end">
                      <CurrencyDisplay value={previewData.netEffect} currency="USD" />
                    </CTableDataCell>
                    <CTableDataCell colSpan={2}></CTableDataCell>
                  </CTableRow>
                </CTableFoot>
              )}
            </CTable>
          </div>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onClose} disabled={isApplying}>
          {t('confirm.cancel')}
        </CButton>
        <CButton
          color="primary"
          className="text-white"
          disabled={isLoading || isApplying || charges.length === 0}
          onClick={onConfirm}
        >
          {isApplying ? (
            <><CSpinner size="sm" className="me-1" />{t('chargePreview.applying')}</>
          ) : (
            t('chargePreview.apply')
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ChargePreviewModal
