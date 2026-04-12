'use client'

import { useState, useEffect, useCallback } from 'react'
import { connectWallet, switchToHashKey, getBalance } from '@/lib/wallet'
import { computeCreditScore, generateCommitment, type CreditResult } from '@/lib/credit-score'
import { ACTIVE_CHAIN } from '@/lib/chains'

export default function Home() {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [balance, setBalance] = useState<string>('0')
  const [scoring, setScoring] = useState(false)
  const [result, setResult] = useState<CreditResult | null>(null)
  const [commitment, setCommitment] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    try {
      const { address: addr, chainId: cid } = await connectWallet()
      setAddress(addr)
      setChainId(cid)
      const bal = await getBalance(addr)
      setBalance(bal)
    } catch (err) {
      console.error(err)
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
      const comm = generateCommitment(address, res.score, nonce)
      setCommitment(comm)
    } catch (err) {
      console.error(err)
    }
    setScoring(false)
  }, [address])

  useEffect(() => {
    if (!window.ethereum) return
    const onAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      if (accounts[0]) {
        setAddress(accounts[0])
        setResult(null)
      }
    }
    const onChainChanged = (...args: unknown[]) => {
      setChainId(parseInt(args[0] as string, 16))
    }
    window.ethereum.on('accountsChanged', onAccountsChanged)
    window.ethereum.on('chainChanged', onChainChanged)
    return () => {
      window.ethereum?.removeListener('accountsChanged', onAccountsChanged)
      window.ethereum?.removeListener('chainChanged', onChainChanged)
    }
  }, [])

  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null
  const isCorrectChain = chainId === ACTIVE_CHAIN.id

  const tierColors = {
    excellent: 'from-emerald-500 to-green-400',
    good: 'from-blue-500 to-cyan-400',
    fair: 'from-amber-500 to-yellow-400',
    poor: 'from-red-500 to-orange-400',
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-sm font-bold">ZK</div>
          <div>
            <span className="font-semibold text-lg">ZK-PayID</span>
            <span className="text-xs text-zinc-500 ml-2">HashKey Chain</span>
          </div>
        </div>
        {address ? (
          <div className="flex items-center gap-3">
            {!isCorrectChain && (
              <button onClick={switchToHashKey} className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition">
                Switch to HashKey
              </button>
            )}
            <span className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 font-mono text-zinc-400">{shortAddr}</span>
          </div>
        ) : (
          <button onClick={handleConnect} disabled={connecting} className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition disabled:opacity-50">
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {!address ? (
          /* Landing */
          <div className="text-center py-20 space-y-6">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-4xl font-bold mx-auto">ZK</div>
            <h1 className="text-4xl font-bold tracking-tight">ZK-PayID</h1>
            <p className="text-zinc-400 max-w-md mx-auto text-lg">
              Private credit scoring on HashKey Chain. Prove your creditworthiness with zero-knowledge proofs — without revealing your identity.
            </p>
            <div className="flex flex-col items-center gap-3 pt-4">
              <button onClick={handleConnect} disabled={connecting} className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium text-lg transition disabled:opacity-50">
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
              <span className="text-xs text-zinc-600">Supports MetaMask on HashKey Chain Testnet</span>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-12 text-left">
              {[
                { icon: '🔒', title: 'Private', desc: 'Your identity is never linked to your score on-chain' },
                { icon: '📊', title: '5-Dimension', desc: 'Activity, holdings, DeFi engagement, stability, history' },
                { icon: '🏦', title: 'PayFi Ready', desc: 'Score unlocks lending, payments, and credit lines' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className="font-medium text-sm mb-1">{title}</div>
                  <div className="text-xs text-zinc-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Dashboard */
          <div className="space-y-6">
            {/* Wallet info */}
            <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Connected Wallet</div>
                  <div className="font-mono text-sm mt-1">{address}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Balance</div>
                  <div className="font-mono text-sm mt-1">{parseFloat(balance).toFixed(4)} HSK</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className={`w-2 h-2 rounded-full ${isCorrectChain ? 'bg-green-400' : 'bg-amber-400'}`} />
                <span className="text-xs text-zinc-500">{isCorrectChain ? 'HashKey Chain Testnet' : `Chain ${chainId} — switch to HashKey`}</span>
              </div>
            </div>

            {/* Score button */}
            {!result && (
              <button
                onClick={handleScore}
                disabled={scoring}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 font-medium text-lg transition disabled:opacity-50"
              >
                {scoring ? 'Analyzing on-chain data...' : 'Generate ZK Credit Score'}
              </button>
            )}

            {/* Score result */}
            {result && (
              <div className="space-y-5">
                {/* Score gauge */}
                <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Your Credit Score</div>
                  <div className="relative w-36 h-36 mx-auto mb-4">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#3f3f46" strokeWidth="8" />
                      <circle
                        cx="60" cy="60" r="50" fill="none"
                        stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${(result.score / 100) * 314} 314`}
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{result.score}</span>
                      <span className="text-xs text-zinc-500">/100</span>
                    </div>
                  </div>
                  <div className={`inline-block px-4 py-1.5 rounded-full bg-gradient-to-r ${tierColors[result.tier]} text-sm font-bold text-white`}>
                    {result.tier.toUpperCase()}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Score Breakdown</div>
                  {result.dimensions.map((d) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{d.name}</span>
                        <span className="text-zinc-400">{d.score}/{d.max}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all"
                          style={{ width: `${(d.score / d.max) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-zinc-600 mt-0.5">{d.detail}</div>
                    </div>
                  ))}
                </div>

                {/* PayFi eligibility */}
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">PayFi Eligibility</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-zinc-500">Max Loan</div>
                      <div className="text-lg font-bold">${result.maxLoanUSD.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Suggested APR</div>
                      <div className="text-lg font-bold">{(result.suggestedAPR / 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">{result.recommendation}</div>
                </div>

                {/* ZK Commitment */}
                {commitment && (
                  <div className="p-5 rounded-2xl bg-violet-500/10 border border-violet-500/30 space-y-3">
                    <div className="text-xs text-violet-400 uppercase tracking-wider">ZK Attestation</div>
                    <div className="text-xs text-zinc-500">
                      This commitment proves your credit tier without revealing your address or exact score.
                      Submit it on-chain to unlock PayFi flows.
                    </div>
                    <div className="font-mono text-xs break-all text-violet-300 bg-zinc-900 p-3 rounded-lg">
                      {commitment}
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-medium transition">
                      Submit ZK Attestation On-Chain
                    </button>
                  </div>
                )}

                {/* Rescore */}
                <button onClick={() => { setResult(null); setCommitment(null) }} className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition">
                  Rescore wallet
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-6 py-4 mt-12">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-zinc-600">
          <span>ZK-PayID for HashKey Chain Horizon Hackathon</span>
          <span>ZKID Track</span>
        </div>
      </footer>
    </div>
  )
}
