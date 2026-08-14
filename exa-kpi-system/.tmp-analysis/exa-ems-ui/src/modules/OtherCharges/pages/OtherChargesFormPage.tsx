/**
 * Other Charges Form Page
 * Page for creating and editing other charges
 */

import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { CContainer, CRow, CCol } from '@coreui/react-pro'
import ChargeForm from '../components/ChargeForm'
import type { RootState, AppDispatch } from '../../../store'
import {
  loadCharge,
  loadRoutes,
  loadPaymentPlans,
  createCharge,
  updateCharge,
  clearCurrentCharge,
} from '../store/otherChargesSlice'
import './OtherChargesForm.scss'

const OtherChargesFormPage: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)

  const { currentCharge, routes, paymentPlans, loading, error } = useSelector(
    (state: RootState) => state.otherCharges
  )

  useEffect(() => {
    // Load routes on mount
    dispatch(loadRoutes())

    // Load charge if editing
    if (isEdit && id) {
      dispatch(loadCharge(parseInt(id)))
    }

    // Cleanup
    return () => {
      dispatch(clearCurrentCharge())
    }
  }, [id, isEdit, dispatch])

  const handleRoutesChange = (params: { routes: number[]; applyTo: string }) => {
    dispatch(loadPaymentPlans(params))
  }

  const handleSubmit = async (formData: any) => {
    try {
      let result: any
      if (isEdit && id) {
        result = await dispatch(updateCharge({ id: parseInt(id), chargeData: formData }))
      } else {
        result = await dispatch(createCharge(formData))
      }

      if (result.meta.requestStatus === 'fulfilled') {
        // Show success message (you can add a toast notification library later)
        alert(`Charge ${isEdit ? 'updated' : 'created'} successfully!`)
        navigate('/modules/other-charges')
      } else {
        throw new Error(result.payload || 'Failed to save charge')
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'An error occurred while saving the charge.'}`)
    }
  }

  const handleCancel = () => {
    navigate('/modules/other-charges')
  }

  return (
    <div className="other-charges-form-page">
      <ChargeForm
        initialValues={isEdit ? currentCharge : null}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        routes={routes}
        paymentPlans={paymentPlans}
        onRoutesChange={handleRoutesChange}
        loading={loading}
        error={error}
      />
    </div>
  )
}

export default OtherChargesFormPage

