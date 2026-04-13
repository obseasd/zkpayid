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
  if (!contract) throw new Error('Contract not available. Make sure you are on HashKey Chain Testnet (Chain ID 133) and the contract is deployed.')

  // Convert Poseidon commitment (decimal string) to bytes32
  const commitmentBN = BigInt(commitment)
  const commitmentBytes32 = ethers.zeroPadValue(ethers.toBeHex(commitmentBN), 32)

  // Placeholder proof (in production: full Groth16 proof calldata)
  const proof = ethers.toUtf8Bytes('groth16-proof')

  try {
    const tx = await contract.submitScore(
      commitmentBytes32,
      tier,
      BigInt(Math.round(maxLoanUSD * 1e6)),
      suggestedAPR,
      proof
    )
    const receipt = await tx.wait()
    return receipt.hash
  } catch (err: unknown) {
    const error = err as { reason?: string; code?: string; message?: string }
    if (error.code === 'ACTION_REJECTED') throw new Error('Transaction rejected by user')
    if (error.reason) throw new Error(error.reason)
    if (error.message?.includes('AlreadyExists')) throw new Error('This attestation already exists on-chain')
    if (error.message?.includes('insufficient funds')) throw new Error('Insufficient HSK for gas. Get testnet tokens from hashkeychain.net/faucet')
    throw new Error(error.message || 'Transaction failed')
  }
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
    // Convert decimal commitment to bytes32 if needed
    let commitmentBytes32 = commitment
    if (!commitment.startsWith('0x')) {
      const bn = BigInt(commitment)
      commitmentBytes32 = ethers.zeroPadValue(ethers.toBeHex(bn), 32)
    }
    const [tier, maxLoanUSD, suggestedAPR, timestamp] = await contract.verify(commitmentBytes32)
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
    let cb = commitment
    if (!commitment.startsWith('0x')) { cb = ethers.zeroPadValue(ethers.toBeHex(BigInt(commitment)), 32) }
    return await contract.isEligible(cb, minTier)
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
