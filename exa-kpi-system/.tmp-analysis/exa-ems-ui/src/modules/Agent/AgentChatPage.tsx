/**
 * Agent Chat Page — Embedded Nabi AI Assistant
 *
 * Self-contained chat interface that communicates with the Nabi platform
 * via the demo proxy running locally or via the Cloud Run deployment.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  CCard,
  CCardBody,
  CCol,
  CRow,
  CButton,
  CFormInput,
  CSpinner,
  CBadge,
} from '@coreui/react-pro'
import CIcon from '@coreui/icons-react'
import { cilSend, cilChatBubble, cilReload } from '@coreui/icons'
import PageHero from '../../components/PageHero'
import { authStorage } from '../../services/auth/auth.storage'

const NABI_API = import.meta.env.VITE_NABI_API_URL || 'http://localhost:4000'
const NABI_EMAIL = 'william@nabi.dev'
const NABI_PASSWORD = 'nabi2026'

// Only these EMS users can access Nabi
const ALLOWED_EMAILS = ['vantuyl45@gmail.com']

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  meta?: {
    iterations?: number
    tokens?: string
    cost?: string
    status?: string
  }
  timestamp: Date
}

const AgentChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [status, setStatus] = useState('Connecting...')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Access check — only allowed emails can use Nabi
  const emsUser = authStorage.getUser()
  const userEmail = emsUser?.email || ''
  const hasAccess = ALLOWED_EMAILS.includes(userEmail.toLowerCase())

  if (!hasAccess) {
    return (
      <div className="text-center py-5">
        <h4>Access Restricted</h4>
        <p className="text-body-secondary">Nabi AI Assistant is currently in beta. Contact your administrator for access.</p>
      </div>
    )
  }

  // Auto-login on mount
  useEffect(() => {
    login()
  }, [])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const login = async () => {
    try {
      const resp = await fetch(`${NABI_API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: NABI_EMAIL, password: NABI_PASSWORD }),
      })
      const data = await resp.json()
      if (data.token) {
        setToken(data.token)
        // Create session
        const sessResp = await fetch(`${NABI_API}/api/v1/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.token}` },
          body: JSON.stringify({ agentId: 'ems-fuel-assistant' }),
        })
        const sess = await sessResp.json()
        setSessionId(sess.id)
        setStatus('Ready')
      }
    } catch (err) {
      setStatus('Offline — start demo: cd nabi/apps/demo && PORT=4000 node server.js')
    }
  }

  const api = useCallback(async (method: string, path: string, body?: unknown) => {
    const resp = await fetch(`${NABI_API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return resp.json()
  }, [token])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !token || !sessionId || loading) return

    setInput('')
    setLoading(true)

    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: text, timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMsg])
    setStatus('Thinking...')

    try {
      const msgResp = await api('POST', `/api/v1/chat/sessions/${sessionId}/messages`, { content: text })

      if (msgResp.runId) {
        // Poll for completion
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 3000))
          const run = await api('GET', `/api/v1/runs/${msgResp.runId}`)
          setStatus(`Processing (${run.status || '...'})`)

          if (run.status === 'completed') {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: run.summary || 'Done.',
              meta: {
                iterations: run.total_iterations,
                tokens: `${run.input_tokens_total}/${run.output_tokens_total}`,
                cost: `$${parseFloat(run.estimated_cost_usd || 0).toFixed(4)}`,
              },
              timestamp: new Date(),
            }])
            setStatus('Ready')
            break
          } else if (run.status === 'failed' || run.status === 'circuit_open') {
            setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Error: ${run.fail_reason || run.status}`,
              timestamp: new Date(),
            }])
            setStatus('Ready')
            break
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'system',
        content: `Error: ${err.message}`,
        timestamp: new Date(),
      }])
      setStatus('Ready')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="agent-chat-page">
      <PageHero
        kicker="AI Assistant"
        title="Nabi"
        icon={cilChatBubble}
        subtitle="Ask about fuel orders, payments, trips, and reports"
        highlights={[
          { label: 'Status', value: status === 'Ready' ? 'Online' : status, color: status === 'Ready' ? 'success' : 'warning' },
        ]}
      />

      <CRow>
        <CCol xs={12}>
          <CCard className="shadow-sm border-0" style={{ height: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
            <CCardBody className="d-flex flex-column p-0" style={{ flex: 1, overflow: 'hidden' }}>
              {/* Messages */}
              <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
                {messages.length === 0 && (
                  <div className="text-center text-body-secondary py-5">
                    <CIcon icon={cilChatBubble} size="3xl" className="mb-3 opacity-25" />
                    <p className="fw-semibold">How can I help?</p>
                    <p className="small">Try: "Show me fuel orders from last week" or "Payment summary by type"</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`d-flex mb-3 ${msg.role === 'user' ? 'justify-content-end' : ''}`}>
                    <div style={{
                      maxWidth: '80%',
                      padding: '0.6rem 1rem',
                      borderRadius: '10px',
                      background: msg.role === 'user' ? 'var(--cui-primary)' : msg.role === 'system' ? 'var(--cui-danger-bg-subtle)' : 'var(--cui-tertiary-bg)',
                      color: msg.role === 'user' ? '#fff' : 'inherit',
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.9rem',
                    }}>
                      {msg.content}
                      {msg.meta && (
                        <div className="mt-1 d-flex gap-2" style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                          <span>{msg.meta.iterations} iter</span>
                          <span>{msg.meta.tokens} tok</span>
                          <span>{msg.meta.cost}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="d-flex mb-3">
                    <div style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'var(--cui-tertiary-bg)' }}>
                      <CSpinner size="sm" /> Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-top p-3 d-flex gap-2">
                <CFormInput
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ask Nabi anything..."
                  disabled={loading || !token}
                />
                <CButton
                  color="primary"
                  className="text-white"
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || !token}
                >
                  <CIcon icon={cilSend} />
                </CButton>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  )
}

export default AgentChatPage
