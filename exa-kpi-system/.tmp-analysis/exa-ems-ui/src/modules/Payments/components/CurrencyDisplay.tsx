import React from 'react'

interface CurrencyDisplayProps {
  value: number | null | undefined
  currency?: 'USD' | 'LPS'
  className?: string
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ value, currency = 'USD', className }) => {
  if (value === null || value === undefined) return <span className={className}>-</span>

  const prefix = currency === 'USD' ? '$' : 'L'
  const formatted = value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return <span className={className}>{prefix} {formatted}</span>
}

export default React.memo(CurrencyDisplay)
