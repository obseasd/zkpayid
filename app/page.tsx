'use client'

import { useState, useEffect, useCallback } from 'react'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { ACTIVE_CHAIN } from '@/lib/chains'

const TIERS: Record<string, { color: string; bg: string }> = {
  excellent: { color: '#34d399', bg: 'rgba(52,211,153,0.10)' },
  good: { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)' },
  fair: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)' },
  poor: { color: '#f87171', bg: 'rgba(248,113,113,0.10)' },
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState('0')
  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<CreditResult | null>(null)
  const [commitment, setCommitment] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const handleConnect = useCallback(async () => {
    if (!window.ethereum) { alert('Install MetaMask'); return }
    setConnecting(true)
    try {
      const { address: a, chainId: c } = await connectWallet()
      setAddress(a); setChainId(c)
      setBalance(await getBalance(a))
    } catch (e) { console.error(e) }
    setConnecting(false)
  }, [])

  const handleScore = useCallback(async () => {
    if (!address) return
    setScoring(true)
    try {
      const r = await computeCreditScore(address)
      setResult(r)
      setCommitment(generateCommitment(address, r.score, Math.random().toString(36).slice(2)))
    } catch (e) { console.error(e) }
    setScoring(false)
  }, [address])

  useEffect(() => {
    if (!window.ethereum) return
    const onAcc = (...a: unknown[]) => { setAddress((a[0] as string[])[0] || null); setResult(null) }
    const onChain = (...a: unknown[]) => setChainId(parseInt(a[0] as string, 16))
    window.ethereum.on('accountsChanged', onAcc)
    window.ethereum.on('chainChanged', onChain)
    return () => { window.ethereum?.removeListener('accountsChanged', onAcc); window.ethereum?.removeListener('chainChanged', onChain) }
  }, [])

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
  const onChain = chainId === ACTIVE_CHAIN.id
  const t = result ? TIERS[result.tier] : null

  return (
    <div className="min-h-screen" style={{ background: '#0c0c10' }}>
      {/* Ambient */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(159,111,253,0.05) 0%, transparent 70%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white" style={{ background: '#9F6FFD' }}>ZK</div>
          <span className="font-semibold text-sm">ZK-PayID</span>
          <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD' }}>HashKey</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <a href="/" className="font-medium" style={{ color: '#9F6FFD' }}>Score</a>
          <a href="/verify" style={{ color: 'var(--muted)' }} className="hover:text-white transition">Verify</a>
          {address ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              {!onChain && <button onClick={switchToHashKey} className="text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>Switch</button>}
              <span style={{ color: '#9F6FFD' }}>{parseFloat(balance).toFixed(2)}</span>
              <span style={{ color: 'var(--muted-dim)' }}>|</span>
              <span className="font-mono" style={{ color: 'var(--muted)' }}>{short}</span>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn text-xs py-1.5 px-4 rounded-xl">
              {connecting ? '...' : 'Connect'}
            </button>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 pt-4 pb-16">
        {!address ? (
          /* ========== LANDING ========== */
          <div className="pt-12 text-center space-y-5">
            <h1 className="text-4xl font-bold tracking-tight">
              Private Credit<br/><span style={{ color: '#9F6FFD' }}>On-Chain</span>
            </h1>
            <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--muted)' }}>
              Prove creditworthiness with ZK proofs on HashKey Chain. Identity hidden. Score verifiable.
            </p>
            <button onClick={handleConnect} disabled={connecting} className="btn text-sm py-3 px-8 rounded-2xl">
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <div className="flex justify-center gap-2 pt-2">
              {['ZK Private', 'HashKey Chain', 'PayFi Gated'].map(l => (
                <span key={l} className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD' }}>{l}</span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-8 text-left">
              {[
                { t: 'Zero-Knowledge', d: 'Wallet never linked to score on-chain. Commitments only.' },
                { t: '5-Dim Scoring', d: 'Activity, holdings, DeFi depth, stability, history.' },
                { t: 'Gated DeFi', d: 'Score tier unlocks pools, lending, credit lines.' },
              ].map(({ t, d }) => (
                <div key={t} className="card p-3">
                  <div className="font-semibold text-xs mb-1">{t}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        ) : !result ? (
          /* ========== PRE-SCORE ========== */
          <div className="pt-8 space-y-4">
            <div className="card flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Wallet</div>
                <div className="font-mono text-xs mt-0.5">{short}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Balance</div>
                <div className="text-xs mt-0.5">{parseFloat(balance).toFixed(4)} <span style={{ color: '#9F6FFD' }}>HSK</span></div>
              </div>
            </div>
            <button onClick={handleScore} disabled={scoring} className="btn w-full py-3.5 rounded-2xl">
              {scoring ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </span>
              ) : 'Generate ZK Credit Score'}
            </button>
          </div>
        ) : t && (
          /* ========== SCORE RESULT — COMPACT ========== */
          <div className="pt-4 space-y-3">
            {/* Score + Tier — single row */}
            <div className="card flex items-center gap-4">
              {/* Gauge */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={t.color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 264} 264`}
                    style={{ animation: 'scoreReveal 1s ease-out', filter: `drop-shadow(0 0 6px ${t.color}50)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{result.score}</span>
                  <span className="text-[9px]" style={{ color: 'var(--muted)' }}>/100</span>
                </div>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-md mb-2" style={{ color: t.color, background: t.bg }}>
                  {result.tier.toUpperCase()}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[9px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div>
                    <div className="text-sm font-bold">${result.maxLoanUSD.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase" style={{ color: 'var(--muted-dim)' }}>APR</div>
                    <div className="text-sm font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>{result.recommendation}</div>
              </div>
            </div>

            {/* Dimensions — compact bars */}
            <div className="card space-y-2">
              <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Breakdown</div>
              {result.dimensions.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-[11px] w-28 shrink-0 truncate">{d.name}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(d.score / d.max) * 100}%`, background: '#9F6FFD' }} />
                  </div>
                  <span className="text-[10px] w-8 text-right" style={{ color: 'var(--muted)' }}>{d.score}/{d.max}</span>
                </div>
              ))}
            </div>

            {/* ZK Commitment — compact */}
            {commitment && (
              <div className="card" style={{ borderColor: 'rgba(159,111,253,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] uppercase tracking-widest" style={{ color: '#9F6FFD' }}>ZK Attestation</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD' }}>On-Chain</span>
                </div>
                <div className="font-mono text-[10px] break-all p-2 rounded-lg mb-2" style={{ background: 'var(--card-hover)', color: '#9F6FFD' }}>
                  {commitment}
                </div>
                <button className="btn w-full py-2.5 rounded-xl text-xs">
                  Submit Attestation On-Chain
                </button>
              </div>
            )}

            {/* Pool eligibility teaser */}
            <div className="card flex items-center justify-between" style={{ borderColor: result.tierIndex >= 2 ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.15)' }}>
              <div>
                <div className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>ZK-Gated Pool</div>
                <div className="text-xs mt-0.5" style={{ color: result.tierIndex >= 2 ? '#34d399' : '#f87171' }}>
                  {result.tierIndex >= 2 ? 'Eligible to deposit' : 'Requires GOOD tier or above'}
                </div>
              </div>
              <button
                disabled={result.tierIndex < 2}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition"
                style={{
                  background: result.tierIndex >= 2 ? 'rgba(52,211,153,0.12)' : 'var(--card-hover)',
                  color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted-dim)',
                  cursor: result.tierIndex >= 2 ? 'pointer' : 'not-allowed',
                }}
              >
                {result.tierIndex >= 2 ? 'Deposit' : 'Locked'}
              </button>
            </div>

            <button onClick={() => { setResult(null); setCommitment(null) }} className="w-full py-1.5 text-xs transition" style={{ color: 'var(--muted)' }}>
              Score another wallet
            </button>
          </div>
        )}
      </main>

      <footer className="relative z-10 px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
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
