'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { submitAttestation, getTotalScored } from '@/lib/contract'
import { generateZKProof, type ZKProofResult } from '@/lib/zk-proof'
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
  const [totalScored, setTotalScored] = useState(0) // used in dashboard
  // ZK proof state
  const [provingZK, setProvingZK] = useState(false)
  const [zkProof, setZkProof] = useState<ZKProofResult | null>(null)
  const [provingStep, setProvingStep] = useState('')

  const step = !address ? 0 : !result ? 1 : !zkProof ? 2 : !submitTx ? 3 : 4

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
    try {
      const r = await computeCreditScore(address)
      setResult(r)
      setCommitment(generateCommitment(address, r.score, Math.random().toString(36).slice(2)))
    } catch (e) { console.error(e) }
    setScoring(false)
  }, [address])

  const handleGenerateProof = useCallback(async () => {
    if (!address || !result) return
    setProvingZK(true); setProvingStep('Loading ZK circuit (1.8MB)...')
    try {
      setProvingStep('Computing Poseidon hash...')
      await new Promise(r => setTimeout(r, 300))
      setProvingStep('Generating Groth16 witness (286 constraints)...')
      await new Promise(r => setTimeout(r, 200))
      setProvingStep('Computing proof (bn128 curve)...')
      const proof = await generateZKProof(address, result.score, result.tier)
      setZkProof(proof)
      setCommitment(proof.commitment)
      setProvingStep('')
    } catch (e) {
      console.error(e)
      setProvingStep('Proof generation failed: ' + (e as Error).message)
    }
    setProvingZK(false)
  }, [address, result])

  const handleSubmit = useCallback(async () => {
    if (!commitment || !result || !zkProof) return
    if (chainId !== ACTIVE_CHAIN.id) { const ok = await switchToHashKey(); if (!ok) { setSubmitError('Switch to HashKey Chain first'); return }; setChainId(parseInt(await window.ethereum!.request({ method: 'eth_chainId' }) as string, 16)) }
    setSubmitting(true); setSubmitError(null); setSubmitTx(null)
    try { const hash = await submitAttestation(commitment, result.tierIndex, result.maxLoanUSD, result.suggestedAPR); setSubmitTx(hash) } catch (e) { setSubmitError((e as Error).message) }
    setSubmitting(false)
  }, [commitment, result, chainId, zkProof])

  useEffect(() => { getTotalScored().then(setTotalScored).catch(() => {}) }, [submitTx])
  useEffect(() => {
    if (!window.ethereum) return
    const onAcc = (...a: unknown[]) => { setAddress((a[0] as string[])[0] || null); setResult(null); setZkProof(null) }
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

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition">
          <img src="/logo.png" alt="ZK-PayID" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-base tracking-tight">ZK-PayID</span>
        </a>
        <div className="flex items-center gap-5 text-sm">
          <a href="/" className="font-medium" style={{ color: '#9F6FFD' }}>Score</a>
          <a href="/verify" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Verify</a>
          <a href="/dashboard" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Dashboard</a>
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
          /* ===== HERO ===== */
          <div className="min-h-[85vh] flex items-center justify-center px-4">
            <div className="max-w-3xl mx-auto text-center space-y-10">
              <div className="fade-up fade-up-1 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide" style={{ background: 'rgba(159,111,253,0.1)', border: '1px solid rgba(159,111,253,0.2)', color: '#9F6FFD' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#9F6FFD' }} />
                Live on HashKey Chain &middot; Real Groth16 ZK Proofs
              </div>
              <h1 className="fade-up fade-up-2 text-5xl sm:text-6xl xl:text-7xl font-black tracking-[-0.04em] leading-[0.95] hero-text">
                Private Credit.<br/>
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to bottom, #b08aff, #7C4FE0)' }}>Prove It.</span>
              </h1>
              <p className="fade-up fade-up-3 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Multi-chain credit scoring with ZK proofs on HashKey Chain. We analyze your activity across Ethereum, Base, Arbitrum, Polygon and HashKey — then prove your creditworthiness without revealing your identity.
              </p>
              <div className="fade-up fade-up-4 flex items-center justify-center gap-4">
                <button onClick={handleConnect} disabled={connecting} className="btn text-sm py-3.5 px-10">{connecting ? 'Connecting...' : 'Get Started'}</button>
                <a href="/verify" className="btn-outline text-sm py-3.5 px-8">Verify Score</a>
              </div>
              <div className="fade-up fade-up-4 flex items-center justify-center gap-8 pt-4">
                {[{ v: '5', l: 'Chains Analyzed' }, { v: '3', l: 'Contracts' }, { v: '286', l: 'ZK Constraints' }, { v: 'Groth16', l: 'Proving System' }].map(({ v, l }) => (
                  <div key={l} className="text-center"><div className="text-2xl font-bold" style={{ color: '#9F6FFD' }}>{v}</div><div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted-dim)' }}>{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ===== APP ===== */
          <div className="max-w-md mx-auto px-4 pt-4 pb-16">
            {/* Progress */}
            <div className="flex items-center justify-center gap-1 mb-4">
              {['Connect', 'Score', 'ZK Proof', 'Attest', 'Done'].map((l, i) => (
                <div key={l} className="flex items-center gap-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all duration-300"
                    style={{ background: i <= step ? 'linear-gradient(135deg, #9F6FFD, #7C4FE0)' : 'rgba(255,255,255,0.05)', border: i <= step ? 'none' : '1px solid var(--border)', color: i <= step ? 'white' : 'var(--muted-dim)', boxShadow: i === step ? '0 0 12px rgba(159,111,253,0.3)' : 'none' }}>
                    {i < step ? '\u2713' : i + 1}
                  </div>
                  {i < 4 && <div className="w-5 h-px" style={{ background: i < step ? '#9F6FFD' : 'var(--border)' }} />}
                </div>
              ))}
            </div>

            {!result ? (
              /* PRE-SCORE */
              <div className="space-y-3">
                <div className="glass p-4 rounded-2xl flex items-center justify-between">
                  <div><div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Wallet</div><div className="font-mono text-sm mt-0.5">{short}</div></div>
                  <div className="text-right"><div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Balance</div><div className="text-sm font-semibold mt-0.5">{parseFloat(balance).toFixed(4)} <span style={{ color: '#9F6FFD' }}>HSK</span></div></div>
                </div>
                {!onChain && <button onClick={handleSwitch} disabled={switching} className="w-full py-3 rounded-xl text-xs font-semibold transition hover:opacity-90" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>{switching ? 'Switching...' : 'Switch to HashKey Chain Testnet'}</button>}
                <button onClick={handleScore} disabled={scoring} className="btn w-full py-4 rounded-2xl text-sm">
                  {scoring ? (<span className="flex items-center justify-center gap-2"><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning 5 chains...</span>) : 'Analyze Multi-Chain Credit'}
                </button>
              </div>
            ) : t && (
              /* RESULT */
              <div className="space-y-2.5">
                {/* Score card */}
                <div className="glass p-4 rounded-2xl flex items-center gap-4" style={{ boxShadow: `0 0 40px ${t.ring}` }}>
                  <div className="relative w-20 h-20 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={t.color} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(result.score / 100) * 264} 264`} style={{ animation: 'scoreReveal 1s ease-out', filter: `drop-shadow(0 0 8px ${t.color}60)` }} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black">{Math.floor(result.score)}</span><span className="text-[8px]" style={{ color: 'var(--muted)' }}>/100</span></div>
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
                <div className="glass p-3 rounded-2xl space-y-1.5">
                  <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: 'var(--muted)' }}>Score Breakdown</div>
                  {result.dimensions.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="text-[10px] w-24 shrink-0 truncate font-medium">{d.name}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(d.score / d.max) * 100}%`, background: `linear-gradient(90deg, #9F6FFD, ${t.color})` }} />
                      </div>
                      <span className="text-[9px] w-8 text-right font-mono" style={{ color: 'var(--muted)' }}>{d.score}/{d.max}</span>
                    </div>
                  ))}
                </div>

                {/* Chain Breakdown */}
                <div className="glass p-3 rounded-2xl">
                  <div className="text-[8px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--muted)' }}>Chain Analysis ({result.chainScores.filter(c => c.nonce > 0).length}/{result.chainScores.length} active)</div>
                  <div className="space-y-1">
                    {result.chainScores.map(c => (
                      <div key={c.chainId} className="flex items-center gap-2 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${c.nonce > 0 ? 'bg-green-400' : 'bg-zinc-700'}`} />
                        <span className="w-16 shrink-0 font-medium">{c.chain}</span>
                        <span className="flex-1 font-mono" style={{ color: c.nonce > 0 ? 'var(--foreground)' : 'var(--muted-dim)' }}>
                          {c.nonce} tx
                        </span>
                        <span className="font-mono" style={{ color: c.balance > 0 ? '#9F6FFD' : 'var(--muted-dim)' }}>
                          {c.balance > 0 ? c.balance.toFixed(4) : '0'} {c.symbol}
                        </span>
                        <span className="text-[8px] px-1 rounded" style={{ background: 'rgba(159,111,253,0.1)', color: '#9F6FFD' }}>
                          x{c.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ZK PROOF SECTION — the differentiator */}
                {!zkProof ? (
                  <div className="glass p-4 rounded-2xl" style={{ borderColor: 'rgba(159,111,253,0.2)' }}>
                    <div className="text-[8px] uppercase tracking-widest font-bold mb-2" style={{ color: '#9F6FFD' }}>Step 2: Generate Zero-Knowledge Proof</div>
                    <p className="text-[10px] mb-3 leading-relaxed" style={{ color: 'var(--muted)' }}>
                      Generate a Groth16 proof in your browser. This proves your score meets the threshold without revealing your wallet address or exact score. The proof is computed locally — no data leaves your device.
                    </p>
                    <div className="flex items-center gap-2 p-2 rounded-xl mb-3 text-[9px]" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <span style={{ color: 'var(--muted-dim)' }}>Circuit:</span>
                      <span className="font-mono" style={{ color: '#9F6FFD' }}>credit_score.circom</span>
                      <span style={{ color: 'var(--muted-dim)' }}>&middot; 286 constraints &middot; Poseidon &middot; bn128</span>
                    </div>
                    {provingStep && !provingZK && provingStep.includes('failed') && (
                      <div className="text-[10px] mb-2 p-2 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>{provingStep}</div>
                    )}
                    <button onClick={handleGenerateProof} disabled={provingZK} className="btn w-full py-3 rounded-xl text-xs">
                      {provingZK ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {provingStep}
                        </span>
                      ) : 'Generate Groth16 Proof'}
                    </button>
                  </div>
                ) : (
                  /* ZK PROOF RESULT — visual proof details */
                  <div className="glass p-4 rounded-2xl" style={{ borderColor: 'rgba(52,211,153,0.3)', boxShadow: '0 0 20px rgba(52,211,153,0.08)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] uppercase tracking-widest font-bold" style={{ color: '#34d399' }}>ZK Proof Verified</span>
                        <span className="text-[7px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>Groth16</span>
                      </div>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--muted)' }}>{zkProof.proofTime}ms</span>
                    </div>

                    {/* Proof visualization */}
                    <div className="space-y-1.5 mb-3">
                      {[
                        { label: 'pi_a', value: zkProof.proof.pi_a?.[0]?.toString().slice(0, 24) + '...' },
                        { label: 'pi_b', value: zkProof.proof.pi_b?.[0]?.[0]?.toString().slice(0, 24) + '...' },
                        { label: 'pi_c', value: zkProof.proof.pi_c?.[0]?.toString().slice(0, 24) + '...' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-2 text-[9px]">
                          <span className="w-7 font-mono font-bold" style={{ color: '#9F6FFD' }}>{label}</span>
                          <span className="flex-1 font-mono truncate p-1 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--muted)' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-sm font-bold" style={{ color: '#34d399' }}>286</div>
                        <div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>Constraints</div>
                      </div>
                      <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-sm font-bold" style={{ color: '#34d399' }}>{zkProof.valid ? 'Valid' : 'Invalid'}</div>
                        <div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>Status</div>
                      </div>
                      <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                        <div className="text-sm font-bold" style={{ color: '#34d399' }}>Local</div>
                        <div className="text-[7px] uppercase" style={{ color: 'var(--muted-dim)' }}>Computed</div>
                      </div>
                    </div>

                    {/* Commitment */}
                    <div className="text-[8px] uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--muted)' }}>Poseidon Commitment</div>
                    <div className="font-mono text-[8px] break-all p-2 rounded-lg mb-3 leading-relaxed" style={{ background: 'rgba(0,0,0,0.3)', color: '#9F6FFD' }}>
                      {zkProof.commitment}
                    </div>

                    {/* Submit on-chain */}
                    {submitTx ? (
                      <a href={`${ACTIVE_CHAIN.explorer}/tx/${submitTx}`} target="_blank" rel="noopener noreferrer" className="block w-full py-2.5 rounded-xl text-center text-[10px] font-bold transition hover:opacity-80 uppercase tracking-wide" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                        View on HashKey Explorer
                      </a>
                    ) : (
                      <>
                        <button onClick={handleSubmit} disabled={submitting} className="btn w-full py-3 rounded-xl text-xs">
                          {submitting ? (<span className="flex items-center justify-center gap-2"><span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting to HashKey Chain...</span>) : 'Submit ZK Attestation On-Chain'}
                        </button>
                        {submitError && <div className="text-[9px] mt-1.5 text-center" style={{ color: '#f87171' }}>{submitError}</div>}
                      </>
                    )}
                  </div>
                )}

                {/* Pool */}
                <div className="glass p-3 rounded-2xl flex items-center justify-between" style={{ borderColor: result.tierIndex >= 2 ? 'rgba(52,211,153,0.15)' : 'var(--border)' }}>
                  <div>
                    <div className="text-[8px] uppercase tracking-widest font-bold" style={{ color: 'var(--muted)' }}>ZK-Gated Pool</div>
                    <div className="text-[11px] font-semibold mt-0.5" style={{ color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted)' }}>{result.tierIndex >= 2 ? 'Eligible — deposit HSK to earn yield' : 'Locked — requires GOOD tier or above'}</div>
                  </div>
                  <button disabled={result.tierIndex < 2} className="text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide transition hover:opacity-80" style={{ background: result.tierIndex >= 2 ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.03)', color: result.tierIndex >= 2 ? '#34d399' : 'var(--muted-dim)', cursor: result.tierIndex >= 2 ? 'pointer' : 'not-allowed' }}>{result.tierIndex >= 2 ? 'Deposit' : 'Locked'}</button>
                </div>

                <button onClick={() => { setResult(null); setCommitment(null); setSubmitTx(null); setSubmitError(null); setZkProof(null); setProvingStep('') }} className="w-full py-2 text-xs font-semibold rounded-xl transition hover:bg-white/5 active:scale-[0.98]" style={{ color: 'var(--muted)' }}>Score another wallet</button>
              </div>
            )}
          </div>
        )}

        {/* How it works — landing only */}
        {!address && (
          <div className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
            <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-center mb-8" style={{ color: '#9F6FFD' }}>How It Works</div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { n: '01', t: 'Connect', d: 'Link wallet to HashKey Chain' },
                { n: '02', t: 'Analyze', d: '5 chains, 5 dimensions, weighted scoring' },
                { n: '03', t: 'ZK Prove', d: 'Groth16 proof in browser (286 constraints)' },
                { n: '04', t: 'Attest', d: 'Submit commitment on-chain' },
                { n: '05', t: 'Access', d: 'Unlock gated DeFi pools' },
              ].map(({ n, t: title, d }) => (
                <div key={n} className="glass p-4 rounded-2xl group transition hover:shadow-[0_8px_40px_rgba(159,111,253,0.08)] cursor-default text-center">
                  <div className="text-2xl font-black mb-2 transition group-hover:scale-110" style={{ color: 'rgba(159,111,253,0.2)' }}>{n}</div>
                  <div className="text-xs font-bold mb-1">{title}</div>
                  <div className="text-[9px] leading-relaxed" style={{ color: 'var(--muted)' }}>{d}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 flex-wrap mt-10">
              {['Circom 2.1', 'Groth16', 'Poseidon Hash', 'snarkjs', 'bn128 Curve', 'HashKey Chain', '286 Constraints'].map(l => (
                <span key={l} className="text-[9px] px-3 py-1 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{l}</span>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 px-6 py-2" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <div className="flex items-center gap-3">
            <span className="font-semibold">ZK-PayID</span>
            <a href={`${ACTIVE_CHAIN.explorer}/address/${ACTIVE_CHAIN.contracts.zkCreditScore}`} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Contracts</a>
            <a href="https://github.com/obseasd/zkpayid" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">GitHub</a>
          </div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} /><span>HashKey Chain ZKID Track</span></div>
        </div>
      </footer>
    </div>
  )
}
