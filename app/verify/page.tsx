'use client'

import { useState } from 'react'
import { verifyAttestation, checkEligibility } from '@/lib/contract'

const TIER_NAMES = ['Poor', 'Fair', 'Good', 'Excellent']
const TIER_COLORS = ['#eb5757', '#f2994a', '#2172e5', '#27ae60']
const TIER_BGS = ['rgba(235,87,87,0.12)', 'rgba(242,153,74,0.12)', 'rgba(33,114,229,0.12)', 'rgba(39,174,96,0.12)']

export default function VerifyPage() {
  const [commitment, setCommitment] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{
    tier: number; maxLoanUSD: number; suggestedAPR: number; timestamp: number
  } | null>(null)
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!commitment) return
    setVerifying(true); setError(null); setResult(null); setEligible(null)
    try {
      const res = await verifyAttestation(commitment)
      if (!res) { setError('Attestation not found or contract not deployed yet.'); setVerifying(false); return }
      setResult(res)
      setEligible(await checkEligibility(commitment, 1))
    } catch (err) { setError((err as Error).message) }
    setVerifying(false)
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #131316 0%, #0d1117 50%, #131316 100%)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(0,194,168,0.06) 0%, transparent 70%)' }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <a href="/" className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#ff007a"/>
            <text x="6" y="20" fontSize="14" fontWeight="700" fill="white">ZK</text>
          </svg>
          <span className="font-semibold text-base">ZK-PayID</span>
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="/" style={{ color: 'var(--muted)' }} className="hover:text-white transition">Score</a>
          <a href="/verify" className="text-white font-medium">Verify</a>
        </nav>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-12 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Verify Attestation</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Enter a ZK commitment hash to verify credit tier — without knowing their identity.
          </p>
        </div>

        <div className="card-glow glow-teal space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest block mb-2" style={{ color: 'var(--muted)' }}>Commitment Hash</label>
            <input
              type="text"
              value={commitment}
              onChange={(e) => setCommitment(e.target.value)}
              placeholder="0x..."
              className="w-full p-3.5 rounded-2xl text-sm font-mono focus:outline-none transition"
              style={{ background: 'var(--card-hover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <button onClick={handleVerify} disabled={verifying || !commitment} className="btn-primary w-full py-3.5 rounded-2xl">
            {verifying ? 'Verifying on-chain...' : 'Verify Attestation'}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl text-sm" style={{ background: 'var(--red-soft, rgba(235,87,87,0.12))', color: 'var(--red)', border: '1px solid rgba(235,87,87,0.2)' }}>
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="card-glow space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Credit Tier</span>
                <span className="text-lg font-bold px-3 py-1 rounded-full" style={{ color: TIER_COLORS[result.tier], background: TIER_BGS[result.tier] }}>
                  {TIER_NAMES[result.tier]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--card-hover)' }}>
                  <div className="text-[10px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div>
                  <div className="text-xl font-bold mt-1">${result.maxLoanUSD.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--card-hover)' }}>
                  <div className="text-[10px] uppercase" style={{ color: 'var(--muted-dim)' }}>APR</div>
                  <div className="text-xl font-bold mt-1">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase" style={{ color: 'var(--muted-dim)' }}>Scored At</div>
                <div className="text-sm mt-1">{new Date(result.timestamp * 1000).toLocaleString()}</div>
              </div>
            </div>

            {eligible !== null && (
              <div className="p-4 rounded-2xl flex items-center gap-2" style={{
                background: eligible ? 'rgba(39,174,96,0.12)' : 'rgba(235,87,87,0.12)',
                border: `1px solid ${eligible ? 'rgba(39,174,96,0.2)' : 'rgba(235,87,87,0.2)'}`
              }}>
                <span className="text-lg">{eligible ? '✓' : '✗'}</span>
                <span className="font-medium text-sm" style={{ color: eligible ? '#27ae60' : '#eb5757' }}>
                  {eligible ? 'Eligible for PayFi flows (tier >= Fair)' : 'Not eligible — tier too low'}
                </span>
              </div>
            )}

            <div className="p-3 rounded-2xl text-xs" style={{ background: 'rgba(0,194,168,0.06)', border: '1px solid rgba(0,194,168,0.15)', color: 'var(--teal)' }}>
              Verified on HashKey Chain. Wallet identity hidden by zero-knowledge commitment.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
