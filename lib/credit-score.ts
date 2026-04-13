import { ethers } from 'ethers'

export interface ChainScore {
  chain: string
  chainId: number
  nonce: number
  balance: number
  symbol: string
  weight: number
}

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
  chainScores: ChainScore[]
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

// Multi-chain RPC config — Ethereum has highest weight (oldest, most established)
const CHAINS = [
  { name: 'Ethereum', chainId: 1, rpc: 'https://eth.drpc.org', symbol: 'ETH', weight: 3.0 },
  { name: 'Base', chainId: 8453, rpc: 'https://mainnet.base.org', symbol: 'ETH', weight: 1.5 },
  { name: 'Arbitrum', chainId: 42161, rpc: 'https://arb1.arbitrum.io/rpc', symbol: 'ETH', weight: 1.5 },
  { name: 'Polygon', chainId: 137, rpc: 'https://polygon-rpc.com', symbol: 'MATIC', weight: 1.0 },
  { name: 'HashKey', chainId: 133, rpc: 'https://testnet.hsk.xyz', symbol: 'HSK', weight: 1.0 },
]

async function queryChain(chain: typeof CHAINS[0], address: string): Promise<ChainScore> {
  try {
    const provider = new ethers.JsonRpcProvider(chain.rpc)
    const [nonce, balance] = await Promise.all([
      provider.getTransactionCount(address),
      provider.getBalance(address),
    ])
    return {
      chain: chain.name,
      chainId: chain.chainId,
      nonce,
      balance: parseFloat(ethers.formatEther(balance)),
      symbol: chain.symbol,
      weight: chain.weight,
    }
  } catch {
    return { chain: chain.name, chainId: chain.chainId, nonce: 0, balance: 0, symbol: chain.symbol, weight: chain.weight }
  }
}

export async function computeCreditScore(address: string): Promise<CreditResult> {
  // Query all chains in parallel
  const chainScores = await Promise.all(CHAINS.map(c => queryChain(c, address)))

  // Aggregate metrics with chain weights
  const totalWeightedNonce = chainScores.reduce((s, c) => s + c.nonce * c.weight, 0)
  const totalWeight = chainScores.reduce((s, c) => s + c.weight, 0)
  const totalNonce = chainScores.reduce((s, c) => s + c.nonce, 0)
  const totalBalance = chainScores.reduce((s, c) => s + c.balance, 0)
  const chainsActive = chainScores.filter(c => c.nonce > 0).length
  const ethChain = chainScores.find(c => c.chainId === 1)

  // Dimension 1: Cross-Chain Activity (weighted by chain importance)
  // Ethereum activity counts 3x — older chains = more trusted
  const activityScore = Math.min(totalWeightedNonce / totalWeight * 1.5, 20)

  // Dimension 2: Transaction Depth (raw total across all chains)
  const txDepthScore = totalNonce > 500 ? 20 : totalNonce > 200 ? 17 : totalNonce > 100 ? 14 : totalNonce > 50 ? 11 : totalNonce > 20 ? 8 : totalNonce > 5 ? 4 : Math.min(totalNonce, 3)

  // Dimension 3: Multi-Chain Presence (more chains = more established)
  const presenceScore = chainsActive >= 5 ? 20 : chainsActive >= 4 ? 17 : chainsActive >= 3 ? 14 : chainsActive >= 2 ? 10 : chainsActive >= 1 ? 5 : 0

  // Dimension 4: Holdings Value (total balance, ETH weighted higher)
  const ethBalance = ethChain?.balance || 0
  const holdingsRaw = ethBalance * 2 + totalBalance // ETH counts double
  const holdingsScore = holdingsRaw > 50 ? 20 : holdingsRaw > 10 ? 17 : holdingsRaw > 5 ? 14 : holdingsRaw > 1 ? 10 : holdingsRaw > 0.1 ? 6 : holdingsRaw > 0 ? 3 : 0

  // Dimension 5: Ethereum Maturity (high Ethereum nonce = long history, strong signal)
  const ethNonce = ethChain?.nonce || 0
  const maturityScore = ethNonce > 500 ? 20 : ethNonce > 200 ? 17 : ethNonce > 100 ? 14 : ethNonce > 50 ? 11 : ethNonce > 20 ? 8 : ethNonce > 5 ? 4 : Math.min(ethNonce, 3)

  const dimensions: CreditDimension[] = [
    {
      name: 'Cross-Chain Activity',
      score: Math.round(activityScore * 100) / 100,
      max: 20,
      detail: `${totalNonce} tx across ${chainsActive} chains (weighted)`,
      weight: 1,
    },
    {
      name: 'Transaction Depth',
      score: txDepthScore,
      max: 20,
      detail: `${totalNonce} total transactions`,
      weight: 1,
    },
    {
      name: 'Multi-Chain Presence',
      score: presenceScore,
      max: 20,
      detail: `Active on ${chainsActive}/${CHAINS.length} chains`,
      weight: 1,
    },
    {
      name: 'Holdings Value',
      score: holdingsScore,
      max: 20,
      detail: `${totalBalance.toFixed(4)} total (ETH weighted 2x)`,
      weight: 1,
    },
    {
      name: 'Ethereum Maturity',
      score: maturityScore,
      max: 20,
      detail: ethNonce > 0 ? `${ethNonce} tx on Ethereum mainnet` : 'No Ethereum history',
      weight: 1,
    },
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
    chainScores,
    maxLoanUSD: tier.maxLoan,
    suggestedAPR: tier.apr,
    recommendation: tierIndex >= 3 ? 'Prime borrower — eligible for undercollateralized lending'
      : tierIndex >= 2 ? 'Reliable — standard collateral requirements'
      : tierIndex >= 1 ? 'Moderate risk — higher collateral recommended'
      : 'High risk — lending not recommended',
    timestamp: Date.now(),
  }
}

export function generateCommitment(address: string, score: number, nonce: string): string {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'bytes32'],
      [address, Math.floor(score), ethers.keccak256(ethers.toUtf8Bytes(nonce))]
    )
  )
}
