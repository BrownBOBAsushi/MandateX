'use client'

import type { Mandate, PaymentAttempt } from '@/app/page'

type Props = {
  mandate: Mandate
  paymentLoading: boolean
  onUnauthorizedAttempt: () => void
  onAuthorizedAttempt: () => void
}

export default function PaymentsPanel({
  mandate,
  paymentLoading,
  onUnauthorizedAttempt,
  onAuthorizedAttempt,
}: Props) {
  const agent = mandate.agentPubkey ?? 'ResearchAgent_01'
  const allowedVendor = mandate.allowedVendors[0] ?? 'OpenWeather'

  return (
    <div className="space-y-5">
      {/* What each button will attempt */}
      <div className="space-y-2">
        <div className="bg-[#1A1A1A] border border-[#FF4444]/20 rounded-lg p-3 space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Unauthorized attempt</p>
          <p className="text-sm font-[family-name:var(--font-dm-mono)] text-white/80">
            {agent}{' '}
            <span className="text-white/30">→</span>{' '}
            <span className="text-[#FF4444]">PremiumData</span>{' '}
            <span className="text-white/30">→</span>{' '}
            1 USDC
          </p>
        </div>

        <div className="bg-[#1A1A1A] border border-[#14F195]/15 rounded-lg p-3 space-y-1">
          <p className="text-[10px] text-white/30 uppercase tracking-wider">Authorized attempt</p>
          <p className="text-sm font-[family-name:var(--font-dm-mono)] text-white/80">
            {agent}{' '}
            <span className="text-white/30">→</span>{' '}
            <span className="text-[#14F195]">{allowedVendor}</span>{' '}
            <span className="text-white/30">→</span>{' '}
            1 USDC
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="space-y-2">
        {/* Primary — the demo hero */}
        <button
          onClick={onUnauthorizedAttempt}
          disabled={paymentLoading || mandate.status !== 'active'}
          className="w-full border border-[#FF4444]/50 hover:bg-[#FF4444]/10 active:bg-[#FF4444]/20 disabled:opacity-35 disabled:cursor-not-allowed text-[#FF4444] text-sm font-semibold py-3 rounded-md transition-colors"
        >
          {paymentLoading ? 'Processing…' : 'Trigger Unauthorized Vendor Attempt'}
        </button>

        {/* Secondary — proves the rail */}
        <button
          onClick={onAuthorizedAttempt}
          disabled={paymentLoading || mandate.status !== 'active'}
          className="w-full border border-white/10 hover:border-white/25 disabled:opacity-35 disabled:cursor-not-allowed text-white/50 hover:text-white/70 text-sm py-2.5 rounded-md transition-colors"
        >
          Run Authorized Payment Test
        </button>
      </div>

      {mandate.status !== 'active' && (
        <p className="text-xs text-white/25 text-center">Create a mandate first</p>
      )}
    </div>
  )
}
