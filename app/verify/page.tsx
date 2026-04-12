'use client'

import { useState } from 'react'
import { verifyAttestation, checkEligibility } from '@/lib/contract'

const TIER_NAMES = ['Poor', 'Fair', 'Good', 'Excellent']
const TIER_COLORS = ['text-red-400', 'text-amber-400', 'text-blue-400', 'text-emerald-400']

export default function VerifyPage() {
  const [commitment, setCommitment] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<{
    tier: number
    maxLoanUSD: number
    suggestedAPR: number
    timestamp: number
  } | null>(null)
  const [eligible, setEligible] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!commitment) return
    setVerifying(true)
    setError(null)
    setResult(null)
    setEligible(null)

    try {
      const res = await verifyAttestation(commitment)
      if (!res) {
        setError('Attestation not found or contract not deployed yet.')
        setVerifying(false)
        return
      }
      setResult(res)
      const elig = await checkEligibility(commitment, 1) // min tier = fair
      setEligible(elig)
    } catch (err) {
      setError((err as Error).message)
    }
    setVerifying(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <a href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold">ZK</div>
          <span className="font-semibold text-lg">ZK-PayID</span>
        </a>
        <span className="text-xs text-zinc-500">Verify Attestation</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Verify Credit Attestation</h1>
          <p className="text-zinc-400 text-sm">
            Enter a ZK commitment hash to verify someone&apos;s credit tier — without knowing their identity.
          </p>
        </div>

        {/* Input */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Commitment Hash</label>
          <input
            type="text"
            value={commitment}
            onChange={(e) => setCommitment(e.target.value)}
            placeholder="0x..."
            className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm font-mono focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying || !commitment}
          className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium transition disabled:opacity-40"
        >
          {verifying ? 'Verifying on-chain...' : 'Verify Attestation'}
        </button>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">Credit Tier</span>
                <span className={`text-lg font-bold ${TIER_COLORS[result.tier]}`}>
                  {TIER_NAMES[result.tier]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-500">Max Loan</div>
                  <div className="text-lg font-bold">${result.maxLoanUSD.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Suggested APR</div>
                  <div className="text-lg font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Scored At</div>
                <div className="text-sm">{new Date(result.timestamp * 1000).toLocaleString()}</div>
              </div>
            </div>

            {/* Eligibility */}
            {eligible !== null && (
              <div className={`p-4 rounded-xl border ${eligible ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{eligible ? '✓' : '✗'}</span>
                  <span className={`font-medium ${eligible ? 'text-emerald-400' : 'text-red-400'}`}>
                    {eligible ? 'Eligible for PayFi flows (tier >= Fair)' : 'Not eligible — credit tier too low'}
                  </span>
                </div>
              </div>
            )}

            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
              This attestation was verified on-chain on HashKey Chain Testnet.
              The wallet identity behind this commitment is hidden by zero-knowledge proofs.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
