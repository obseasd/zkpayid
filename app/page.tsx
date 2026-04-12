'use client'

import { useState, useEffect, useCallback } from 'react'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { submitAttestation } from '@/lib/contract'
import { ACTIVE_CHAIN } from '@/lib/chains'

const TIERS: Record<string, { color: string; bg: string; ring: string }> = {
  excellent: { color: '#34d399', bg: 'rgba(52,211,153,0.10)', ring: 'rgba(52,211,153,0.3)' },
  good: { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', ring: 'rgba(96,165,250,0.3)' },
  fair: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', ring: 'rgba(251,191,36,0.3)' },
  poor: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', ring: 'rgba(248,113,113,0.3)' },
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState('0')
  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<CreditResult | null>(null)
  const [commitment, setCommitment] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitTx, setSubmitTx] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [switching, setSwitching] = useState(false)

  const handleConnect = useCallback(async () => {
    if (!window.ethereum) { alert('Install MetaMask or Rabby'); return }
    setConnecting(true)
    try {
      const { address: a, chainId: c } = await connectWallet()
      setAddress(a); setChainId(c)
      setBalance(await getBalance(a))
    } catch (e) { console.error(e) }
    setConnecting(false)
  }, [])

  const handleSwitch = useCallback(async () => {
    setSwitching(true)
    const ok = await switchToHashKey()
    if (ok) {
      const cid = parseInt(await window.ethereum!.request({ method: 'eth_chainId' }) as string, 16)
      setChainId(cid)
      if (address) setBalance(await getBalance(address))
    }
    setSwitching(false)
  }, [address])

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

  const handleSubmit = useCallback(async () => {
    if (!commitment || !result) return
    // Force switch to HashKey before submitting
    if (chainId !== ACTIVE_CHAIN.id) {
      const ok = await switchToHashKey()
      if (!ok) { setSubmitError('Switch to HashKey Chain first'); return }
      const cid = parseInt(await window.ethereum!.request({ method: 'eth_chainId' }) as string, 16)
      setChainId(cid)
    }
    setSubmitting(true); setSubmitError(null); setSubmitTx(null)
    try {
      const hash = await submitAttestation(commitment, result.tierIndex, result.maxLoanUSD, result.suggestedAPR)
      setSubmitTx(hash)
    } catch (e) {
      setSubmitError((e as Error).message)
    }
    setSubmitting(false)
  }, [commitment, result, chainId])

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
      {/* Ambient gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top, rgba(159,111,253,0.06) 0%, transparent 60%)' }} />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(0,212,170,0.03) 0%, transparent 60%)' }} />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 py-3 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' }}>ZK</div>
          <span className="font-semibold text-sm">ZK-PayID</span>
          <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD' }}>HashKey</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <a href="/" className="font-medium" style={{ color: '#9F6FFD' }}>Score</a>
          <a href="/verify" className="hover:text-white transition" style={{ color: 'var(--muted)' }}>Verify</a>
          {address ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              {!onChain && (
                <button onClick={handleSwitch} disabled={switching} className="text-[10px] px-2 py-0.5 rounded-md font-medium transition hover:opacity-80" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                  {switching ? '...' : 'Switch'}
                </button>
              )}
              {onChain && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />}
              <span className="font-mono" style={{ color: 'var(--muted)' }}>{short}</span>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn text-xs py-1.5 px-4 rounded-xl">
              {connecting ? '...' : 'Connect'}
            </button>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-md mx-auto px-4 pt-4 pb-12">
        {!address ? (
          /* ===== LANDING ===== */
          <div className="pt-10 text-center space-y-5">
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              Private Credit<br/><span style={{ color: '#9F6FFD' }}>On-Chain</span>
            </h1>
            <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
              Prove creditworthiness with ZK proofs on HashKey Chain.
              Identity hidden. Score verifiable.
            </p>
            <button onClick={handleConnect} disabled={connecting} className="btn text-sm py-3 px-8 rounded-2xl transition hover:shadow-lg hover:shadow-purple-500/20">
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            <div className="flex justify-center gap-2 pt-1">
              {['ZK Private', 'HashKey Chain', 'PayFi Gated'].map(l => (
                <span key={l} className="text-[10px] px-2.5 py-1 rounded-full" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD' }}>{l}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-6 text-left">
              {[
                { t: 'Zero-Knowledge', d: 'Wallet never linked to score on-chain. Commitments only.' },
                { t: '5-Dim Scoring', d: 'Activity, holdings, DeFi depth, stability, history.' },
                { t: 'Gated DeFi', d: 'Score tier unlocks pools, lending, credit lines.' },
              ].map(({ t: title, d }) => (
                <div key={title} className="card p-3 transition hover:border-[var(--border-light)]" style={{ cursor: 'default' }}>
                  <div className="font-semibold text-xs mb-1">{title}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        ) : !result ? (
          /* ===== PRE-SCORE ===== */
          <div className="pt-6 space-y-3">
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
            {!onChain && (
              <button onClick={handleSwitch} disabled={switching} className="w-full py-2.5 rounded-xl text-xs font-semibold transition hover:opacity-90" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                {switching ? 'Switching...' : 'Switch to HashKey Chain Testnet'}
              </button>
            )}
            <button onClick={handleScore} disabled={scoring} className="btn w-full py-3.5 rounded-2xl transition hover:shadow-lg hover:shadow-purple-500/20">
              {scoring ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing on-chain data...
                </span>
              ) : 'Generate ZK Credit Score'}
            </button>
          </div>
        ) : t && (
          /* ===== SCORE RESULT ===== */
          <div className="pt-2 space-y-3">
            {/* Score card with gauge */}
            <div className="card flex items-center gap-4" style={{ boxShadow: `0 0 40px ${t.ring}` }}>
              <div className="relative w-[88px] h-[88px] shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="50" cy="50" r="42" fill="none"
                    stroke={t.color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 264} 264`}
                    style={{ animation: 'scoreReveal 1s ease-out', filter: `drop-shadow(0 0 6px ${t.color}60)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{result.score}</span>
                  <span className="text-[8px]" style={{ color: 'var(--muted)' }}>/100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-md mb-1.5" style={{ color: t.color, background: t.bg }}>
                  {result.tier.toUpperCase()}
                </span>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <div className="text-[8px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div>
                    <div className="text-sm font-bold">${result.maxLoanUSD.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase" style={{ color: 'var(--muted-dim)' }}>APR</div>
                    <div className="text-sm font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="text-[9px] mt-1 leading-snug" style={{ color: 'var(--muted)' }}>{result.recommendation}</div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="card space-y-2">
              <div className="text-[8px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Score Breakdown</div>
              {result.dimensions.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="text-[10px] w-24 shrink-0 truncate">{d.name}</span>
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                    <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(d.score / d.max) * 100}%`, background: `linear-gradient(90deg, #9F6FFD, ${t.color})` }} />
                  </div>
                  <span className="text-[9px] w-7 text-right font-mono" style={{ color: 'var(--muted)' }}>{d.score}/{d.max}</span>
                </div>
              ))}
            </div>

            {/* ZK Attestation */}
            {commitment && (
              <div className="card" style={{ borderColor: submitTx ? 'rgba(52,211,153,0.3)' : 'rgba(159,111,253,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] uppercase tracking-widest" style={{ color: '#9F6FFD' }}>ZK Attestation</span>
                  {submitTx && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>Submitted</span>}
                </div>
                <div className="font-mono text-[9px] break-all p-2 rounded-lg mb-2" style={{ background: 'var(--card-hover)', color: '#9F6FFD' }}>
                  {commitment}
                </div>
                {submitTx ? (
                  <a href={`${ACTIVE_CHAIN.explorer}/tx/${submitTx}`} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2 rounded-xl text-center text-xs font-medium transition hover:opacity-80"
                    style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                    View on Explorer
                  </a>
                ) : (
                  <>
                    <button onClick={handleSubmit} disabled={submitting} className="btn w-full py-2.5 rounded-xl text-xs transition hover:shadow-lg hover:shadow-purple-500/20">
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </span>
                      ) : 'Submit Attestation On-Chain'}
                    </button>
                    {submitError && <div className="text-[10px] mt-1.5 text-center" style={{ color: '#f87171' }}>{submitError}</div>}
                  </>
                )}
              </div>
            )}

            {/* Pool eligibility */}
            <div className="card flex items-center justify-between" style={{ borderColor: result.tierIndex >= 2 ? 'rgba(52,211,153,0.15)' : 'var(--border)' }}>
              <div>
                <div className="text-[8px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>ZK-Gated Pool</div>
                <div className="text-[11px] mt-0.5" style={{ color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted)' }}>
                  {result.tierIndex >= 2 ? 'Eligible to deposit' : 'Requires GOOD tier'}
                </div>
              </div>
              <button disabled={result.tierIndex < 2}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition hover:opacity-80"
                style={{
                  background: result.tierIndex >= 2 ? 'rgba(52,211,153,0.12)' : 'var(--card-hover)',
                  color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted-dim)',
                  cursor: result.tierIndex >= 2 ? 'pointer' : 'not-allowed',
                }}>
                {result.tierIndex >= 2 ? 'Deposit' : 'Locked'}
              </button>
            </div>

            {/* Reset */}
            <button onClick={() => { setResult(null); setCommitment(null); setSubmitTx(null); setSubmitError(null) }}
              className="w-full py-2 text-xs font-medium rounded-xl transition hover:bg-[var(--card-hover)] active:scale-[0.98]"
              style={{ color: 'var(--muted)' }}>
              Score another wallet
            </button>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 px-5 py-2.5" style={{ borderTop: '1px solid var(--border)', background: '#0c0c10' }}>
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
