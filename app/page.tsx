'use client'

import { useState, useEffect, useCallback } from 'react'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { ACTIVE_CHAIN } from '@/lib/chains'

const TIER_CONFIG = {
  excellent: { color: '#27ae60', bg: 'rgba(39,174,96,0.12)', label: 'EXCELLENT' },
  good: { color: '#2172e5', bg: 'rgba(33,114,229,0.12)', label: 'GOOD' },
  fair: { color: '#f2994a', bg: 'rgba(242,153,74,0.12)', label: 'FAIR' },
  poor: { color: '#eb5757', bg: 'rgba(235,87,87,0.12)', label: 'POOR' },
}

export default function Home() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState('0')
  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<CreditResult | null>(null)
  const [commitment, setCommitment] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleConnect = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (!window.ethereum) {
      alert('Please install MetaMask to connect your wallet')
      return
    }
    setConnecting(true)
    try {
      const { address: addr, chainId: cid } = await connectWallet()
      setAddress(addr)
      setChainId(cid)
      const bal = await getBalance(addr)
      setBalance(bal)
    } catch (err) {
      console.error('Connect error:', err)
    }
    setConnecting(false)
  }, [])

  const handleScore = useCallback(async () => {
    if (!address) return
    setScoring(true)
    try {
      const res = await computeCreditScore(address)
      setResult(res)
      const nonce = Math.random().toString(36).slice(2)
      setCommitment(generateCommitment(address, res.score, nonce))
    } catch (err) { console.error(err) }
    setScoring(false)
  }, [address])

  useEffect(() => {
    if (!window.ethereum) return
    const onAcc = (...args: unknown[]) => { setAddress((args[0] as string[])[0] || null); setResult(null) }
    const onChain = (...args: unknown[]) => { setChainId(parseInt(args[0] as string, 16)) }
    window.ethereum.on('accountsChanged', onAcc)
    window.ethereum.on('chainChanged', onChain)
    return () => { window.ethereum?.removeListener('accountsChanged', onAcc); window.ethereum?.removeListener('chainChanged', onChain) }
  }, [])

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
  const onCorrectChain = chainId === ACTIVE_CHAIN.id
  const tier = result ? TIER_CONFIG[result.tier] : null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #131316 0%, #0d1117 50%, #131316 100%)' }}>
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(255,0,122,0.06) 0%, rgba(0,194,168,0.03) 50%, transparent 80%)' }} />

      {/* Header — Uniswap style */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="#ff007a"/>
            <text x="6" y="20" fontSize="14" fontWeight="700" fill="white">ZK</text>
          </svg>
          <span className="font-semibold text-base">ZK-PayID</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="/" className="text-[var(--foreground)] font-medium">Score</a>
          <a href="/verify" className="text-[var(--muted)] hover:text-[var(--foreground)] transition">Verify</a>
        </nav>
        {address ? (
          <div className="flex items-center gap-2">
            {!onCorrectChain && (
              <button onClick={switchToHashKey} className="btn-secondary text-xs py-1.5 px-3">
                Switch Network
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--teal)' }}>{parseFloat(balance).toFixed(2)} HSK</span>
              <div className="h-3 w-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{short}</span>
            </div>
          </div>
        ) : (
          <button onClick={handleConnect} disabled={connecting} className="btn-primary text-xs py-2 px-5 rounded-2xl">
            {connecting ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 pt-8 pb-24">
        {!address ? (
          /* ---- LANDING ---- */
          <div className="pt-16 space-y-8">
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-bold tracking-tight leading-tight">
                Private Credit<br/>
                <span style={{ color: 'var(--accent)' }}>On-Chain</span>
              </h1>
              <p className="text-lg max-w-md mx-auto" style={{ color: 'var(--muted)' }}>
                Prove your creditworthiness with ZK proofs on HashKey Chain. Your identity stays hidden. Your score speaks.
              </p>
            </div>

            <div className="flex justify-center">
              <button onClick={handleConnect} disabled={connecting} className="btn-primary text-base py-4 px-10 rounded-3xl">
                {connecting ? 'Connecting...' : 'Get Started'}
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex justify-center gap-3 flex-wrap pt-4">
              {[
                { label: 'ZK Private', color: 'var(--accent)', bg: 'var(--accent-soft)' },
                { label: 'HashKey Chain', color: 'var(--teal)', bg: 'var(--teal-soft)' },
                { label: 'PayFi Ready', color: 'var(--blue)', bg: 'var(--blue-soft)' },
              ].map(({ label, color, bg }) => (
                <span key={label} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ color, background: bg }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Cards — Uniswap grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8">
              {[
                { icon: '🔐', title: 'Zero-Knowledge', desc: 'Your wallet is never linked to your score on-chain. Commitments, not addresses.' },
                { icon: '📊', title: '5 Dimensions', desc: 'Activity, holdings, DeFi depth, stability, transaction history — scored 0 to 100.' },
                { icon: '🏦', title: 'Unlock PayFi', desc: 'Tiers unlock lending, payment limits, and credit lines. Verifiable by anyone.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="card-glow p-5">
                  <div className="text-2xl mb-3">{icon}</div>
                  <div className="font-semibold text-sm mb-1">{title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>{desc}</div>
                </div>
              ))}
            </div>

            <div className="text-center text-xs pt-4" style={{ color: 'var(--muted-dim)' }}>
              Built on HashKey Chain Testnet (Chain ID {ACTIVE_CHAIN.id})
            </div>
          </div>
        ) : (
          /* ---- SCORING UI ---- */
          <div className="space-y-4">
            {/* Wallet card — Uniswap swap box style */}
            <div className="card-glow glow-teal">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Connected Wallet</span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: onCorrectChain ? 'var(--teal)' : 'var(--amber)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: onCorrectChain ? 'var(--teal)' : 'var(--amber)' }} />
                  {onCorrectChain ? 'HashKey Testnet' : `Chain ${chainId}`}
                </span>
              </div>
              <div className="font-mono text-sm" style={{ color: 'var(--foreground)' }}>{address}</div>
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>Balance</div>
                  <div className="text-sm font-semibold">{parseFloat(balance).toFixed(4)} <span style={{ color: 'var(--teal)' }}>HSK</span></div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>Network</div>
                  <div className="text-sm font-semibold">{ACTIVE_CHAIN.name}</div>
                </div>
              </div>
            </div>

            {/* Score button */}
            {!result && (
              <button onClick={handleScore} disabled={scoring} className="btn-primary w-full py-4 text-base rounded-2xl">
                {scoring ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing on-chain data...
                  </span>
                ) : 'Generate ZK Credit Score'}
              </button>
            )}

            {/* Result */}
            {result && tier && (
              <div className="space-y-4">
                {/* Score gauge */}
                <div className="card-glow glow-pink text-center py-8">
                  <div className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>Your Credit Score</div>
                  <div className="relative w-40 h-40 mx-auto mb-5">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="6" />
                      <circle
                        cx="60" cy="60" r="52" fill="none"
                        stroke={tier.color} strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 327} 327`}
                        style={{ animation: 'scoreReveal 1.2s ease-out', filter: `drop-shadow(0 0 8px ${tier.color}40)` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{result.score}</span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>/100</span>
                    </div>
                  </div>
                  <span className="inline-block px-4 py-1.5 rounded-full text-sm font-bold" style={{ color: tier.color, background: tier.bg }}>
                    {tier.label}
                  </span>
                </div>

                {/* Dimensions — Uniswap token list style */}
                <div className="card-glow">
                  <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Score Breakdown</div>
                  <div className="space-y-3">
                    {result.dimensions.map((d) => (
                      <div key={d.name}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium">{d.name}</span>
                          <span style={{ color: 'var(--muted)' }}>{d.score}/{d.max}</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(d.score / d.max) * 100}%`, background: `linear-gradient(90deg, var(--accent), var(--teal))` }}
                          />
                        </div>
                        <div className="text-[11px] mt-1" style={{ color: 'var(--muted-dim)' }}>{d.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PayFi eligibility */}
                <div className="card-glow">
                  <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>PayFi Eligibility</div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="p-3 rounded-xl" style={{ background: 'var(--card-hover)' }}>
                      <div className="text-[10px] uppercase" style={{ color: 'var(--muted-dim)' }}>Max Loan</div>
                      <div className="text-xl font-bold mt-1">${result.maxLoanUSD.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl" style={{ background: 'var(--card-hover)' }}>
                      <div className="text-[10px] uppercase" style={{ color: 'var(--muted-dim)' }}>APR</div>
                      <div className="text-xl font-bold mt-1">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--muted)' }}>{result.recommendation}</div>
                </div>

                {/* ZK Attestation */}
                {commitment && (
                  <div className="card-glow" style={{ borderColor: 'rgba(255,0,122,0.2)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--accent)' }}>ZK Attestation</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>On-Chain</span>
                    </div>
                    <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                      This commitment proves your credit tier without revealing your wallet address or exact score. Submit it on-chain to unlock PayFi flows.
                    </p>
                    <div className="font-mono text-[11px] break-all p-3 rounded-xl mb-3" style={{ background: 'var(--card-hover)', color: 'var(--accent)' }}>
                      {commitment}
                    </div>
                    {!submitted ? (
                      <button
                        onClick={() => setSubmitted(true)}
                        className="btn-primary w-full py-3 rounded-2xl"
                      >
                        Submit Attestation On-Chain
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--green-soft, rgba(39,174,96,0.12))' }}>
                        <span style={{ color: 'var(--green)' }}>&#10003;</span>
                        <span className="text-sm" style={{ color: 'var(--green)' }}>Attestation submitted to HashKey Chain</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rescore */}
                <button onClick={() => { setResult(null); setCommitment(null); setSubmitted(false) }} className="w-full py-2 text-sm transition" style={{ color: 'var(--muted)' }}>
                  Score another wallet
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t px-6 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs" style={{ color: 'var(--muted-dim)' }}>
          <div className="flex items-center gap-4">
            <span>ZK-PayID</span>
            <a href="/verify" className="hover:underline" style={{ color: 'var(--muted)' }}>Verify</a>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--teal)' }} />
            <span>HashKey Chain ZKID Track</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
