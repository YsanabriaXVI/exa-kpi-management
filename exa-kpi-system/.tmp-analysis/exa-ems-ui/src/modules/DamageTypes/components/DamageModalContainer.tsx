// src/modules/DamageTypes/components/DamageModalContainer.tsx
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../../../store'

import DamageModal from './DamageModal'
import {
  addDamage,
  saveDamage,
  loadDefaultDamage,
  loadDamageFromList,
  selectDamageTypesCurrent,
  selectDamageTypesErrors,
  selectEquipmentTypesList,
  loadEquipmentTypes
} from '../store/damageTypes.slice'

type Props = {
  isOpen: boolean
  data?: { damageId?: number }
  toggleModal: (open: boolean) => void
}

const DamageModalContainer: React.FC<Props> = ({ isOpen, data, toggleModal }) => {
  const dispatch = useDispatch<AppDispatch>()

  const damage = useSelector(selectDamageTypesCurrent)
  const errors = useSelector(selectDamageTypesErrors)
  const equipmentTypesList = useSelector(selectEquipmentTypesList)

  // cada vez que abra el modal, traemos equipment types y cargamos el form
  useEffect(() => {
    if (!isOpen) return

    console.log('DamageModalContainer: loading data for modal')

    dispatch(loadEquipmentTypes())

    const id = data?.damageId
    if (typeof id === 'number' && isFinite(id)) {
      dispatch(loadDamageFromList(id))
    } else {
      dispatch(loadDefaultDamage(undefined))
    }
  }, [isOpen, data?.damageId, dispatch])

  const handleSave = async (formData: any) => {
    if (formData?.damageId) {
      await dispatch(saveDamage(formData))
    } else {
      await dispatch(addDamage(formData))
    }
  }

  return (
    <DamageModal
      isOpen={isOpen}
      data={data}
      damage={(damage ?? {}) as any}
      errors={(errors as any) || false}
      equipmentTypesList={equipmentTypesList as any}
      loadDamage={(payload) => {
        const id = payload?.damageId
        if (typeof id === 'number' && isFinite(id)) {
          dispatch(loadDamageFromList(id))
        } else {
          dispatch(loadDefaultDamage(payload as any))
        }
      }}
      saveDamage={handleSave}
      toggleModal={toggleModal}
    />
  )
}

export default DamageModalContainer
