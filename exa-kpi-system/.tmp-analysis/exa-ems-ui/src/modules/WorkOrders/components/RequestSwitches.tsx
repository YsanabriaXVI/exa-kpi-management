import React from 'react'
import { CFormSwitch, CCard, CCardBody } from '@coreui/react-pro'

type Props = {
  value: [boolean, boolean, boolean]
  onChange: (index: number, checked: boolean) => void
  isTripRequest: boolean
  isView?: boolean
}

export function Switches({ value, onChange, isTripRequest, isView }: Props) {
  return (
    <CCard>
      <CCardBody>
        <CFormSwitch
          label="Client owns Container(s)"
          checked={value[0]}
          onChange={(e) => onChange(0, e.target.checked)}
          size='lg'
          disabled={isView}
        />
        <CFormSwitch
          label="Client owns Chassis"
          checked={value[1]}
          onChange={(e) => onChange(1, e.target.checked)}
          size='lg'
          disabled={isView}
        />

        <CFormSwitch
          label="Client owns Genset(s)"
          checked={value[2]}
          onChange={(e) => onChange(2, e.target.checked)}
          size='lg'
          disabled={isView}
        />
      </CCardBody>
    </CCard>
  )
}
