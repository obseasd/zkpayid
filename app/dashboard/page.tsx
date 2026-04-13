'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { getTotalScored } from '@/lib/contract'
import { ACTIVE_CHAIN } from '@/lib/chains'

const VantaBg = dynamic(() => import('@/components/VantaBg'), { ssr: false })

const MOCK_ATTESTATIONS = [
  { commitment: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef12', tier: 'Good', timestamp: Date.now() - 3600000 },
  { commitment: '0x9876543210fedcba9876543210fedcba98765432', tier: 'Fair', timestamp: Date.now() - 7200000 },
  { commitment: '0xabcdef1234567890abcdef1234567890abcdef12', tier: 'Excellent', timestamp: Date.now() - 14400000 },
  { commitment: '0xdeadbeef00112233445566778899aabbccddeeff', tier: 'Poor', timestamp: Date.now() - 28800000 },
  { commitment: '0x1111222233334444555566667777888899990000', tier: 'Good', timestamp: Date.now() - 43200000 },
]

const TIER_COLORS: Record<string, string> = { Excellent: '#34d399', Good: '#60a5fa', Fair: '#fbbf24', Poor: '#f87171' }

const CHAINS_DATA = [
  { name: 'Ethereum', logo: '/chains/ethereum.png', weight: 3.0, color: '#627eea', desc: 'Mainnet history (highest signal)' },
  { name: 'Base', logo: '/chains/base.png', weight: 1.5, color: '#0052ff', desc: 'L2 activity on Coinbase chain' },
  { name: 'Arbitrum', logo: '/chains/arbitrum.png', weight: 1.5, color: '#28a0f0', desc: 'L2 rollup transactions' },
  { name: 'Polygon', logo: '/chains/polygon.png', weight: 1.0, color: '#8247e5', desc: 'PoS chain engagement' },
  { name: 'HashKey', logo: '/chains/hashkey.png', weight: 1.0, color: '#9F6FFD', desc: 'Target chain (attestation)' },
]

export default function DashboardPage() {
  const [totalScored, setTotalScored] = useState(0)
  useEffect(() => { getTotalScored().then(setTotalScored).catch(() => {}) }, [])

  const tierData = [
    { tier: 'Excellent', pct: 12, color: '#34d399', bg: '#0d2d22' },
    { tier: 'Good', pct: 35, color: '#60a5fa', bg: '#0d1f3a' },
    { tier: 'Fair', pct: 28, color: '#fbbf24', bg: '#2d2410' },
    { tier: 'Poor', pct: 25, color: '#f87171', bg: '#2d1515' },
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

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-6 pb-16">
        <div className="mb-8">
          <h1 className="text-2xl font-black tracking-tight">Protocol Dashboard</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>ZK-PayID analytics on HashKey Chain Testnet</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { v: totalScored, l: 'Attestations', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: '#9F6FFD' },
            { v: 5, l: 'Chains', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', color: '#60a5fa' },
            { v: 3, l: 'Contracts', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4', color: '#34d399' },
            { v: 286, l: 'Constraints', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color: '#fbbf24' },
          ].map(({ v, l, icon, color }) => (
            <div key={l} className="glass p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                  <svg className="w-3.5 h-3.5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
                </div>
                <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--muted)' }}>{l}</span>
              </div>
              <div className="text-3xl font-black" style={{ color }}>{v}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3 mb-5">
          {/* Chain Coverage — 3 cols */}
          <div className="col-span-3 glass p-4 rounded-2xl">
            <div className="text-[9px] uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--muted)' }}>Multi-Chain Scoring Coverage</div>
            <div className="space-y-2.5">
              {CHAINS_DATA.map(({ name, logo, weight, color, desc }) => (
                <div key={name} className="flex items-center gap-3 p-2.5 rounded-xl transition hover:bg-white/[0.02]" style={{ background: 'rgba(0,0,0,0.15)' }}>
                  <img src={logo} alt={name} className="w-7 h-7 rounded-full" style={{ border: `2px solid ${color}40` }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{name}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}20`, color }}>x{weight}</span>
                    </div>
                    <div className="text-[9px]" style={{ color: 'var(--muted-dim)' }}>{desc}</div>
                  </div>
                  {/* Weight bar */}
                  <div className="w-20 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(weight / 3) * 100}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tier Distribution — 2 cols */}
          <div className="col-span-2 glass p-4 rounded-2xl">
            <div className="text-[9px] uppercase tracking-widest font-bold mb-4" style={{ color: 'var(--muted)' }}>Tier Distribution</div>
            <div className="space-y-2">
              {tierData.map(({ tier, pct, color, bg }) => (
                <div key={tier} className="p-2.5 rounded-xl" style={{ background: bg }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                      <span className="text-xs font-bold">{tier}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color }}>{pct}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Donut visualization */}
            <div className="flex justify-center mt-4">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {tierData.reduce((acc, { pct, color }, i) => {
                    const offset = acc.offset
                    const dash = (pct / 100) * 251
                    acc.elements.push(
                      <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={`${dash} ${251 - dash}`} strokeDashoffset={-offset}
                        style={{ filter: `drop-shadow(0 0 4px ${color}40)` }} />
                    )
                    acc.offset += dash
                    return acc
                  }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black">{totalScored}</span>
                  <span className="text-[7px]" style={{ color: 'var(--muted)' }}>total</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Attestations */}
        <div className="glass p-4 rounded-2xl mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--muted)' }}>Recent Attestations</div>
            <span className="text-[8px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(159,111,253,0.1)', color: '#9F6FFD' }}>Anonymous</span>
          </div>
          <div className="overflow-hidden rounded-xl" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>Commitment</th>
                  <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>Tier</th>
                  <th className="text-right py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--muted-dim)' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ATTESTATIONS.map((a, i) => (
                  <tr key={i} className="transition hover:bg-white/[0.02]" style={{ borderBottom: i < MOCK_ATTESTATIONS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td className="py-2.5 px-3 font-mono" style={{ color: 'var(--muted)' }}>{a.commitment.slice(0, 10)}...{a.commitment.slice(-8)}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold px-2 py-0.5 rounded-md text-[9px]" style={{ color: TIER_COLORS[a.tier], background: `${TIER_COLORS[a.tier]}15` }}>{a.tier}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right" style={{ color: 'var(--muted-dim)' }}>{Math.round((Date.now() - a.timestamp) / 3600000)}h ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Contracts */}
        <div className="glass p-4 rounded-2xl">
          <div className="text-[9px] uppercase tracking-widest font-bold mb-3" style={{ color: 'var(--muted)' }}>Deployed Contracts</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'ZKCreditScore', addr: ACTIVE_CHAIN.contracts.zkCreditScore || '', desc: 'Attestation Registry', color: '#9F6FFD' },
              { name: 'ZKGatedPool', addr: ACTIVE_CHAIN.contracts.zkGatedPool || '', desc: 'Credit-Gated Pool', color: '#34d399' },
              { name: 'Groth16Verifier', addr: ACTIVE_CHAIN.contracts.groth16Verifier || '', desc: 'ZK Proof Verifier', color: '#fbbf24' },
            ].map(({ name, addr, desc, color }) => (
              <a key={name} href={`${ACTIVE_CHAIN.explorer}/address/${addr}`} target="_blank" rel="noopener noreferrer"
                className="p-3 rounded-xl transition hover:bg-white/[0.03] group" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
                <div className="text-xs font-bold mb-0.5 group-hover:underline" style={{ color }}>{name}</div>
                <div className="text-[8px] mb-1.5" style={{ color: 'var(--muted-dim)' }}>{desc}</div>
                <div className="font-mono text-[8px]" style={{ color: 'var(--muted)' }}>{addr.slice(0, 8)}...{addr.slice(-6)}</div>
              </a>
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 px-6 py-2" style={{ background: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between text-[9px]" style={{ color: 'var(--muted-dim)' }}>
          <span className="font-semibold">ZK-PayID Protocol</span>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ background: '#9F6FFD' }} /><span>HashKey Chain Testnet (133)</span></div>
        </div>
      </footer>
    </div>
  )
}
