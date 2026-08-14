import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CBadge,
  CAlert,
  CCallout,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSync, cilCloudUpload, cilCheckCircle, cilWarning } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import {
  useGetMigrationReconcileQuery,
  useRunMigrationMutation,
} from '../api/paymentCoreApi'
import type { MigrationReconciliation } from '../api/paymentCoreApi'

const MatchBadge: React.FC<{ match: boolean }> = ({ match }) => (
  <CBadge color={match ? 'success' : 'danger'}>{match ? 'MATCH' : 'MISMATCH'}</CBadge>
)

const MigrationDashboardPage: React.FC = () => {
  const { data: reconciliation, isLoading, refetch, isFetching } = useGetMigrationReconcileQuery()
  const [runMigration, { isLoading: isRunning, data: runResult }] = useRunMigrationMutation()

  const recon: MigrationReconciliation | undefined = reconciliation

  const handleRunMigration = async () => {
    await runMigration()
    refetch()
  }

  return (
    <>
      <PageHero
        icon={cilSync}
        title="Migration Dashboard"
        kicker="Phase 7"
        subtitle="Legacy MySQL to PostgreSQL payment data migration"
        actions={
          <div className="d-flex gap-2">
            <CButton
              color="secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh reconciliation data"
            >
              <CIcon icon={cilSync} className="me-1" />
              Refresh
            </CButton>
            <CButton
              color="primary"
              onClick={handleRunMigration}
              disabled={isRunning}
              title="Run legacy migration"
            >
              {isRunning ? (
                <CSpinner size="sm" className="me-1" />
              ) : (
                <CIcon icon={cilCloudUpload} className="me-1" />
              )}
              Run Migration
            </CButton>
          </div>
        }
      />

      {/* Migration Run Result */}
      {runResult && (
        <CRow className="mb-3">
          <CCol>
            <CCallout color={runResult.errors > 0 ? 'warning' : 'success'}>
              <strong>Migration Complete:</strong> {runResult.created} created, {runResult.skipped} skipped
              {runResult.errors > 0 && `, ${runResult.errors} errors`}
              {' '}(of {runResult.totalLegacy} total legacy records)
              {runResult.errorDetails.length > 0 && (
                <ul className="mt-2 mb-0">
                  {runResult.errorDetails.map((e, i) => (
                    <li key={i} className="text-danger small">{e}</li>
                  ))}
                </ul>
              )}
            </CCallout>
          </CCol>
        </CRow>
      )}

      {isLoading ? (
        <div className="text-center py-5">
          <CSpinner />
        </div>
      ) : !recon ? (
        <CAlert color="warning">
          Unable to load reconciliation data. Make sure MySQL port-forward is active
          and LEGACY_MYSQL_PASSWORD is set.
        </CAlert>
      ) : (
        <>
          {/* Side-by-side comparison */}
          <CRow className="mb-4">
            <CCol>
              <CCard>
                <CCardHeader>
                  <strong>Reconciliation: Legacy vs New</strong>
                </CCardHeader>
                <CCardBody>
                  <CTable striped hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Metric</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Legacy (MySQL)</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Migrated (PostgreSQL)</CTableHeaderCell>
                        <CTableHeaderCell className="text-end">Delta</CTableHeaderCell>
                        <CTableHeaderCell className="text-center">Status</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      <CTableRow>
                        <CTableDataCell>Payments</CTableDataCell>
                        <CTableDataCell className="text-end">{recon.paymentCount.legacy}</CTableDataCell>
                        <CTableDataCell className="text-end">{recon.paymentCount.migrated}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {Math.abs(recon.paymentCount.legacy - recon.paymentCount.migrated)}
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <MatchBadge match={recon.paymentCount.match} />
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>Statements</CTableDataCell>
                        <CTableDataCell className="text-end">{recon.statementCount.legacy}</CTableDataCell>
                        <CTableDataCell className="text-end">{recon.statementCount.migrated}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {Math.abs(recon.statementCount.legacy - recon.statementCount.migrated)}
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <MatchBadge match={recon.statementCount.match} />
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>Charges</CTableDataCell>
                        <CTableDataCell className="text-end">{recon.chargeCount.legacy}</CTableDataCell>
                        <CTableDataCell className="text-end">{recon.chargeCount.migrated}</CTableDataCell>
                        <CTableDataCell className="text-end">
                          {Math.abs(recon.chargeCount.legacy - recon.chargeCount.migrated)}
                        </CTableDataCell>
                        <CTableDataCell className="text-center">
                          <MatchBadge match={recon.chargeCount.match} />
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>Total USD</CTableDataCell>
                        <CTableDataCell className="text-end">${recon.totalUsd.legacy.toFixed(2)}</CTableDataCell>
                        <CTableDataCell className="text-end">${recon.totalUsd.migrated.toFixed(2)}</CTableDataCell>
                        <CTableDataCell className="text-end">${recon.totalUsd.delta.toFixed(4)}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <MatchBadge match={recon.totalUsd.match} />
                        </CTableDataCell>
                      </CTableRow>
                      <CTableRow>
                        <CTableDataCell>Total LPS</CTableDataCell>
                        <CTableDataCell className="text-end">L{recon.totalLps.legacy.toFixed(2)}</CTableDataCell>
                        <CTableDataCell className="text-end">L{recon.totalLps.migrated.toFixed(2)}</CTableDataCell>
                        <CTableDataCell className="text-end">L{recon.totalLps.delta.toFixed(4)}</CTableDataCell>
                        <CTableDataCell className="text-center">
                          <MatchBadge match={recon.totalLps.match} />
                        </CTableDataCell>
                      </CTableRow>
                    </CTableBody>
                  </CTable>
                </CCardBody>
              </CCard>
            </CCol>
          </CRow>

          {/* Discrepancies */}
          {recon.discrepancies.length > 0 && (
            <CRow>
              <CCol>
                <CCard>
                  <CCardHeader className="bg-danger text-white">
                    <CIcon icon={cilWarning} className="me-1" />
                    <strong>Discrepancies ({recon.discrepancies.length})</strong>
                  </CCardHeader>
                  <CCardBody>
                    <ul className="mb-0">
                      {recon.discrepancies.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          )}

          {recon.discrepancies.length === 0 && (
            <CRow>
              <CCol>
                <CAlert color="success" className="d-flex align-items-center">
                  <CIcon icon={cilCheckCircle} className="me-2" size="lg" />
                  All data matches between legacy and new system.
                </CAlert>
              </CCol>
            </CRow>
          )}
        </>
      )}
    </>
  )
}

export default MigrationDashboardPage
