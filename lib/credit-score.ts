import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from './chains'

export interface CreditDimension {
  name: string
  score: number
  max: number
  detail: string
  weight: number
}

export interface CreditResult {
  address: string
  score: number
  tier: 'excellent' | 'good' | 'fair' | 'poor'
  tierIndex: number
  dimensions: CreditDimension[]
  maxLoanUSD: number
  suggestedAPR: number
  recommendation: string
  timestamp: number
}

const TIERS = [
  { name: 'poor' as const, min: 0, maxLoan: 0, apr: 1500 },
  { name: 'fair' as const, min: 30, maxLoan: 500, apr: 1000 },
  { name: 'good' as const, min: 60, maxLoan: 5000, apr: 500 },
  { name: 'excellent' as const, min: 80, maxLoan: 50000, apr: 350 },
]

export async function computeCreditScore(address: string): Promise<CreditResult> {
  const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc)

  // Dimension 1: Wallet Age (estimate from nonce)
  const nonce = await provider.getTransactionCount(address)
  const ageScore = Math.min(nonce * 2, 20)

  // Dimension 2: Transaction Count
  const txScore = Math.min(nonce, 20)

  // Dimension 3: Balance (native token)
  const balance = await provider.getBalance(address)
  const balanceEth = parseFloat(ethers.formatEther(balance))
  const balanceScore = Math.min(balanceEth * 2, 20)

  // Dimension 4: Contract Interaction (heuristic: nonce > 10 = interacts with DeFi)
  const defiScore = nonce > 50 ? 20 : nonce > 20 ? 15 : nonce > 10 ? 10 : nonce > 5 ? 5 : 0

  // Dimension 5: Balance Stability (heuristic: higher balance = more stable)
  const stabilityScore = balanceEth > 10 ? 20 : balanceEth > 1 ? 15 : balanceEth > 0.1 ? 10 : balanceEth > 0 ? 5 : 0

  const dimensions: CreditDimension[] = [
    { name: 'Wallet Activity', score: ageScore, max: 20, detail: `${nonce} transactions`, weight: 1 },
    { name: 'Transaction History', score: txScore, max: 20, detail: `${nonce} total tx`, weight: 1 },
    { name: 'Holdings', score: balanceScore, max: 20, detail: `${balanceEth.toFixed(4)} ${ACTIVE_CHAIN.nativeSymbol}`, weight: 1 },
    { name: 'DeFi Engagement', score: defiScore, max: 20, detail: nonce > 10 ? 'Active DeFi user' : 'Limited DeFi', weight: 1 },
    { name: 'Balance Stability', score: stabilityScore, max: 20, detail: balanceEth > 1 ? 'Stable' : 'Low stability', weight: 1 },
  ]

  const totalScore = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) * 100) / 100

  const tier = TIERS.slice().reverse().find(t => totalScore >= t.min) || TIERS[0]
  const tierIndex = TIERS.indexOf(tier)

  return {
    address,
    score: totalScore,
    tier: tier.name,
    tierIndex,
    dimensions,
    maxLoanUSD: tier.maxLoan,
    suggestedAPR: tier.apr,
    recommendation: tierIndex >= 3 ? 'Prime borrower — eligible for undercollateralized lending'
      : tierIndex >= 2 ? 'Reliable — standard collateral requirements'
      : tierIndex >= 1 ? 'Moderate risk — higher collateral recommended'
      : 'High risk — lending not recommended',
    timestamp: Date.now(),
  }
}

/// Generate a commitment hash for ZK attestation
/// In production: this would be Poseidon(address, score, nonce)
/// For hackathon: keccak256 as placeholder
export function generateCommitment(address: string, score: number, nonce: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'bytes32'],
      [address, Math.floor(score), ethers.keccak256(ethers.toUtf8Bytes(nonce))]
    )
  )
}
