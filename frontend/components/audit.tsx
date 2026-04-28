'use client'

import type { DataSource, PaymentAttempt, Mandate } from '@/app/page'

type Props = {
  dataSource: DataSource
  latestPayment: PaymentAttempt | null
  mandate: Mandate
  payments: PaymentAttempt[]
}

export default function AuditPanel({ dataSource, latestPayment, mandate, payments }: Props) {
  if (!latestPayment) return null

  const mandateSource = dataSource === 'mock' ? 'Demo fallback' : 'Solana account'

  const shortHash = (hash: string | null) =>
    hash && hash.length > 12 ? `${hash.slice(0, 8)}…${hash.slice(-4)}` : (hash ?? '')

  return (
    <div className="space-y-3 mt-4">
      {/* Proof panel */}
      <div className="border border-white/8 rounded-lg p-4 space-y-2.5">
        <p className="text-[10px] text-white/25 uppercase tracking-wider">Proof</p>
        <Row label="Mandate source" value={mandateSource} />
        <Row
          label="Decision"
          value={latestPayment.status === 'blocked' ? 'Blocked' : 'Approved'}
          highlight={latestPayment.status === 'blocked' ? 'red' : 'green'}
        />
        {latestPayment.reason ? <Row label="Reason" value={latestPayment.reason} /> : null}

        {/* x402 row — link when executed, label otherwise */}
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-white/30 shrink-0">x402 payment</span>
          {latestPayment.x402Status === 'executed' && latestPayment.txHash ? (
            <a
              href={`https://explorer.solana.com/tx/${latestPayment.txHash}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#14F195] hover:text-[#14F195]/70 text-right font-[family-name:var(--font-dm-mono)] underline underline-offset-2"
            >
              {shortHash(latestPayment.txHash)}
            </a>
          ) : latestPayment.x402Status === 'mocked' ? (
            <span className="text-xs text-white/35 text-right">
              Mocked (facilitator unreachable)
            </span>
          ) : (
            <span className="text-xs text-white/55 text-right">Not executed</span>
          )}
        </div>
      </div>

      {/* Compact event log — Stretch 3 */}
      {payments.length > 1 && (
        <div className="border border-white/8 rounded-lg overflow-hidden">
          <p className="text-[10px] text-white/25 uppercase tracking-wider px-3 pt-3 pb-2">
            History
          </p>
          <div className="divide-y divide-white/5 max-h-36 overflow-y-auto">
            {payments.slice(0, 8).map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                <span
                  className={`text-[10px] font-semibold w-12 shrink-0 ${
                    p.status === 'approved' ? 'text-[#14F195]' : 'text-[#FF4444]'
                  }`}
                >
                  {p.status === 'approved' ? 'OK' : 'BLOCK'}
                </span>
                <span className="text-[10px] text-white/40 shrink-0 font-[family-name:var(--font-dm-mono)]">
                  {p.vendor}
                </span>
                <span className="text-[10px] text-white/25 shrink-0">
                  {p.amount} USDC
                </span>
                {p.reason && (
                  <span className="text-[10px] text-white/20 truncate">{p.reason}</span>
                )}
                <span className="text-[10px] text-white/15 ml-auto shrink-0 font-[family-name:var(--font-dm-mono)]">
                  {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
