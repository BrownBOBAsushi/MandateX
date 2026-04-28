'use client'

import { useState } from 'react'
import MandateCard from '@/components/mandate'
import PaymentsPanel from '@/components/payments'
import AuditPanel from '@/components/audit'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type DataSource = 'live' | 'partial' | 'mock'
export type X402Status = 'executed' | 'not_executed' | 'mocked'

export type PaymentAttempt = {
  vendor: string
  amount: number
  status: 'approved' | 'blocked'
  reason: string
  timestamp: string
  x402Status: X402Status
}

export type Mandate = {
  mandateId: string | null
  ownerWallet: string | null
  agentPubkey: string | null
  allowedVendors: string[]
  perCallLimit: number | null
  dailyLimit: number | null
  spentToday: number
  status: 'inactive' | 'active' | 'revoked'
  onchainAddress: string | null
}

const SEED_MANDATE: Mandate = {
  mandateId: 'mandate_001',
  ownerWallet: 'FounderWallet',
  agentPubkey: 'ResearchAgent_01',
  allowedVendors: ['OpenWeather'],
  perCallLimit: 2.0,
  dailyLimit: 5.0,
  spentToday: 0,
  status: 'inactive',
  onchainAddress: null,
}

export default function Home() {
  const [dataSource, setDataSource] = useState<DataSource>('mock')
  const [mandate, setMandate] = useState<Mandate>(SEED_MANDATE)
  const [payments, setPayments] = useState<PaymentAttempt[]>([])
  const [loadingStatus, setLoadingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [paymentLoading, setPaymentLoading] = useState(false)

  async function handleCreateMandate(formData: {
    mandateId: string
    ownerWallet: string
    agentPubkey: string
    allowedVendors: string[]
    perCallLimit: number
    dailyLimit: number
  }) {
    setLoadingStatus('loading')
    try {
      const res = await fetch(`${API}/api/mandate/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandate_id: formData.mandateId,
          owner_wallet: formData.ownerWallet,
          agent_pubkey: formData.agentPubkey,
          allowed_vendors: formData.allowedVendors,
          per_call_limit: formData.perCallLimit,
          daily_limit: formData.dailyLimit,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setMandate(prev => ({
          ...prev,
          ...formData,
          status: 'active',
          onchainAddress: json.data.onchain_address,
        }))
        setDataSource(json.source)
        setLoadingStatus('success')
      } else {
        setLoadingStatus('error')
      }
    } catch {
      setLoadingStatus('error')
    }
  }

  async function handlePaymentAttempt(vendorId: string, amount: number) {
    if (!mandate.mandateId) return
    setPaymentLoading(true)
    try {
      const res = await fetch(`${API}/api/payment/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: mandate.agentPubkey,
          vendor_id: vendorId,
          amount,
          mandate_id: mandate.mandateId,
        }),
      })
      const json = await res.json()
      const attempt: PaymentAttempt = {
        vendor: vendorId,
        amount,
        status: json.data.approved ? 'approved' : 'blocked',
        reason: json.reason,
        timestamp: new Date().toISOString(),
        x402Status: json.data.x402_status,
      }
      setPayments(prev => [attempt, ...prev])
      setDataSource(json.source)
      if (json.data.approved) {
        setMandate(prev => ({ ...prev, spentToday: prev.spentToday + amount }))
      }
    } catch {
      // backend unreachable — swallow, badge stays red
    } finally {
      setPaymentLoading(false)
    }
  }

  async function handleReset() {
    await fetch(`${API}/api/reset`, { method: 'POST' }).catch(() => {})
    setMandate(SEED_MANDATE)
    setPayments([])
    setDataSource('mock')
    setLoadingStatus('idle')
  }

  const latestPayment = payments[0] ?? null

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight font-[family-name:var(--font-syne)]">
          MandateX
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="text-xs text-white/30 hover:text-white/60 border border-white/10 hover:border-white/25 px-3 py-1.5 rounded transition-colors"
          >
            Reset Demo
          </button>
          <div className="flex items-center gap-1.5 border border-white/10 px-3 py-1.5 rounded">
            <span>
              {dataSource === 'live' ? '🟢' : dataSource === 'partial' ? '🟡' : '🔴'}
            </span>
            <span className="text-xs text-white/50">{dataSource}</span>
          </div>
        </div>
      </header>

      {/* 3-panel story */}
      <div className="grid grid-cols-3 divide-x divide-white/10 min-h-[calc(100vh-57px)]">

        {/* Panel 1 — Spending Rule */}
        <section>
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-0.5">1</p>
            <h2 className="text-sm font-semibold text-white/70">Spending Rule</h2>
          </div>
          <div className="p-6">
            <MandateCard
              mandate={mandate}
              loadingStatus={loadingStatus}
              onCreateMandate={handleCreateMandate}
            />
          </div>
        </section>

        {/* Panel 2 — Agent Attempt */}
        <section>
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-0.5">2</p>
            <h2 className="text-sm font-semibold text-white/70">Agent Attempt</h2>
          </div>
          <div className="p-6">
            <PaymentsPanel
              mandate={mandate}
              paymentLoading={paymentLoading}
              onUnauthorizedAttempt={() => handlePaymentAttempt('PremiumData', 1.0)}
              onAuthorizedAttempt={() => handlePaymentAttempt('OpenWeather', 1.0)}
            />
          </div>
        </section>

        {/* Panel 3 — Decision */}
        <section>
          <div className="px-6 py-4 border-b border-white/10">
            <p className="text-xs text-white/30 uppercase tracking-widest mb-0.5">3</p>
            <h2 className="text-sm font-semibold text-white/70">Decision</h2>
          </div>
          <div className="p-6">
            {!latestPayment ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-xs text-white/15">Waiting for agent attempt…</p>
              </div>
            ) : latestPayment.status === 'blocked' ? (
              <>
                <div className="bg-[#FF4444]/8 border border-[#FF4444]/30 rounded-xl p-6 space-y-4">
                  <p className="text-2xl font-bold text-[#FF4444] font-[family-name:var(--font-syne)] leading-tight">
                    BLOCKED BEFORE<br />PAYMENT CLEARED
                  </p>
                  <p className="text-sm text-white/70">
                    Blocked: {latestPayment.reason}
                  </p>
                  <div className="space-y-1 border-t border-white/8 pt-3">
                    <p className="text-xs text-white/40 font-[family-name:var(--font-dm-mono)]">
                      {mandate.agentPubkey} → {latestPayment.vendor} → {latestPayment.amount} USDC
                    </p>
                    <p className="text-xs text-white/40 font-[family-name:var(--font-dm-mono)]">
                      Allowed: {mandate.agentPubkey} → {mandate.allowedVendors[0]} only
                    </p>
                  </div>
                  <p className="text-xs text-white/35">x402 payment: Not executed</p>
                </div>
                <AuditPanel dataSource={dataSource} latestPayment={latestPayment} mandate={mandate} />
              </>
            ) : (
              <>
                <div className="bg-[#14F195]/8 border border-[#14F195]/30 rounded-xl p-6 space-y-4">
                  <p className="text-2xl font-bold text-[#14F195] font-[family-name:var(--font-syne)]">
                    APPROVED
                  </p>
                  <p className="text-sm text-white/70">
                    Approved — {latestPayment.amount} USDC to {latestPayment.vendor}
                  </p>
                  <p className="text-xs text-white/35">
                    x402 payment:{' '}
                    {latestPayment.x402Status === 'executed' ? 'Executed' : 'Mocked'}
                  </p>
                </div>
                <AuditPanel dataSource={dataSource} latestPayment={latestPayment} mandate={mandate} />
              </>
            )}
          </div>
        </section>

      </div>
    </main>
  )
}
