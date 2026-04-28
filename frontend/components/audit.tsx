'use client'

import type { DataSource, PaymentAttempt, Mandate } from '@/app/page'

type Props = {
  dataSource: DataSource
  latestPayment: PaymentAttempt | null
  mandate: Mandate
}

export default function AuditPanel({ dataSource, latestPayment, mandate }: Props) {
  if (!latestPayment) return null

  const mandateSource = dataSource === 'mock' ? 'Demo fallback' : 'Solana account'

  const x402Label =
    latestPayment.x402Status === 'executed'
      ? 'Executed'
      : latestPayment.x402Status === 'mocked'
        ? 'Mocked'
        : 'Not executed'

  return (
    <div className="border border-white/8 rounded-lg p-4 mt-4 space-y-2.5">
      <p className="text-[10px] text-white/25 uppercase tracking-wider">Proof</p>

      <Row label="Mandate source" value={mandateSource} />
      <Row
        label="Decision"
        value={latestPayment.status === 'blocked' ? 'Blocked' : 'Approved'}
        highlight={latestPayment.status === 'blocked' ? 'red' : 'green'}
      />
      {latestPayment.reason ? (
        <Row label="Reason" value={latestPayment.reason} />
      ) : null}
      <Row label="x402 payment" value={x402Label} />
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: 'red' | 'green'
}) {
  const valueClass =
    highlight === 'red'
      ? 'text-[#FF4444]'
      : highlight === 'green'
        ? 'text-[#14F195]'
        : 'text-white/55'

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-white/30 shrink-0">{label}</span>
      <span className={`text-xs ${valueClass} text-right`}>{value}</span>
    </div>
  )
}
