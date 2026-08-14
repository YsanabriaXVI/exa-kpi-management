import React from 'react'
import { CButton, CFormInput, CInputGroup } from '@coreui/react-pro'
import '../styles/equipment-layout.css'

type Props = {
  value: [number, number, number]
  isTripRequest: boolean
  onIncrement: (index: number) => void
  onDecrement: (index: number) => void
  onChange: (index: number, value: string) => void
  isView?: boolean
  isEdit: boolean
}

export function Counter({ value, isTripRequest, onIncrement, onDecrement, onChange, isView, isEdit }: Props) {
  return (
    <table className="eq-counter-table table table">
      <colgroup>
        <col className="col-row" />
        { isEdit && <col className="col-id" />}
        { isEdit && <col className="col-id" />}
        {isTripRequest && <col className="col-id" />}
        <col className="col-main" />
        <col className="col-main" />
        <col className="col-main" />
        <col className="col-actions" />
      </colgroup>

      <tbody>
        <tr>
          {/* Row# spacer */}
          <td />
          { isEdit && <td /> }
          { isEdit && <td /> }
          {/* Trip spacer */}
          {isTripRequest && <td />}

          {/* Containers */}
          <td>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Containers</div>
            <CInputGroup>
              <CButton type="button" color={isView? "secondary": "primary"} variant="outline" onClick={() => onDecrement(0)} disabled={isView || isTripRequest}>
                -
              </CButton>
              <CFormInput value={String(value[0])} onChange={(e) => onChange(0, e.target.value)} disabled={isView || isTripRequest}/>
              <CButton type="button" color={isView? "secondary": "primary"} variant="outline" onClick={() => onIncrement(0)} disabled={isView || isTripRequest}>
                +
              </CButton>
            </CInputGroup>
          </td>

          {/* Chassis */}
          <td>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Chassis</div>
            <CInputGroup>
              <CButton type="button" color={isView? "secondary": "primary"} variant="outline" onClick={() => onDecrement(1)} disabled={isView || isTripRequest}>
                -
              </CButton>
              <CFormInput value={String(value[1])} onChange={(e) => onChange(1, e.target.value)} disabled={isView || isTripRequest}/>
              <CButton type="button" color={isView? "secondary": "primary"} variant="outline" onClick={() => onIncrement(1)} disabled={isView || isTripRequest}>
                +
              </CButton>
            </CInputGroup>
          </td>

          {/* Gensets */}
          <td>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Gensets</div>
            <CInputGroup>
              <CButton type="button" color={isView? "secondary": "primary"} variant="outline" onClick={() => onDecrement(2)} disabled={isView || isTripRequest}>
                -
              </CButton>
              <CFormInput value={String(value[2])} onChange={(e) => onChange(2, e.target.value)} disabled={isView || isTripRequest}/>
              <CButton type="button" color={isView? "secondary": "primary"} variant="outline" onClick={() => onIncrement(2)} disabled={isView || isTripRequest}>
                +
              </CButton>
            </CInputGroup>
          </td>

          {/* Actions spacer */}
          <td />
        </tr>
      </tbody>
    </table>
  )
}
