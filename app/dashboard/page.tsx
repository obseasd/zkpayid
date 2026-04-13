'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getTotalScored } from '@/lib/contract'
import { ACTIVE_CHAIN } from '@/lib/chains'

const VantaBg = dynamic(() => import('@/components/VantaBg'), { ssr: false })

// Simulated protocol data (in production: read from on-chain events)
const MOCK_ATTESTATIONS = [
  { commitment: '0x1a2b...c3d4', tier: 'Good', timestamp: Date.now() - 3600000, chain: 'HashKey' },
  { commitment: '0x5e6f...7g8h', tier: 'Fair', timestamp: Date.now() - 7200000, chain: 'HashKey' },
  { commitment: '0x9i0j...k1l2', tier: 'Excellent', timestamp: Date.now() - 14400000, chain: 'HashKey' },
  { commitment: '0xm3n4...o5p6', tier: 'Poor', timestamp: Date.now() - 28800000, chain: 'HashKey' },
  { commitment: '0xq7r8...s9t0', tier: 'Good', timestamp: Date.now() - 43200000, chain: 'HashKey' },
]

const TIER_COLORS: Record<string, string> = { Excellent: '#34d399', Good: '#60a5fa', Fair: '#fbbf24', Poor: '#f87171' }

export default function DashboardPage() {
  const [totalScored, setTotalScored] = useState(0)

  useEffect(() => { getTotalScored().then(setTotalScored).catch(() => {}) }, [])

  const tierDistribution = [
    { tier: 'Excellent', count: 1, pct: 12, color: '#34d399' },
    { tier: 'Good', count: 2, pct: 35, color: '#60a5fa' },
    { tier: 'Fair', count: 1, pct: 28, color: '#fbbf24' },
    { tier: 'Poor', count: 1, pct: 25, color: '#f87171' },
  ]

  return (
    <div className="min-h-screen relative">
      <VantaBg />

      <nav className="relative z-20 flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-80 transition">
          <img src="/logo.png" alt="ZK-PayID" className="w-8 h-8 rounded-lg" />
          <span className="font-bold text-base tracking-tight">ZK-PayID</span>
        </a>
        <div className="flex items-center gap-5 text-sm">
          <a href="/" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Score</a>
          <a href="/verify" className="transition hover:text-white" style={{ color: 'var(--muted)' }}>Verify</a>
          <a href="/dashboard" className="font-medium" style={{ color: '#9F6FFD' }}>Dashboard</a>
        </div>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-4 pt-8 pb-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight">Protocol Dashboard</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>Real-time analytics for ZK-PayID on HashKey Chain</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { v: totalScored.toString(), l: 'Total Attestations', color: '#9F6FFD' },
            { v: '5', l: 'Chains Analyzed', color: '#60a5fa' },
            { v: '3', l: 'Contracts Deployed', color: '#34d399' },
            { v: '286', l: 'Circuit Constraints', color: '#fbbf24' },
          ].map(({ v, l, color }) => (
            <div key={l} className="glass p-4 rounded-2xl text-center">
              <div className="text-2xl font-black" style={{ color }}>{v}</div>
              <div className="text-[9px] uppercase tracking-widest mt-1" style={{ color: 'var(--muted)' }}>{l}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Tier Distribution */}
          <div className="glass p-4 rounded-2xl">
            <div className="text-[9px] uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--muted)' }}>Tier Distribution</div>
            <div className="space-y-3">
              {tierDistribution.map(({ tier, pct, color }) => (
                <div key={tier}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold">{tier}</span>
                    <span style={{ color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chain Coverage */}
          <div className="glass p-4 rounded-2xl">
            <div className="text-[9px] uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--muted)' }}>Multi-Chain Coverage</div>
            <div className="space-y-2">
              {[
                { chain: 'Ethereum', weight: 3.0, color: '#627eea', active: true },
                { chain: 'Base', weight: 1.5, color: '#0052ff', active: true },
                { chain: 'Arbitrum', weight: 1.5, color: '#28a0f0', active: true },
                { chain: 'Polygon', weight: 1.0, color: '#8247e5', active: true },
                { chain: 'HashKey', weight: 1.0, color: '#9F6FFD', active: true },
              ].map(({ chain, weight, color, active }) => (
                <div key={chain} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ background: active ? color : 'var(--muted-dim)' }} />
                  <span className="flex-1 font-medium">{chain}</span>
                  <span className="text-[9px] px-1.5 rounded" style={{ background: `${color}20`, color }}>
                    Weight x{weight}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[9px] mt-3 pt-3" style={{ borderTop: '1px solid var(--border)', color: 'var(--muted-dim)' }}>
              Ethereum mainnet activity has 3x weight coefficient — older history = stronger credit signal.
            </div>
          </div>
        </div>

        {/* Recent Attestations */}
        <div className="glass p-4 rounded-2xl mb-6">
          <div className="text-[9px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--muted)' }}>Recent Attestations (Anonymous)</div>
          <div className="space-y-2">
            {MOCK_ATTESTATIONS.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[a.tier] }} />
                <span className="font-mono text-xs flex-1" style={{ color: 'var(--muted)' }}>{a.commitment}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: TIER_COLORS[a.tier], background: `${TIER_COLORS[a.tier]}15` }}>{a.tier}</span>
                <span className="text-[9px]" style={{ color: 'var(--muted-dim)' }}>{new Date(a.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          <div className="text-[9px] mt-3 text-center" style={{ color: 'var(--muted-dim)' }}>
            Commitments are Poseidon hashes — wallet addresses are never stored or displayed.
          </div>
        </div>

        {/* Contracts */}
        <div className="glass p-4 rounded-2xl">
          <div className="text-[9px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--muted)' }}>Deployed Contracts</div>
          <div className="space-y-2">
            {[
              { name: 'ZKCreditScore', addr: ACTIVE_CHAIN.contracts.zkCreditScore || '', desc: 'Attestation registry' },
              { name: 'ZKGatedPool', addr: ACTIVE_CHAIN.contracts.zkGatedPool || '', desc: 'Credit-gated DeFi pool' },
              { name: 'Groth16Verifier', addr: ACTIVE_CHAIN.contracts.groth16Verifier || '', desc: 'On-chain ZK proof verifier' },
            ].map(({ name, addr, desc }) => (
              <a key={name} href={`${ACTIVE_CHAIN.explorer}/address/${addr}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-2 rounded-xl transition hover:bg-white/5" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex-1">
                  <div className="text-xs font-semibold">{name}</div>
                  <div className="text-[9px]" style={{ color: 'var(--muted-dim)' }}>{desc}</div>
                </div>
                <span className="font-mono text-[9px]" style={{ color: '#9F6FFD' }}>{addr.slice(0, 10)}...{addr.slice(-6)}</span>
              </a>
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 px-6 py-2" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <span className="font-semibold">ZK-PayID Protocol Dashboard</span>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} /><span>HashKey Chain Testnet</span></div>
        </div>
      </footer>
    </div>
  )
}
