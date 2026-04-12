import { ethers } from 'ethers'
import { ACTIVE_CHAIN } from './chains'

const ZK_CREDIT_SCORE_ABI = [
  'function submitScore(bytes32 commitment, uint8 tier, uint256 maxLoanUSD, uint256 suggestedAPR, bytes proof) external',
  'function verify(bytes32 commitment) external view returns (uint8 tier, uint256 maxLoanUSD, uint256 suggestedAPR, uint256 timestamp)',
  'function isEligible(bytes32 commitment, uint8 minTier) external view returns (bool eligible)',
  'function revoke(bytes32 commitment) external',
  'function totalScored() external view returns (uint256)',
  'event CreditScored(bytes32 indexed commitment, uint8 tier, uint256 maxLoanUSD, uint256 timestamp)',
]

export function getContractAddress(): string {
  return ACTIVE_CHAIN.contracts.zkCreditScore || ''
}

export function getReadContract(): ethers.Contract | null {
  const addr = getContractAddress()
  if (!addr) return null
  const provider = new ethers.JsonRpcProvider(ACTIVE_CHAIN.rpc)
  return new ethers.Contract(addr, ZK_CREDIT_SCORE_ABI, provider)
}

export async function getWriteContract(): Promise<ethers.Contract | null> {
  const addr = getContractAddress()
  if (!addr || !window.ethereum) return null
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()
  return new ethers.Contract(addr, ZK_CREDIT_SCORE_ABI, signer)
}

export async function submitAttestation(
  commitment: string,
  tier: number,
  maxLoanUSD: number,
  suggestedAPR: number
): Promise<string> {
  const contract = await getWriteContract()
  if (!contract) throw new Error('Contract not available — deploy first or connect wallet')

  // Placeholder proof (in production: Groth16 proof bytes)
  const proof = ethers.toUtf8Bytes('zk-proof-placeholder')

  const tx = await contract.submitScore(
    commitment,
    tier,
    ethers.parseUnits(maxLoanUSD.toString(), 6),
    suggestedAPR,
    proof
  )
  const receipt = await tx.wait()
  return receipt.hash
}

export async function verifyAttestation(commitment: string): Promise<{
  tier: number
  maxLoanUSD: number
  suggestedAPR: number
  timestamp: number
} | null> {
  const contract = getReadContract()
  if (!contract) return null

  try {
    const [tier, maxLoanUSD, suggestedAPR, timestamp] = await contract.verify(commitment)
    return {
      tier: Number(tier),
      maxLoanUSD: Number(ethers.formatUnits(maxLoanUSD, 6)),
      suggestedAPR: Number(suggestedAPR),
      timestamp: Number(timestamp),
    }
  } catch {
    return null
  }
}

export async function checkEligibility(commitment: string, minTier: number): Promise<boolean> {
  const contract = getReadContract()
  if (!contract) return false
  try {
    return await contract.isEligible(commitment, minTier)
  } catch {
    return false
  }
}

export async function getTotalScored(): Promise<number> {
  const contract = getReadContract()
  if (!contract) return 0
  try {
    return Number(await contract.totalScored())
  } catch {
    return 0
  }
}
