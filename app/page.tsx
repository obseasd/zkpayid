'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { submitAttestation, getTotalScored } from '@/lib/contract'
import { ACTIVE_CHAIN } from '@/lib/chains'

const VantaBg = dynamic(() => import('@/components/VantaBg'), { ssr: false })

const TIERS: Record<string, { color: string; bg: string; ring: string }> = {
  excellent: { color: '#34d399', bg: 'rgba(52,211,153,0.12)', ring: 'rgba(52,211,153,0.25)' },
  good: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', ring: 'rgba(96,165,250,0.25)' },
  fair: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', ring: 'rgba(251,191,36,0.25)' },
  poor: { color: '#f87171', bg: 'rgba(248,113,113,0.12)', ring: 'rgba(248,113,113,0.25)' },
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
    <div className="min-h-screen relative">
      <VantaBg />

      {/* Nav — glassmorphism */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' }}>ZK</div>
          <span className="font-bold text-base tracking-tight">ZK-PayID</span>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <a href="/" className="font-medium" style={{ color: '#9F6FFD' }}>Score</a>
          <a href="/verify" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Verify</a>
          {address ? (
            <div className="glass flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(2,6,23,0.8)' }}>
              {!onChain && <button onClick={handleSwitch} disabled={switching} className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition hover:opacity-80" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{switching ? '...' : 'Switch'}</button>}
              {onChain && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />}
              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{short}</span>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn text-xs py-2 px-5">{connecting ? '...' : 'Connect'}</button>
          )}
        </div>
      </nav>

      <main className="relative z-10">
        {!address ? (
          /* ===== HERO LANDING ===== */
          <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="max-w-3xl mx-auto text-center space-y-10">
              {/* Badge */}
              <div className="fade-up fade-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide" style={{ background: 'rgba(159,111,253,0.1)', border: '1px solid rgba(159,111,253,0.2)', color: '#9F6FFD' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#9F6FFD' }} />
                Live on HashKey Chain
              </div>

              {/* Hero heading — 3D text shadow */}
              <h1 className="fade-up fade-up-2 text-5xl sm:text-6xl xl:text-7xl font-black tracking-[-0.04em] leading-[0.95] hero-text">
                Private Credit.<br/>
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, #b08aff, #7C4FE0)' }}>
                  Prove It.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="fade-up fade-up-3 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                ZK credit scoring on HashKey Chain. Your wallet identity stays hidden. Your creditworthiness is verifiable on-chain. DeFi access is gated by trust, not collateral.
              </p>

              {/* CTAs */}
              <div className="fade-up fade-up-4 flex items-center justify-center gap-4">
                <button onClick={handleConnect} disabled={connecting} className="btn text-sm py-3.5 px-10">
                  {connecting ? 'Connecting...' : 'Get Started'}
                </button>
                <a href="/verify" className="btn-outline text-sm py-3.5 px-8">
                  Verify Score
                </a>
              </div>

              {/* Stats row */}
              <div className="fade-up fade-up-4 flex items-center justify-center gap-8 pt-4">
                {[
                  { v: totalScored.toString(), l: 'Wallets Scored' },
                  { v: '2', l: 'Contracts' },
                  { v: '5', l: 'Dimensions' },
                  { v: '133', l: 'Chain ID' },
                ].map(({ v, l }) => (
                  <div key={l} className="text-center">
                    <div className="text-2xl font-bold" style={{ color: '#9F6FFD' }}>{v}</div>
                    <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted-dim)' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ===== APP ===== */
          <div className="max-w-md mx-auto px-4 pt-4 pb-16">
            {/* Progress */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {['Connect', 'Score', 'Attest', 'Done'].map((l, i) => (
                <div key={l} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300`}
                    style={{ background: i <= step ? 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' : 'rgba(255,255,255,0.05)', border: i <= step ? 'none' : '1px solid var(--border)', color: i <= step ? 'white' : 'var(--muted-dim)', boxShadow: i === step ? '0 0 15px rgba(159,111,253,0.3)' : 'none' }}>
                    {i < step ? '\u2713' : i + 1}
                  </div>
                  {i < 3 && <div className="w-8 h-px transition-colors" style={{ background: i < step ? '#9F6FFD' : 'var(--border)' }} />}
                </div>
              ))}
            </div>

            {!result ? (
              /* PRE-SCORE */
              <div className="space-y-3">
                <div className="glass p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Wallet</div>
                    <div className="font-mono text-sm mt-0.5">{short}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Balance</div>
                    <div className="text-sm font-semibold mt-0.5">{parseFloat(balance).toFixed(4)} <span style={{ color: '#9F6FFD' }}>HSK</span></div>
                  </div>
                </div>
                {!onChain && <button onClick={handleSwitch} disabled={switching} className="w-full py-3 rounded-xl text-xs font-semibold transition hover:opacity-90" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{switching ? 'Switching...' : 'Switch to HashKey Chain Testnet'}</button>}
                <button onClick={handleScore} disabled={scoring} className="btn w-full py-4 rounded-2xl text-sm">
                  {scoring ? (<span className="flex items-center justify-center gap-2"><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analyzing...</span>) : 'Generate ZK Credit Score'}
                </button>
              </div>
            ) : t && (
              /* SCORE RESULT */
              <div className="space-y-3">
                {/* Score card */}
                <div className="glass p-4 rounded-2xl flex items-center gap-4" style={{ boxShadow: `0 0 40px ${t.ring}, 0 8px 32px rgba(0,0,0,0.3)` }}>
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={t.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(result.score / 100) * 264} 264`} style={{ animation: 'scoreReveal 1s ease-out', filter: `drop-shadow(0 0 8px ${t.color}60)` }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black">{result.score}</span><span className="text-[8px]" style={{ color: 'var(--muted)' }}>/100</span></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-block text-[10px] font-black px-2.5 py-0.5 rounded-md mb-1.5 uppercase tracking-wide" style={{ color: t.color, background: t.bg }}>{result.tier}</span>
                    <div className="grid grid-cols-2 gap-x-3">
                      <div><div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>Max Loan</div><div className="text-base font-bold">${result.maxLoanUSD.toLocaleString()}</div></div>
                      <div><div className="text-[8px] uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>APR</div><div className="text-base font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div></div>
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>{result.recommendation}</div>
                  </div>
                </div>

                {/* Dimensions */}
                <div className="glass p-4 rounded-2xl space-y-2">
                  <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: 'var(--muted)' }}>Score Breakdown</div>
                  {result.dimensions.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="text-[11px] w-28 shrink-0 truncate font-medium">{d.name}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(d.score / d.max) * 100}%`, background: `linear-gradient(90deg, #9F6FFD, ${t.color})` }} />
                      </div>
                      <span className="text-[10px] w-8 text-right font-mono" style={{ color: 'var(--muted)' }}>{d.score}/{d.max}</span>
                    </div>
                  ))}
                </div>

                {/* Attestation + Pool row */}
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-3 glass p-3 rounded-2xl" style={{ borderColor: submitTx ? 'rgba(52,211,153,0.3)' : 'rgba(159,111,253,0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: '#9F6FFD' }}>ZK Attestation</span>
                      {submitTx && <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>On-Chain</span>}
                    </div>
                    <div className="font-mono text-[8px] break-all p-2 rounded-xl mb-2 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)', color: '#9F6FFD' }}>{commitment?.slice(0, 34)}...</div>
                    {submitTx ? (
                      <a href={`${ACTIVE_CHAIN.explorer}/tx/${submitTx}`} target="_blank" rel="noopener noreferrer" className="block w-full py-2 rounded-xl text-center text-[10px] font-bold transition hover:opacity-80 uppercase tracking-wide" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>Explorer</a>
                    ) : (
                      <><button onClick={handleSubmit} disabled={submitting} className="btn w-full py-2.5 rounded-xl text-[10px]">{submitting ? 'Submitting...' : 'Submit On-Chain'}</button>{submitError && <div className="text-[9px] mt-1 text-center" style={{ color: '#f87171' }}>{submitError}</div>}</>
                    )}
                  </div>
                  <div className="col-span-2 glass p-3 rounded-2xl flex flex-col justify-between" style={{ borderColor: result.tierIndex >= 2 ? 'rgba(52,211,153,0.15)' : 'var(--border)' }}>
                    <div>
                      <div className="text-[8px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--muted)' }}>Gated Pool</div>
                      <div className="text-[11px] font-semibold" style={{ color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted)' }}>{result.tierIndex >= 2 ? 'Eligible' : 'Locked'}</div>
                      <div className="text-[8px] mt-0.5" style={{ color: 'var(--muted-dim)' }}>{result.tierIndex >= 2 ? 'Deposit HSK' : 'Need GOOD tier'}</div>
                    </div>
                    <button disabled={result.tierIndex < 2} className="w-full py-2 rounded-xl text-[10px] font-bold mt-2 uppercase tracking-wide transition hover:opacity-80" style={{ background: result.tierIndex >= 2 ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)', color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted-dim)', cursor: result.tierIndex >= 2 ? 'pointer' : 'not-allowed' }}>{result.tierIndex >= 2 ? 'Deposit' : 'Locked'}</button>
                  </div>
                </div>

                <button onClick={() => { setResult(null); setCommitment(null); setSubmitTx(null); setSubmitError(null) }} className="w-full py-2 text-xs font-semibold rounded-xl transition hover:bg-white/5 active:scale-[0.98]" style={{ color: 'var(--muted)' }}>Score another wallet</button>
              </div>
            )}
          </div>
        )}

        {/* How it works — below hero for landing */}
        {!address && (
          <div className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-center mb-8" style={{ color: '#9F6FFD' }}>How It Works</div>
            <div className="grid grid-cols-4 gap-4">
              {[
                { n: '01', t: 'Connect', d: 'Link your wallet to HashKey Chain. We read your on-chain state.' },
                { n: '02', t: 'Analyze', d: '5-dimension scoring: activity, holdings, DeFi engagement, stability, history.' },
                { n: '03', t: 'Attest', d: 'A ZK commitment is generated and submitted on-chain. Your identity stays hidden.' },
                { n: '04', t: 'Access', d: 'Your credit tier unlocks gated DeFi pools, lending, and credit lines.' },
              ].map(({ n, t: title, d }) => (
                <div key={n} className="glass p-5 rounded-2xl group transition hover:shadow-[0_8px_40px_rgba(159,111,253,0.08)] cursor-default">
                  <div className="text-3xl font-black mb-3 transition group-hover:scale-105" style={{ color: 'rgba(159,111,253,0.15)' }}>{n}</div>
                  <div className="text-sm font-bold mb-2">{title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{d}</div>
                </div>
              ))}
            </div>

            {/* Tech pills */}
            <div className="flex justify-center gap-2 flex-wrap mt-12">
              {['Solidity 0.8.20', 'Groth16 ZK', 'Next.js 16', 'ethers.js v6', 'HashKey Chain', 'Poseidon Hash', 'ERC-8004 Ready'].map(l => (
                <span key={l} className="text-[9px] px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{l}</span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 px-6 py-2" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <div className="flex items-center gap-3">
            <span className="font-semibold">ZK-PayID</span>
            <a href={`${ACTIVE_CHAIN.explorer}/address/${ACTIVE_CHAIN.contracts.zkCreditScore}`} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Contracts</a>
            <a href="https://github.com/obseasd/zkpayid" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">GitHub</a>
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
