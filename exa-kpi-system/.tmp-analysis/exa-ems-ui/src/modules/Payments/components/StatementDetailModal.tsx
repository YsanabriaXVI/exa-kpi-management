import React from 'react'
import {
  CButton,
  CModal,
  CModalBody,
  CModalHeader,
  CModalTitle,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CSpinner,
  CBadge,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilExternalLink } from '@coreui/icons'
import { useTranslation } from 'react-i18next'
import CurrencyDisplay from './CurrencyDisplay'
import type { StatementDetail } from '../types.v2'

interface Props {
  visible: boolean
  onClose: () => void
  detail: StatementDetail | null
  isLoading: boolean
  entityNames?: { client?: string; subdivision?: string }
  showKms?: boolean
}

const StatementDetailModal: React.FC<Props> = ({
  visible,
  onClose,
  detail,
  isLoading,
  entityNames,
  showKms = true,
}) => {
  const { t } = useTranslation('payments')

  return (
    <CModal visible={visible} onClose={onClose} size="xl" alignment="center">
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2">
          <span>
            {t('statements.statementNumber')}{' '}
            <CBadge color="primary">{detail?.statementNumber || detail?.legacyId || '...'}</CBadge>
          </span>
          {detail?.legacyId && (
            <CButton
              color="primary"
              variant="ghost"
              size="sm"
              title={t('statementDetail.viewInLegacy', 'View Statement')}
              onClick={() => {
                const path = detail.type === 'CLIENT_INVOICE'
                  ? `/operations/client-statements/${detail.legacyId}`
                  : `/operations/subdivision-statements/${detail.legacyId}`
                window.open(path, '_blank')
              }}
            >
              <CIcon icon={cilExternalLink} size="sm" />
            </CButton>
          )}
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isLoading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : detail ? (
          <>
            {/* Statement summary row */}
            <div className="bg-body-tertiary rounded p-3 mb-3">
              <div className="row g-2 text-center">
                <div className="col-6 col-md-2">
                  <small className="text-body-secondary d-block">{t('statements.week')}</small>
                  <div className="fw-bold">{detail.weekId}</div>
                </div>
                <div className="col-6 col-md-2">
                  <small className="text-body-secondary d-block">{t('statements.trips')}</small>
                  <div className="fw-bold">{detail.tripCount}</div>
                </div>
                {showKms && (
                  <div className="col-6 col-md-2">
                    <small className="text-body-secondary d-block">{t('statements.totalKm')}</small>
                    <div className="fw-bold">{detail.totalKm?.toLocaleString() ?? 0}</div>
                  </div>
                )}
                <div className={`col-6 ${showKms ? 'col-md-3' : 'col-md-4'}`}>
                  <small className="text-body-secondary d-block">{t('statements.totalLps')}</small>
                  <div className="fw-bold">
                    <CurrencyDisplay value={detail.finalTotalLps} currency="LPS" />
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <small className="text-body-secondary d-block">{t('statements.totalUsd')}</small>
                  <div className="fw-bold">
                    <CurrencyDisplay value={detail.finalTotalUsd} currency="USD" />
                  </div>
                </div>
              </div>
              {(entityNames?.client || entityNames?.subdivision) && (
                <div className="row g-2 text-center mt-1">
                  {entityNames.client && (
                    <div className="col-6">
                      <small className="text-body-secondary d-block">{t('fields.clients')}</small>
                      <div className="fw-bold">{entityNames.client}</div>
                    </div>
                  )}
                  {entityNames.subdivision && (
                    <div className="col-6">
                      <small className="text-body-secondary d-block">{t('fields.subdivisions')}</small>
                      <div className="fw-bold">{entityNames.subdivision}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trip breakdown table */}
            <h6 className="mb-2">{t('statementDetail.tripsTitle')}</h6>
            {detail.trips.length === 0 ? (
              <p className="text-body-secondary">{t('statementDetail.noTrips')}</p>
            ) : (
              <div className="table-responsive">
                <CTable hover striped align="middle" className="mb-0" small>
                  <CTableHead color="light">
                    <CTableRow>
                      <CTableHeaderCell>#</CTableHeaderCell>
                      <CTableHeaderCell>{t('statementDetail.tripId')}</CTableHeaderCell>
                      {showKms && (
                        <CTableHeaderCell className="text-end">
                          {t('statementDetail.invKm')}
                        </CTableHeaderCell>
                      )}
                      <CTableHeaderCell className="text-end">
                        {t('statementDetail.invPrice')}
                      </CTableHeaderCell>
                      {showKms && (
                        <CTableHeaderCell className="text-end">
                          {t('statementDetail.payKm')}
                        </CTableHeaderCell>
                      )}
                      <CTableHeaderCell className="text-end">
                        {t('statementDetail.payPrice')}
                      </CTableHeaderCell>
                      <CTableHeaderCell className="text-end">
                        {t('statementDetail.counterRate')}
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {detail.trips.map((trip, idx) => (
                      <CTableRow key={trip.id}>
                        <CTableDataCell>{idx + 1}</CTableDataCell>
                        <CTableDataCell>
                          <code>{trip.legacyTripId ?? trip.tripId.slice(0, 8)}</code>
                        </CTableDataCell>
                        {showKms && (
                          <CTableDataCell className="text-end">
                            {trip.invKm?.toLocaleString() ?? '—'}
                          </CTableDataCell>
                        )}
                        <CTableDataCell className="text-end">
                          {trip.invPrice != null ? (
                            <CurrencyDisplay value={trip.invPrice} currency="USD" />
                          ) : '—'}
                        </CTableDataCell>
                        {showKms && (
                          <CTableDataCell className="text-end">
                            {trip.payKm?.toLocaleString() ?? '—'}
                          </CTableDataCell>
                        )}
                        <CTableDataCell className="text-end">
                          {trip.payPrice != null ? (
                            <CurrencyDisplay value={trip.payPrice} currency="USD" />
                          ) : '—'}
                        </CTableDataCell>
                        <CTableDataCell className="text-end">
                          {trip.counterRate ?? '—'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell colSpan={2}>
                        {t('statementDetail.total')}
                      </CTableHeaderCell>
                      {showKms && (
                        <CTableHeaderCell className="text-end">
                          {detail.trips.reduce((s, t) => s + (t.invKm ?? 0), 0).toLocaleString()}
                        </CTableHeaderCell>
                      )}
                      <CTableHeaderCell className="text-end">
                        <CurrencyDisplay
                          value={detail.trips.reduce((s, t) => s + (t.invPrice ?? 0), 0)}
                          currency="USD"
                        />
                      </CTableHeaderCell>
                      {showKms && (
                        <CTableHeaderCell className="text-end">
                          {detail.trips.reduce((s, t) => s + (t.payKm ?? 0), 0).toLocaleString()}
                        </CTableHeaderCell>
                      )}
                      <CTableHeaderCell className="text-end">
                        <CurrencyDisplay
                          value={detail.trips.reduce((s, t) => s + (t.payPrice ?? 0), 0)}
                          currency="USD"
                        />
                      </CTableHeaderCell>
                      <CTableHeaderCell />
                    </CTableRow>
                  </CTableHead>
                </CTable>
              </div>
            )}
          </>
        ) : null}
      </CModalBody>
    </CModal>
  )
}

export default StatementDetailModal
