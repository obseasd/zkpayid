'use client'

import { useState, useEffect, useCallback } from 'react'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { submitAttestation, getTotalScored } from '@/lib/contract'
import { ACTIVE_CHAIN } from '@/lib/chains'

const TIERS: Record<string, { color: string; bg: string; ring: string }> = {
  excellent: { color: '#34d399', bg: 'rgba(52,211,153,0.10)', ring: 'rgba(52,211,153,0.25)' },
  good: { color: '#60a5fa', bg: 'rgba(96,165,250,0.10)', ring: 'rgba(96,165,250,0.25)' },
  fair: { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)', ring: 'rgba(251,191,36,0.25)' },
  poor: { color: '#f87171', bg: 'rgba(248,113,113,0.10)', ring: 'rgba(248,113,113,0.25)' },
}

function StatCard({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="text-center px-4 py-3 rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xl font-bold" style={{ color: accent ? '#9F6FFD' : 'var(--foreground)' }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

function FlowStep({ num, title, desc, active }: { num: number; title: string; desc: string; active: boolean }) {
  return (
    <div className="flex-1 text-center">
      <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-sm font-bold mb-2 transition-all duration-500 ${active ? 'shadow-[0_0_16px_rgba(159,111,253,0.3)]' : ''}`}
        style={{ background: active ? 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' : 'var(--card)', border: active ? 'none' : '1px solid var(--border)', color: active ? 'white' : 'var(--muted-dim)' }}>
        {num}
      </div>
      <div className="text-xs font-semibold mb-0.5">{title}</div>
      <div className="text-[9px] leading-snug" style={{ color: 'var(--muted)' }}>{desc}</div>
    </div>
  )
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
  const [totalScored, setTotalScored] = useState(0)

  const step = !address ? 0 : !result ? 1 : !submitTx ? 2 : 3

  const handleConnect = useCallback(async () => {
    if (!window.ethereum) { alert('Install MetaMask or Rabby'); return }
    setConnecting(true)
    try { const { address: a, chainId: c } = await connectWallet(); setAddress(a); setChainId(c); setBalance(await getBalance(a)) } catch (e) { console.error(e) }
    setConnecting(false)
  }, [])

  const handleSwitch = useCallback(async () => {
    setSwitching(true)
    const ok = await switchToHashKey()
    if (ok) { const cid = parseInt(await window.ethereum!.request({ method: 'eth_chainId' }) as string, 16); setChainId(cid); if (address) setBalance(await getBalance(address)) }
    setSwitching(false)
  }, [address])

  const handleScore = useCallback(async () => {
    if (!address) return; setScoring(true)
    try { const r = await computeCreditScore(address); setResult(r); setCommitment(generateCommitment(address, r.score, Math.random().toString(36).slice(2))) } catch (e) { console.error(e) }
    setScoring(false)
  }, [address])

  const handleSubmit = useCallback(async () => {
    if (!commitment || !result) return
    if (chainId !== ACTIVE_CHAIN.id) { const ok = await switchToHashKey(); if (!ok) { setSubmitError('Switch to HashKey Chain first'); return }; setChainId(parseInt(await window.ethereum!.request({ method: 'eth_chainId' }) as string, 16)) }
    setSubmitting(true); setSubmitError(null); setSubmitTx(null)
    try { const hash = await submitAttestation(commitment, result.tierIndex, result.maxLoanUSD, result.suggestedAPR); setSubmitTx(hash) } catch (e) { setSubmitError((e as Error).message) }
    setSubmitting(false)
  }, [commitment, result, chainId])

  useEffect(() => { getTotalScored().then(setTotalScored).catch(() => {}) }, [submitTx])
  useEffect(() => {
    if (!window.ethereum) return
    const onAcc = (...a: unknown[]) => { setAddress((a[0] as string[])[0] || null); setResult(null) }
    const onChain = (...a: unknown[]) => setChainId(parseInt(a[0] as string, 16))
    window.ethereum.on('accountsChanged', onAcc); window.ethereum.on('chainChanged', onChain)
    return () => { window.ethereum?.removeListener('accountsChanged', onAcc); window.ethereum?.removeListener('chainChanged', onChain) }
  }, [])

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
  const onChain = chainId === ACTIVE_CHAIN.id
  const t = result ? TIERS[result.tier] : null

  return (
    <div className="min-h-screen" style={{ background: '#0c0c10' }}>
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full opacity-[0.03]" style={{ background: 'radial-gradient(circle, #9F6FFD, transparent 60%)' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #00d4aa, transparent 60%)' }} />
        <div className="absolute top-[40%] left-[-10%] w-[300px] h-[300px] rounded-full opacity-[0.02]" style={{ background: 'radial-gradient(circle, #60a5fa, transparent 60%)' }} />
      </div>

      {/* Grid pattern overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

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
              {!onChain && <button onClick={handleSwitch} disabled={switching} className="text-[10px] px-2 py-0.5 rounded-md font-medium transition hover:opacity-80" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{switching ? '...' : 'Switch'}</button>}
              {onChain && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#34d399' }} />}
              <span className="font-mono" style={{ color: 'var(--muted)' }}>{short}</span>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn text-xs py-1.5 px-4 rounded-xl">{connecting ? '...' : 'Connect'}</button>
          )}
        </div>
      </nav>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-2 pb-14">
        {!address ? (
          /* ===== LANDING ===== */
          <div className="pt-6 space-y-8">
            {/* Hero */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-medium mb-2" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD', border: '1px solid rgba(159,111,253,0.15)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#9F6FFD' }} />
                Live on HashKey Chain Testnet
              </div>
              <h1 className="text-4xl font-bold tracking-tight leading-[1.15]">
                Private Credit<br/><span style={{ color: '#9F6FFD' }}>Scoring On-Chain</span>
              </h1>
              <p className="text-sm max-w-md mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
                Prove your creditworthiness with zero-knowledge proofs. Your identity stays hidden. Your score is verifiable. DeFi access is unlocked.
              </p>
              <button onClick={handleConnect} disabled={connecting} className="btn text-sm py-3.5 px-10 rounded-2xl transition hover:shadow-[0_0_30px_rgba(159,111,253,0.25)] hover:scale-[1.02] active:scale-[0.98]">
                {connecting ? 'Connecting...' : 'Get Started'}
              </button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard value={totalScored} label="Wallets Scored" accent />
              <StatCard value="2" label="Contracts" />
              <StatCard value="5" label="Dimensions" />
              <StatCard value="133" label="Chain ID" />
            </div>

            {/* How it works */}
            <div>
              <div className="text-[9px] uppercase tracking-widest text-center mb-4" style={{ color: 'var(--muted)' }}>How it works</div>
              <div className="flex gap-1 items-start">
                <FlowStep num={1} title="Connect" desc="Link your wallet to HashKey Chain" active={true} />
                <div className="mt-5 w-6 h-px" style={{ background: 'var(--border)' }} />
                <FlowStep num={2} title="Analyze" desc="5-dimension on-chain scoring" active={true} />
                <div className="mt-5 w-6 h-px" style={{ background: 'var(--border)' }} />
                <FlowStep num={3} title="Attest" desc="ZK commitment stored on-chain" active={true} />
                <div className="mt-5 w-6 h-px" style={{ background: 'var(--border)' }} />
                <FlowStep num={4} title="Access" desc="Unlock gated DeFi pools" active={true} />
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-2 text-left">
              {[
                { t: 'Zero-Knowledge Privacy', d: 'Your wallet address is never linked to your credit score on-chain. Only Poseidon hash commitments are stored. Verifiers see the tier, not the identity.', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                { t: 'Multi-Factor Scoring', d: 'Five on-chain dimensions analyzed: wallet activity, transaction depth, token holdings, DeFi protocol engagement, and balance stability over time.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { t: 'Gated DeFi Access', d: 'Your credit tier (Poor to Excellent) gates access to on-chain pools, lending limits, and credit lines. Higher score = lower collateral requirements.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              ].map(({ t: title, d, icon }) => (
                <div key={title} className="card p-4 group transition hover:border-[var(--border-light)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] cursor-default">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 transition group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(159,111,253,0.2)]" style={{ background: 'var(--hsk-soft)' }}>
                    <svg className="w-4 h-4" style={{ color: '#9F6FFD' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div className="font-semibold text-xs mb-1.5">{title}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{d}</div>
                </div>
              ))}
            </div>

            {/* Architecture diagram */}
            <div className="card p-4">
              <div className="text-[9px] uppercase tracking-widest mb-3 text-center" style={{ color: 'var(--muted)' }}>Architecture</div>
              <div className="flex items-center justify-between text-center text-[10px] gap-1">
                {[
                  { label: 'Wallet', sub: 'MetaMask/Rabby', color: '#60a5fa' },
                  { label: 'ZK-PayID', sub: 'Scoring Engine', color: '#9F6FFD' },
                  { label: 'Commitment', sub: 'Poseidon Hash', color: '#fbbf24' },
                  { label: 'On-Chain', sub: 'HashKey (133)', color: '#34d399' },
                  { label: 'Gated Pool', sub: 'DeFi Access', color: '#00d4aa' },
                ].map(({ label, sub, color }, i) => (
                  <div key={label} className="flex items-center gap-1">
                    <div>
                      <div className="w-12 h-12 mx-auto rounded-lg flex items-center justify-center mb-1" style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      </div>
                      <div className="font-semibold" style={{ color }}>{label}</div>
                      <div style={{ color: 'var(--muted-dim)', fontSize: '8px' }}>{sub}</div>
                    </div>
                    {i < 4 && <div className="text-[8px] mt-[-12px]" style={{ color: 'var(--muted-dim)' }}>→</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* Tech stack pills */}
            <div className="flex justify-center gap-1.5 flex-wrap">
              {['Solidity 0.8.20', 'Next.js 16', 'ethers.js v6', 'HashKey Chain', 'Poseidon', 'Groth16 Ready'].map(l => (
                <span key={l} className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{l}</span>
              ))}
            </div>
          </div>
        ) : !result ? (
          /* ===== PRE-SCORE ===== */
          <div className="pt-4 space-y-3">
            {/* Progress */}
            <div className="flex items-center justify-center gap-1 mb-2">
              {['Connect', 'Score', 'Attest', 'Done'].map((l, i) => (
                <div key={l} className="flex items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${i <= step ? 'text-white shadow-[0_0_8px_rgba(159,111,253,0.3)]' : 'text-[var(--muted-dim)]'}`} style={{ background: i <= step ? 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' : 'var(--card)', border: i <= step ? 'none' : '1px solid var(--border)' }}>{i + 1}</div>
                  {i < 3 && <div className="w-6 h-px" style={{ background: i < step ? '#9F6FFD' : 'var(--border)' }} />}
                </div>
              ))}
            </div>

            <div className="card flex items-center justify-between">
              <div><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Wallet</div><div className="font-mono text-xs mt-0.5">{short}</div></div>
              <div className="text-right"><div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Balance</div><div className="text-xs mt-0.5">{parseFloat(balance).toFixed(4)} <span style={{ color: '#9F6FFD' }}>HSK</span></div></div>
            </div>
            {!onChain && <button onClick={handleSwitch} disabled={switching} className="w-full py-2.5 rounded-xl text-xs font-semibold transition hover:opacity-90" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{switching ? 'Switching...' : 'Switch to HashKey Chain Testnet'}</button>}
            <button onClick={handleScore} disabled={scoring} className="btn w-full py-3.5 rounded-2xl transition hover:shadow-[0_0_30px_rgba(159,111,253,0.25)] hover:scale-[1.01] active:scale-[0.99]">
              {scoring ? (<span className="flex items-center justify-center gap-2"><span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing on-chain data...</span>) : 'Generate ZK Credit Score'}
            </button>
          </div>
        ) : t && (
          /* ===== RESULT ===== */
          <div className="pt-2 space-y-2.5">
            {/* Progress */}
            <div className="flex items-center justify-center gap-1 mb-1">
              {['Connect', 'Score', 'Attest', 'Done'].map((l, i) => (
                <div key={l} className="flex items-center gap-1">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${i <= step ? 'text-white' : 'text-[var(--muted-dim)]'}`} style={{ background: i <= step ? 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' : 'var(--card)', border: i <= step ? 'none' : '1px solid var(--border)' }}>{i < step ? '✓' : i + 1}</div>
                  {i < 3 && <div className="w-4 h-px" style={{ background: i < step ? '#9F6FFD' : 'var(--border)' }} />}
                </div>
              ))}
            </div>

            {/* Score card */}
            <div className="card flex items-center gap-4 transition-shadow duration-500" style={{ boxShadow: `0 0 40px ${t.ring}` }}>
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={t.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(result.score / 100) * 264} 264`} style={{ animation: 'scoreReveal 1s ease-out', filter: `drop-shadow(0 0 6px ${t.color}60)` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-xl font-bold">{result.score}</span><span className="text-[7px]" style={{ color: 'var(--muted)' }}>/100</span></div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1" style={{ color: t.color, background: t.bg }}>{result.tier.toUpperCase()}</span>
                <div className="grid grid-cols-2 gap-x-3"><div><div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div><div className="text-sm font-bold">${result.maxLoanUSD.toLocaleString()}</div></div><div><div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>APR</div><div className="text-sm font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div></div></div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>{result.recommendation}</div>
              </div>
            </div>

            {/* Dimensions */}
            <div className="card space-y-1.5">
              <div className="text-[7px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Score Breakdown</div>
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

            {/* Attestation + Pool */}
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-3 card" style={{ borderColor: submitTx ? 'rgba(52,211,153,0.3)' : 'rgba(159,111,253,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[7px] uppercase tracking-widest" style={{ color: '#9F6FFD' }}>ZK Attestation</span>
                  {submitTx && <span className="text-[7px] px-1 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>On-Chain</span>}
                </div>
                <div className="font-mono text-[8px] break-all p-1.5 rounded-lg mb-2 leading-relaxed" style={{ background: 'var(--card-hover)', color: '#9F6FFD' }}>{commitment?.slice(0, 34)}...</div>
                {submitTx ? (
                  <a href={`${ACTIVE_CHAIN.explorer}/tx/${submitTx}`} target="_blank" rel="noopener noreferrer" className="block w-full py-2 rounded-lg text-center text-[10px] font-medium transition hover:opacity-80" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>View on Explorer</a>
                ) : (
                  <><button onClick={handleSubmit} disabled={submitting} className="btn w-full py-2 rounded-lg text-[10px] transition hover:shadow-[0_0_20px_rgba(159,111,253,0.2)]">{submitting ? 'Submitting...' : 'Submit On-Chain'}</button>{submitError && <div className="text-[9px] mt-1 text-center" style={{ color: '#f87171' }}>{submitError}</div>}</>
                )}
              </div>
              <div className="col-span-2 card flex flex-col justify-between" style={{ borderColor: result.tierIndex >= 2 ? 'rgba(52,211,153,0.15)' : 'var(--border)' }}>
                <div>
                  <div className="text-[7px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>ZK-Gated Pool</div>
                  <div className="text-[10px] font-medium" style={{ color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted)' }}>{result.tierIndex >= 2 ? 'Eligible' : 'Locked'}</div>
                  <div className="text-[8px] mt-0.5" style={{ color: 'var(--muted-dim)' }}>{result.tierIndex >= 2 ? 'Deposit to earn yield' : 'Requires GOOD tier'}</div>
                </div>
                <button disabled={result.tierIndex < 2} className="w-full py-1.5 rounded-lg text-[10px] font-semibold mt-2 transition hover:opacity-80" style={{ background: result.tierIndex >= 2 ? 'rgba(52,211,153,0.12)' : 'var(--card-hover)', color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted-dim)', cursor: result.tierIndex >= 2 ? 'pointer' : 'not-allowed' }}>{result.tierIndex >= 2 ? 'Deposit' : 'Locked'}</button>
              </div>
            </div>

            <button onClick={() => { setResult(null); setCommitment(null); setSubmitTx(null); setSubmitError(null) }} className="w-full py-1.5 text-[11px] font-medium rounded-xl transition hover:bg-[var(--card-hover)] active:scale-[0.98]" style={{ color: 'var(--muted)' }}>Score another wallet</button>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 px-5 py-2" style={{ borderTop: '1px solid var(--border)', background: '#0c0c10' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <div className="flex items-center gap-3"><span>ZK-PayID</span><a href={`${ACTIVE_CHAIN.explorer}/address/${ACTIVE_CHAIN.contracts.zkCreditScore}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Contracts</a><a href="https://github.com/obseasd/zkpayid" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></div>
          <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} /><span>HashKey Chain ZKID Track</span></div>
        </div>
      </footer>
    </div>
  )
}
