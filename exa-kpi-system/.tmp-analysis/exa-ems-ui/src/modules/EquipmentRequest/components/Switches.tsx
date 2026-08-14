import React from 'react'
import { CFormSwitch } from '@coreui/react-pro'

type Props = {
  value: [boolean, boolean, boolean]
  onChange: (index: number, checked: boolean) => void
  isTripRequest: boolean
  isView?: boolean
  isEdit: boolean
}

export function Switches({ value, onChange, isTripRequest, isView, isEdit }: Props) {
  return (
    <table className="eq-grid-table eq-switches-table">
      <colgroup>
        <col className="col-row" />
        { isEdit && <col className="col-id" /> }
        { isEdit && <col className="col-id" /> }
        {isTripRequest && <col className="col-id" />}
        <col className="col-main" />
        <col className="col-main" />
        <col className="col-main" />
        <col className="col-actions" />
      </colgroup>

      <tbody>
        <tr>
          <td className="eq-spacer" />
          { isEdit && <td className="eq-spacer" /> }
          { isEdit && <td className="eq-spacer" /> }
          {isTripRequest && <td className="eq-spacer" />}

          <td className="eq-cell">
            <CFormSwitch
              label="Client owns Container"
              checked={value[0]}
              onChange={(e) => onChange(0, e.target.checked)}
              size='lg'
              disabled={isView}
            />
          </td>

          <td className="eq-cell">
            <CFormSwitch
              label="Client owns Chassis"
              checked={value[1]}
              onChange={(e) => onChange(1, e.target.checked)}
              size='lg'
              disabled={isView}
            />
          </td>

          <td className="eq-cell">
            <CFormSwitch
              label="Client owns Genset"
              checked={value[2]}
              onChange={(e) => onChange(2, e.target.checked)}
              size='lg'
              disabled={isView}
            />
          </td>

          <td className="eq-spacer" />
        </tr>
      </tbody>
    </table>
  )
}
