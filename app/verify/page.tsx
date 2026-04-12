'use client'

import { useState } from 'react'
import { verifyAttestation, checkEligibility } from '@/lib/contract'

const TIER_NAMES = ['Poor', 'Fair', 'Good', 'Excellent']
const TIER_COLORS = ['#f87171', '#fbbf24', '#60a5fa', '#34d399']
const TIER_BGS = ['rgba(248,113,113,0.10)', 'rgba(251,191,36,0.10)', 'rgba(96,165,250,0.10)', 'rgba(52,211,153,0.10)']

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
    <div className="min-h-screen" style={{ background: '#0c0c10' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(159,111,253,0.04) 0%, transparent 70%)' }} />

      <nav className="relative z-10 flex items-center justify-between px-5 py-3 max-w-5xl mx-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white" style={{ background: '#9F6FFD' }}>ZK</div>
          <span className="font-semibold text-sm">ZK-PayID</span>
        </a>
        <div className="flex items-center gap-4 text-xs">
          <a href="/" style={{ color: 'var(--muted)' }} className="hover:text-white transition">Score</a>
          <a href="/verify" className="font-medium" style={{ color: '#9F6FFD' }}>Verify</a>
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 pt-12 space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Verify Attestation</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Check a ZK commitment to verify credit tier — without knowing the wallet behind it.
          </p>
        </div>

        <div className="card space-y-3">
          <div>
            <label className="text-[9px] uppercase tracking-widest block mb-1.5" style={{ color: 'var(--muted)' }}>Commitment Hash</label>
            <input
              type="text" value={commitment} onChange={(e) => setCommitment(e.target.value)}
              placeholder="0x..."
              className="w-full p-3 rounded-xl text-sm font-mono focus:outline-none transition"
              style={{ background: 'var(--card-hover)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <button onClick={handleVerify} disabled={verifying || !commitment} className="btn w-full py-3 rounded-xl">
            {verifying ? 'Verifying...' : 'Verify Attestation'}
          </button>
        </div>

        {error && (
          <div className="card text-sm" style={{ borderColor: 'rgba(248,113,113,0.2)', color: '#f87171' }}>{error}</div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Credit Tier</span>
                <span className="text-sm font-bold px-2.5 py-1 rounded-md" style={{ color: TIER_COLORS[result.tier], background: TIER_BGS[result.tier] }}>
                  {TIER_NAMES[result.tier]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--card-hover)' }}>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div>
                  <div className="text-lg font-bold">${result.maxLoanUSD.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--card-hover)' }}>
                  <div className="text-[9px] uppercase" style={{ color: 'var(--muted-dim)' }}>APR</div>
                  <div className="text-lg font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                </div>
              </div>
              <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                Scored {new Date(result.timestamp * 1000).toLocaleString()}
              </div>
            </div>

            {eligible !== null && (
              <div className="card flex items-center gap-2" style={{
                borderColor: eligible ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.15)'
              }}>
                <span style={{ color: eligible ? '#34d399' : '#f87171' }}>{eligible ? '\u2713' : '\u2717'}</span>
                <span className="text-xs" style={{ color: eligible ? '#34d399' : '#f87171' }}>
                  {eligible ? 'Eligible for PayFi flows' : 'Not eligible — tier too low'}
                </span>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 px-5 py-3" style={{ borderTop: '1px solid var(--border)', background: '#0c0c10' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px]" style={{ color: 'var(--muted-dim)' }}>
          <span>ZK-PayID</span>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} />
            <span>HashKey Chain ZKID Track</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
