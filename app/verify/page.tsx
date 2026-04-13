'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { verifyAttestation, checkEligibility } from '@/lib/contract'

const VantaBg = dynamic(() => import('@/components/VantaBg'), { ssr: false })

const TIER_NAMES = ['Poor', 'Fair', 'Good', 'Excellent']
const TIER_COLORS = ['#b91c1c', '#6b7280', '#1a9a5c', '#9F6FFD']
const TIER_BGS = ['rgba(185,28,28,0.12)', 'rgba(107,114,128,0.12)', 'rgba(26,154,92,0.12)', 'rgba(159,111,253,0.12)']

export default function VerifyPage() {
  const [commitment, setCommitment] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{ tier: number; maxLoanUSD: number; suggestedAPR: number; timestamp: number } | null>(null)
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!commitment) return
    setVerifying(true); setError(null); setResult(null); setEligible(null)
    try {
      const res = await verifyAttestation(commitment)
      if (!res) { setError('Attestation not found or contract not deployed.'); setVerifying(false); return }
      setResult(res)
      setEligible(await checkEligibility(commitment, 1))
    } catch (err) { setError((err as Error).message) }
    setVerifying(false)
  }

  return (
    <div className="min-h-screen relative">
      <VantaBg />

      {/* Nav — same as score page */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="ZK-PayID" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-base tracking-tight">ZK-PayID</span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <a href="/" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Score</a>
          <a href="/verify" className="font-medium" style={{ color: '#9F6FFD' }}>Verify</a>
          <a href="/dashboard" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Dashboard</a>
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 pt-16 space-y-6">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-black tracking-tight">Verify Attestation</h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            Check a ZK commitment to verify credit tier — without knowing the wallet behind it.
          </p>
        </div>

        <div className="glass p-5 rounded-2xl space-y-4">
          <div>
            <label className="text-[9px] uppercase tracking-widest font-bold block mb-2" style={{ color: 'var(--muted)' }}>Commitment Hash</label>
            <input
              type="text" value={commitment} onChange={(e) => setCommitment(e.target.value)}
              placeholder="0x..."
              className="w-full p-3.5 rounded-xl text-sm font-mono focus:outline-none transition"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <button onClick={handleVerify} disabled={verifying || !commitment} className="btn w-full py-3.5 rounded-xl">
            {verifying ? 'Verifying on-chain...' : 'Verify Attestation'}
          </button>
        </div>

        {error && (
          <div className="glass p-4 rounded-2xl text-sm" style={{ borderColor: 'rgba(248,113,113,0.2)', color: '#f87171' }}>{error}</div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="glass p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--muted)' }}>Credit Tier</span>
                <span className="text-sm font-black px-3 py-1 rounded-lg uppercase tracking-wide" style={{ color: TIER_COLORS[result.tier], background: TIER_BGS[result.tier] }}>
                  {TIER_NAMES[result.tier]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-[8px] uppercase tracking-wider font-bold" style={{ color: 'var(--muted-dim)' }}>Max Loan</div>
                  <div className="text-xl font-black mt-1">${result.maxLoanUSD.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <div className="text-[8px] uppercase tracking-wider font-bold" style={{ color: 'var(--muted-dim)' }}>APR</div>
                  <div className="text-xl font-black mt-1">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                Scored {new Date(result.timestamp * 1000).toLocaleString()}
              </div>
            </div>

            {eligible !== null && (
              <div className="glass p-4 rounded-2xl flex items-center gap-2" style={{
                borderColor: eligible ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.15)'
              }}>
                <span className="text-lg font-bold" style={{ color: eligible ? '#34d399' : '#f87171' }}>{eligible ? '\u2713' : '\u2717'}</span>
                <span className="text-xs font-semibold" style={{ color: eligible ? '#34d399' : '#f87171' }}>
                  {eligible ? 'Eligible for PayFi flows' : 'Not eligible — tier too low'}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer — same as score page */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 px-6 py-2" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <div className="flex items-center gap-3">
            <span className="font-semibold">ZK-PayID</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} />
            <span>HashKey Chain ZKID Track</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
