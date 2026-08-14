/**
 * Payment Plan Cards Component
 * Displays payment plan cards with pricing inputs
 */

import React from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CFormLabel,
  CFormInput,
  CRow,
  CCol,
} from '@coreui/react-pro'

interface PlanPrice {
  unitsIncluded: string | number
  price: string | number
  rate?: string | number
}

interface PaymentPlan {
  id: number
  name: string
  [key: string]: any
}

interface PaymentPlanCardsProps {
  plans: PaymentPlan[]
  planPrices: Record<number, PlanPrice>
  onPriceChange: (planId: number, field: string, value: string) => void
}

const PaymentPlanCards: React.FC<PaymentPlanCardsProps> = ({
  plans,
  planPrices,
  onPriceChange,
}) => {
  return (
    <div className="mt-4">
      <h5 className="mb-3">Payment Plans</h5>
      <CRow>
        {plans.map((plan) => {
          const planData = planPrices[plan.id] || { unitsIncluded: '', price: '' }

          return (
            <CCol md={6} lg={4} key={plan.id} className="mb-3">
              <CCard className="h-100">
                <CCardHeader className="bg-light">
                  <strong>{plan.name}</strong>
                </CCardHeader>
                <CCardBody>
                  <div className="mb-3">
                    <CFormLabel htmlFor={`units-${plan.id}`}>Units Included</CFormLabel>
                    <CFormInput
                      type="number"
                      id={`units-${plan.id}`}
                      placeholder="0"
                      value={planData.unitsIncluded}
                      onChange={(e) => onPriceChange(plan.id, 'unitsIncluded', e.target.value)}
                      min="0"
                    />
                  </div>
                  <div>
                    <CFormLabel htmlFor={`price-${plan.id}`}>Price (USD)</CFormLabel>
                    <CFormInput
                      type="number"
                      id={`price-${plan.id}`}
                      placeholder="0.00"
                      value={planData.price}
                      onChange={(e) => onPriceChange(plan.id, 'price', e.target.value)}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </CCardBody>
              </CCard>
            </CCol>
          )
        })}
      </CRow>
    </div>
  )
}

export default PaymentPlanCards

