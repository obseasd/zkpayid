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

function StepIndicator({ step, active, label }: { step: number; active: boolean; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 ${
        active ? 'border-[#9F6FFD] text-[#9F6FFD] shadow-[0_0_12px_rgba(159,111,253,0.3)]' : 'border-[var(--border)] text-[var(--muted-dim)]'
      }`}>{step}</div>
      <span className={`text-[9px] transition-colors ${active ? 'text-[#9F6FFD]' : 'text-[var(--muted-dim)]'}`}>{label}</span>
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

  const currentStep = !address ? 1 : !result ? 2 : !submitTx ? 3 : 4

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
    } catch (e) { setSubmitError((e as Error).message) }
    setSubmitting(false)
  }, [commitment, result, chainId])

  useEffect(() => {
    getTotalScored().then(setTotalScored).catch(() => {})
  }, [submitTx])

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
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none opacity-60" style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(159,111,253,0.07) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,212,170,0.04) 0%, transparent 50%)' }} />

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
        {/* Step indicator — always visible when connected */}
        {address && (
          <div className="flex items-center justify-center gap-1 mb-4">
            <StepIndicator step={1} active={currentStep >= 1} label="Connect" />
            <div className="w-8 h-px mt-[-14px]" style={{ background: currentStep >= 2 ? '#9F6FFD' : 'var(--border)' }} />
            <StepIndicator step={2} active={currentStep >= 2} label="Score" />
            <div className="w-8 h-px mt-[-14px]" style={{ background: currentStep >= 3 ? '#9F6FFD' : 'var(--border)' }} />
            <StepIndicator step={3} active={currentStep >= 3} label="Attest" />
            <div className="w-8 h-px mt-[-14px]" style={{ background: currentStep >= 4 ? '#9F6FFD' : 'var(--border)' }} />
            <StepIndicator step={4} active={currentStep >= 4} label="Verified" />
          </div>
        )}

        {!address ? (
          /* ===== LANDING ===== */
          <div className="pt-6 text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tight leading-tight">
              Private Credit<br/><span style={{ color: '#9F6FFD' }}>On-Chain</span>
            </h1>
            <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
              Prove creditworthiness with ZK proofs on HashKey Chain. Identity hidden. Score verifiable. DeFi unlocked.
            </p>
            <button onClick={handleConnect} disabled={connecting} className="btn text-sm py-3 px-8 rounded-2xl transition hover:shadow-lg hover:shadow-purple-500/20">
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>

            {/* How it works */}
            <div className="pt-6 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-center" style={{ color: 'var(--muted)' }}>How it works</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { s: '1', t: 'Connect', d: 'Link your wallet' },
                  { s: '2', t: 'Score', d: '5-dimension analysis' },
                  { s: '3', t: 'Attest', d: 'ZK commitment on-chain' },
                  { s: '4', t: 'Access', d: 'Unlock gated DeFi' },
                ].map(({ s, t: title, d }) => (
                  <div key={s} className="text-center">
                    <div className="w-9 h-9 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1.5" style={{ border: '1px solid var(--border)', color: '#9F6FFD' }}>{s}</div>
                    <div className="text-[11px] font-semibold">{title}</div>
                    <div className="text-[9px]" style={{ color: 'var(--muted)' }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-left">
              {[
                { t: 'Zero-Knowledge', d: 'Wallet never linked to score on-chain. Only commitments are stored.', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
                { t: '5-Dim Scoring', d: 'Activity, holdings, DeFi depth, stability and transaction history.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { t: 'Gated DeFi', d: 'Score tier unlocks pools, lending limits and credit lines on-chain.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              ].map(({ t: title, d, icon }) => (
                <div key={title} className="card p-3 group transition hover:border-[var(--border-light)] cursor-default">
                  <svg className="w-5 h-5 mb-2 transition group-hover:scale-110" style={{ color: '#9F6FFD' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                  <div className="font-semibold text-xs mb-1">{title}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: 'var(--muted)' }}>{d}</div>
                </div>
              ))}
            </div>

            {/* Protocol stats */}
            <div className="flex justify-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: '#9F6FFD' }}>{totalScored}</div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Wallets Scored</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: '#9F6FFD' }}>2</div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Contracts Deployed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: '#9F6FFD' }}>5</div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Scoring Dimensions</div>
              </div>
            </div>

            {/* Tech pills */}
            <div className="flex justify-center gap-1.5 flex-wrap pt-2 pb-4">
              {['Groth16 ZK', 'HashKey Chain', 'PayFi Gated', 'ERC-8004 Ready', 'Poseidon Hash'].map(l => (
                <span key={l} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'var(--hsk-soft)', color: '#9F6FFD' }}>{l}</span>
              ))}
            </div>
          </div>
        ) : !result ? (
          /* ===== PRE-SCORE ===== */
          <div className="space-y-3">
            <div className="card flex items-center justify-between">
              <div>
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Wallet</div>
                <div className="font-mono text-xs mt-0.5">{short}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Balance</div>
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
            <div className="text-center text-[10px] pt-1" style={{ color: 'var(--muted-dim)' }}>
              Reads on-chain state from HashKey Testnet (Chain {ACTIVE_CHAIN.id})
            </div>
          </div>
        ) : t && (
          /* ===== SCORE RESULT ===== */
          <div className="space-y-2.5">
            {/* Score card */}
            <div className="card flex items-center gap-4 transition-shadow duration-500" style={{ boxShadow: `0 0 40px ${t.ring}` }}>
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={t.color} strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(result.score / 100) * 264} 264`}
                    style={{ animation: 'scoreReveal 1s ease-out', filter: `drop-shadow(0 0 6px ${t.color}60)` }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold">{result.score}</span>
                  <span className="text-[7px]" style={{ color: 'var(--muted)' }}>/100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1" style={{ color: t.color, background: t.bg }}>{result.tier.toUpperCase()}</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  <div><div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div><div className="text-sm font-bold">${result.maxLoanUSD.toLocaleString()}</div></div>
                  <div><div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>Suggested APR</div><div className="text-sm font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div></div>
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>{result.recommendation}</div>
              </div>
            </div>

            {/* Dimensions — two-column compact */}
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

            {/* Attestation + Pool in a row */}
            <div className="grid grid-cols-5 gap-2">
              {/* Attestation — 3 cols */}
              <div className="col-span-3 card" style={{ borderColor: submitTx ? 'rgba(52,211,153,0.3)' : 'rgba(159,111,253,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[7px] uppercase tracking-widest" style={{ color: '#9F6FFD' }}>ZK Attestation</span>
                  {submitTx && <span className="text-[7px] px-1 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>On-Chain</span>}
                </div>
                <div className="font-mono text-[8px] break-all p-1.5 rounded-lg mb-2 leading-relaxed" style={{ background: 'var(--card-hover)', color: '#9F6FFD' }}>
                  {commitment?.slice(0, 34)}...
                </div>
                {submitTx ? (
                  <a href={`${ACTIVE_CHAIN.explorer}/tx/${submitTx}`} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-2 rounded-lg text-center text-[10px] font-medium transition hover:opacity-80" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                    View on Explorer
                  </a>
                ) : (
                  <>
                    <button onClick={handleSubmit} disabled={submitting} className="btn w-full py-2 rounded-lg text-[10px] transition hover:shadow-lg hover:shadow-purple-500/20">
                      {submitting ? 'Submitting...' : 'Submit On-Chain'}
                    </button>
                    {submitError && <div className="text-[9px] mt-1 text-center" style={{ color: '#f87171' }}>{submitError}</div>}
                  </>
                )}
              </div>

              {/* Pool — 2 cols */}
              <div className="col-span-2 card flex flex-col justify-between" style={{ borderColor: result.tierIndex >= 2 ? 'rgba(52,211,153,0.15)' : 'var(--border)' }}>
                <div>
                  <div className="text-[7px] uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>ZK-Gated Pool</div>
                  <div className="text-[10px]" style={{ color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted)' }}>
                    {result.tierIndex >= 2 ? 'Eligible' : 'Locked'}
                  </div>
                  <div className="text-[8px] mt-0.5" style={{ color: 'var(--muted-dim)' }}>
                    {result.tierIndex >= 2 ? 'Deposit to earn yield' : 'Requires GOOD tier'}
                  </div>
                </div>
                <button disabled={result.tierIndex < 2} className="w-full py-1.5 rounded-lg text-[10px] font-semibold mt-2 transition hover:opacity-80"
                  style={{ background: result.tierIndex >= 2 ? 'rgba(52,211,153,0.12)' : 'var(--card-hover)', color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted-dim)', cursor: result.tierIndex >= 2 ? 'pointer' : 'not-allowed' }}>
                  {result.tierIndex >= 2 ? 'Deposit' : 'Locked'}
                </button>
              </div>
            </div>

            <button onClick={() => { setResult(null); setCommitment(null); setSubmitTx(null); setSubmitError(null) }}
              className="w-full py-1.5 text-[11px] font-medium rounded-xl transition hover:bg-[var(--card-hover)] active:scale-[0.98]" style={{ color: 'var(--muted)' }}>
              Score another wallet
            </button>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-10 px-5 py-2" style={{ borderTop: '1px solid var(--border)', background: '#0c0c10' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <div className="flex items-center gap-3">
            <span>ZK-PayID</span>
            <a href={`${ACTIVE_CHAIN.explorer}/address/${ACTIVE_CHAIN.contracts.zkCreditScore}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Contract</a>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} />
            <span>HashKey Chain Testnet</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
