/**
 * Nabi Approvals Page — view and decide on pending tool approvals
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CButton,
  CSpinner,
  CBadge,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilCheckAlt, cilX, cilShieldAlt } from '@coreui/icons'
import PageHero from '../../components/PageHero'
import { authStorage } from '../../services/auth/auth.storage'

const NABI_API = import.meta.env.VITE_NABI_API_URL || 'http://localhost:4000'
const NABI_PASSWORD = 'nabi2026'
const ALLOWED_EMAILS = ['vantuyl45@gmail.com']

interface Approval {
  id: string
  run_id: string
  tool_name: string
  action_description: string
  tool_args: Record<string, unknown>
  risk_level: string
  risk_reason: string
  status: string
  created_at: string
}

const RISK_COLORS: Record<string, string> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
}

const ApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [deciding, setDeciding] = useState<string | null>(null)

  const emsUser = authStorage.getUser()
  const hasAccess = ALLOWED_EMAILS.includes((emsUser?.email || '').toLowerCase())

  // Login to Nabi
  useEffect(() => {
    if (!hasAccess) return
    fetch(`${NABI_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'william@nabi.dev', password: NABI_PASSWORD }),
    })
      .then(r => r.json())
      .then(d => { if (d.token) setToken(d.token) })
      .catch(() => {})
  }, [hasAccess])

  // Fetch approvals
  const fetchApprovals = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const resp = await fetch(`${NABI_API}/api/v1/approvals`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await resp.json()
      setApprovals(Array.isArray(data) ? data : [])
    } catch {
      setApprovals([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  // Auto-refresh every 10s
  useEffect(() => {
    if (!token) return
    const interval = setInterval(fetchApprovals, 10000)
    return () => clearInterval(interval)
  }, [token, fetchApprovals])

  const handleDecision = async (approvalId: string, decision: 'approved' | 'rejected') => {
    if (!token) return
    setDeciding(approvalId)
    try {
      await fetch(`${NABI_API}/api/v1/approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision }),
      })
      await fetchApprovals()
    } catch {
      // silently fail
    } finally {
      setDeciding(null)
    }
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-5">
        <h4>Access Restricted</h4>
        <p className="text-body-secondary">Nabi Approvals is currently in beta.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHero
        kicker="AI Assistant"
        title="Approvals"
        icon={cilShieldAlt}
        subtitle="Review and decide on pending tool actions"
        highlights={[
          { label: 'Pending', value: approvals.filter(a => a.status === 'pending').length, color: 'warning' },
        ]}
      />

      <CRow>
        <CCol xs={12}>
          <CCard className="shadow-sm border-0">
            <CCardBody>
              {loading ? (
                <div className="text-center py-4"><CSpinner /></div>
              ) : approvals.length === 0 ? (
                <div className="text-center py-4 text-body-secondary">
                  <p>No pending approvals</p>
                </div>
              ) : (
                <CTable hover striped responsive className="align-middle">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Tool</CTableHeaderCell>
                      <CTableHeaderCell>Action</CTableHeaderCell>
                      <CTableHeaderCell>Risk</CTableHeaderCell>
                      <CTableHeaderCell>Created</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Actions</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {approvals.map((a) => (
                      <CTableRow key={a.id}>
                        <CTableDataCell>
                          <code>{a.tool_name}</code>
                        </CTableDataCell>
                        <CTableDataCell>{a.action_description}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={RISK_COLORS[a.risk_level] || 'secondary'}>
                            {a.risk_level}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          {new Date(a.created_at).toLocaleString()}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={a.status === 'pending' ? 'warning' : a.status === 'approved' ? 'success' : 'danger'}>
                            {a.status}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          {a.status === 'pending' && (
                            <div className="d-flex gap-1">
                              <CButton
                                color="success"
                                variant="ghost"
                                size="sm"
                                disabled={deciding === a.id}
                                onClick={() => handleDecision(a.id, 'approved')}
                              >
                                {deciding === a.id ? <CSpinner size="sm" /> : <CIcon icon={cilCheckAlt} />}
                              </CButton>
                              <CButton
                                color="danger"
                                variant="ghost"
                                size="sm"
                                disabled={deciding === a.id}
                                onClick={() => handleDecision(a.id, 'rejected')}
                              >
                                <CIcon icon={cilX} />
                              </CButton>
                            </div>
                          )}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default ApprovalsPage
