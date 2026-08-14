import React, { useEffect, useMemo, useState } from 'react'
import { CCard, CCardBody, CContainer } from '@coreui/react-pro'
import { cilSync } from '@coreui/icons'
import PageHero from '../../../components/PageHero'
import ConfirmDialog from '../../../components/ConfirmationModal'

import ResetHeaderForm from '../components/ResetHeaderForm'
import ResetCurrentInfo from '../components/ResetCurrentInfo'
import ResetTripsTable from '../components/ResetTripsTable'
import ResetActions from '../components/ResetActions'
import ResetLastInfo from '../components/ResetLastInfo'
import ResetResults from '../components/ResetResults'

const GALLONS_TO_LITERS = 3.78541

export default function ResetEditPage() {
  const [data, setData] = useState<any>(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    setData({
      plate: '',
      equipmentType: '',
      dateFrom: '2026-04-01',
      dateTo: '2026-04-10',
      lastInfo: { kmsEcm: 10000, gallonsEcm: 500 },
      currentInfo: {
        kmsEcm: '',
        gallonsEcm: '',
        gallonsInTank: '',
        litersInTank: '',
      },
      trips: [],
    })
  }, [])

  const updateCurrent = (field: string, value: string) => {
    let updated = { ...data.currentInfo, [field]: value }

    if (field === 'gallonsInTank') {
      const g = parseFloat(value)
      updated.litersInTank = isNaN(g) ? '' : (g * GALLONS_TO_LITERS).toFixed(2)
    }

    if (field === 'litersInTank') {
      const l = parseFloat(value)
      updated.gallonsInTank = isNaN(l) ? '' : (l / GALLONS_TO_LITERS).toFixed(2)
    }

    setData({ ...data, currentInfo: updated })
  }

  const toggleTrip = (id: number) => {
    setData({
      ...data,
      trips: data.trips.map((t: any) => (t.id === id ? { ...t, selected: !t.selected } : t)),
    })
  }

  const deleteSelected = () => {
    setData({
      ...data,
      trips: data.trips.filter((t: any) => !t.selected),
    })
  }

  const isValid = useMemo(() => {
    const c = data?.currentInfo
    if (!c?.kmsEcm || !c?.gallonsEcm) return false
    return true
  }, [data])

  if (!data) return null

  return (
    <CContainer fluid>
      <PageHero title="Create a Reset" icon={cilSync} kicker="OPERATIONS"/>
      <CCard className="mb-4 shadow-sm">
        <ResetHeaderForm setData={setData} />

        <CCardBody>
          <ResetLastInfo lastReset={data.lastInfo} />
        </CCardBody>

        <CCardBody>
          <ResetCurrentInfo data={data} updateCurrent={updateCurrent} isValid={isValid} />
        </CCardBody>

        <CCardBody>
          <ResetTripsTable
            trips={data.trips}
            toggleTrip={toggleTrip}
            deleteSelected={deleteSelected}
          />
        </CCardBody>

        <CCardBody>
          <ResetResults lastReset={data.lastInfo} />
        </CCardBody>

        <ResetActions isValid={isValid} onSave={() => setConfirm(true)} />

        <ConfirmDialog
          visible={confirm}
          title="Save Reset"
          message="Confirm save?"
          onClose={() => setConfirm(false)}
          onConfirm={() => {
            console.log(data)
            setConfirm(false)
          }}
        />
      </CCard>
    </CContainer>
  )
}
