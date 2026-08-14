/**
 * Joined Data Form Component
 * Manages client and subdivision assignments for users
 */

import React, { useState, useEffect } from 'react'
import {
  CFormLabel,
  CMultiSelect,
} from '@coreui/react-pro'
import './JoinedDataForm.scss'

interface JoinedDataFormProps {
  user: any
  clients: any[]
  subdivisions: any[]
  errors: any
  onChange: (field: string, value: any) => void
}

const JoinedDataForm: React.FC<JoinedDataFormProps> = ({
  user,
  clients,
  subdivisions,
  errors,
  onChange,
}) => {
  const [clientOptions, setClientOptions] = useState<any[]>([])
  const [subdivisionOptions, setSubdivisionOptions] = useState<any[]>([])

  useEffect(() => {
    console.log('📋 JoinedDataForm - Initializing')
    console.log('📋 User data:', user)
    console.log('📋 User clients:', user?.clients)
    console.log('📋 User subdivisions:', user?.subdivisions)
    console.log('📋 Available clients:', clients)
    console.log('📋 Available subdivisions:', subdivisions)

    // Prepare client options with selected state
    if (clients && clients.length > 0) {
      const userClientIds = user?.clients || []
      const options = clients.map((client) => {
        const isSelected = userClientIds.includes(client.client_id)
        console.log(`Client ${client.client_id} (${client.name}): selected=${isSelected}`)
        return {
          value: client.client_id.toString(),
          label: client.name || `Client ${client.client_id}`,
          selected: isSelected,
        }
      })
      setClientOptions(options)
      console.log('✅ Client options prepared with selections:', options.filter(o => o.selected))
    }

    // Prepare subdivision options with selected state
    if (subdivisions && subdivisions.length > 0) {
      const userSubdivisionIds = user?.subdivisions || []
      const options = subdivisions.map((subdivision) => {
        const isSelected = userSubdivisionIds.includes(subdivision.subdivision_id)
        console.log(`Subdivision ${subdivision.subdivision_id} (${subdivision.name}): selected=${isSelected}`)
        return {
          value: subdivision.subdivision_id.toString(),
          label: `${subdivision.name || `Subdivision ${subdivision.subdivision_id}`}${subdivision.status === 0 ? ' (Inactive)' : ''}`,
          selected: isSelected,
          disabled: subdivision.status === 0,
        }
      })
      setSubdivisionOptions(options)
      console.log('✅ Subdivision options prepared with selections:', options.filter(o => o.selected))
    }
  }, [user?.clients, user?.subdivisions, clients, subdivisions])

  const handleClientsChange = (selected: any[]) => {
    console.log('🔄 Clients selection changed:', selected)
    
    // Extract IDs from selected items
    const clientIds = selected.map((item) => parseInt(item.value))
    
    // Get full client objects
    const clientsList = clientIds.map((id) => 
      clients.find((c) => c.client_id === id)
    ).filter(Boolean)

    // Update parent form
    onChange('clients', clientIds)
    onChange('clientsList', clientsList)
    
    console.log('✅ Updated clients:', clientIds)
    console.log('✅ Updated clientsList:', clientsList)
  }

  const handleSubdivisionsChange = (selected: any[]) => {
    console.log('🔄 Subdivisions selection changed:', selected)
    
    // Extract IDs from selected items
    const subdivisionIds = selected.map((item) => parseInt(item.value))
    
    // Get full subdivision objects
    const subdivisionsList = subdivisionIds.map((id) => 
      subdivisions.find((s) => s.subdivision_id === id)
    ).filter(Boolean)

    // Update parent form
    onChange('subdivisions', subdivisionIds)
    onChange('subdivisionsList', subdivisionsList)
    
    console.log('✅ Updated subdivisions:', subdivisionIds)
    console.log('✅ Updated subdivisionsList:', subdivisionsList)
  }

  return (
    <div>
      {/* Clients Section */}
      <div className="mb-4">
        <CFormLabel htmlFor="clients_multiselect">Clients</CFormLabel>
        <CMultiSelect
          id="clients_multiselect"
          className="multiselect-clients"
          options={clientOptions}
          onChange={handleClientsChange}
          placeholder="Select clients..."
          selectAll
          selectAllLabel="Select All Clients"
          search
          searchPlaceholder="Search clients..."
          virtualScroller
          selectionType="tags"
        />
        {errors?.clients && (
          <div className="invalid-feedback d-block">{errors.clients}</div>
        )}
      </div>

      {/* Subdivisions Section */}
      <div className="mb-3">
        <CFormLabel htmlFor="subdivisions_multiselect">Subdivisions</CFormLabel>
        <CMultiSelect
          id="subdivisions_multiselect"
          className="multiselect-subdivisions"
          options={subdivisionOptions}
          onChange={handleSubdivisionsChange}
          placeholder="Select subdivisions..."
          selectAll
          selectAllLabel="Select All Subdivisions"
          search
          searchPlaceholder="Search subdivisions..."
          virtualScroller
          selectionType="tags"
        />
        {errors?.subdivisions && (
          <div className="invalid-feedback d-block">{errors.subdivisions}</div>
        )}
      </div>
    </div>
  )
}

export default JoinedDataForm

