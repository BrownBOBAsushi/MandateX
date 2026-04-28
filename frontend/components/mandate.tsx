'use client'

import { useState } from 'react'
import type { Mandate } from '@/app/page'

type Props = {
  mandate: Mandate
  loadingStatus: 'idle' | 'loading' | 'success' | 'error'
  onCreateMandate: (data: {
    mandateId: string
    ownerWallet: string
    agentPubkey: string
    allowedVendors: string[]
    perCallLimit: number
    dailyLimit: number
  }) => void
  onRevoke: () => void
}

export default function MandateCard({ mandate, loadingStatus, onCreateMandate, onRevoke }: Props) {
  const [agentPubkey, setAgentPubkey] = useState(mandate.agentPubkey ?? 'ResearchAgent_01')
  const [vendor, setVendor] = useState(mandate.allowedVendors[0] ?? 'OpenWeather')
  const [perCallLimit, setPerCallLimit] = useState(mandate.perCallLimit ?? 2.0)
  const [dailyLimit, setDailyLimit] = useState(mandate.dailyLimit ?? 5.0)

  const isActive = mandate.status === 'active'
  const isRevoked = mandate.status === 'revoked'
  const isLoading = loadingStatus === 'loading'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onCreateMandate({
      mandateId: mandate.mandateId ?? 'mandate_001',
      ownerWallet: mandate.ownerWallet ?? 'FounderWallet',
      agentPubkey,
      allowedVendors: [vendor],
      perCallLimit,
      dailyLimit,
    })
  }

  return (
    <div className="space-y-4">
      {/* Plain-English summary — shown first, always */}
      <div className="bg-[#1A1A1A] border border-[#9945FF]/25 rounded-lg p-4">
        <p className="text-sm leading-relaxed text-white/80">
          <span className="text-[#9945FF] font-semibold">{agentPubkey}</span>
          {' '}can only pay{' '}
          <span className="text-[#14F195] font-semibold">{vendor}</span>
          {' '}up to{' '}
          <span className="font-semibold text-white">{perCallLimit} USDC</span>
          {' '}per call.
        </p>
      </div>

      {/* Form fields */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-white/35 uppercase tracking-wider mb-1.5">
            Agent
          </label>
          <input
            type="text"
            value={agentPubkey}
            onChange={e => setAgentPubkey(e.target.value)}
            disabled={isActive}
            className="w-full bg-[#111111] border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#9945FF]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-white/35 uppercase tracking-wider mb-1.5">
            Allowed Vendor
          </label>
          <input
            type="text"
            value={vendor}
            onChange={e => setVendor(e.target.value)}
            disabled={isActive}
            className="w-full bg-[#111111] border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#9945FF]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/35 uppercase tracking-wider mb-1.5">
              Per-call Max
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                value={perCallLimit}
                onChange={e => setPerCallLimit(parseFloat(e.target.value) || 0)}
                disabled={isActive}
                className="w-full bg-[#111111] border border-white/10 rounded-md px-3 py-2 pr-14 text-sm text-white focus:outline-none focus:border-[#9945FF]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/25">USDC</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-white/35 uppercase tracking-wider mb-1.5">
              Daily Limit
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={dailyLimit}
                onChange={e => setDailyLimit(parseFloat(e.target.value) || 0)}
                disabled={isActive}
                className="w-full bg-[#111111] border border-white/10 rounded-md px-3 py-2 pr-14 text-sm text-white focus:outline-none focus:border-[#9945FF]/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/25">USDC</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || isActive}
          className="w-full bg-[#9945FF] hover:bg-[#9945FF]/85 active:bg-[#9945FF]/70 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 rounded-md transition-colors"
        >
          {isLoading ? 'Writing to Solana…' : isActive ? 'Mandate Active' : 'Create Mandate'}
        </button>
      </form>

      {/* Success state — onchain address as small proof, not the hero */}
      {(isActive || isRevoked) && mandate.onchainAddress && (
        <div className={`border rounded-lg p-3 space-y-1.5 ${isRevoked ? 'border-[#FF4444]/20 bg-[#FF4444]/5' : 'border-[#14F195]/20 bg-[#14F195]/5'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${isRevoked ? 'text-[#FF4444]' : 'text-[#14F195]'}`}>
            {isRevoked ? '✕ Mandate Revoked' : '✓ Written to Solana'}
          </p>
          <p className="text-[10px] text-white/25 font-[family-name:var(--font-dm-mono)] break-all leading-relaxed">
            {mandate.onchainAddress}
          </p>
        </div>
      )}

      {/* Revoke button — visible when active */}
      {isActive && (
        <button
          onClick={onRevoke}
          className="w-full border border-[#FF4444]/30 hover:bg-[#FF4444]/8 text-[#FF4444]/70 hover:text-[#FF4444] text-xs py-2 rounded-md transition-colors"
        >
          Revoke Mandate
        </button>
      )}

      {loadingStatus === 'error' && (
        <p className="text-xs text-[#FF4444]">Failed to create mandate. Check backend logs.</p>
      )}
    </div>
  )
}
