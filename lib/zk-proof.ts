// Browser-side Groth16 proof generation using snarkjs
// Circuit: credit_score.circom (286 constraints, Poseidon hash)
// Proves: score >= threshold WITHOUT revealing wallet or exact score

import { ethers } from 'ethers'

// Tier thresholds
const TIER_THRESHOLDS: Record<string, number> = {
  poor: 0,
  fair: 30,
  good: 60,
  excellent: 80,
}

export interface ZKProofResult {
  proof: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
  }
  publicSignals: string[]
  commitment: string
  valid: boolean
  proofTime: number
}

/**
 * Generate a Groth16 ZK proof that score >= threshold
 * All computation happens in the browser — no data sent to server
 */
export async function generateZKProof(
  address: string,
  score: number,
  tier: string
): Promise<ZKProofResult> {
  const start = Date.now()

  // Dynamic import snarkjs (heavy library, load on demand)
  const snarkjs = await import('snarkjs')

  // Generate deterministic wallet hash from address
  const walletHash = BigInt(ethers.keccak256(ethers.toUtf8Bytes(address.toLowerCase()))) % BigInt(2) ** BigInt(248)

  // Round score to integer
  const scoreInt = Math.floor(score)

  // Random nonce for commitment uniqueness
  const nonce = BigInt(ethers.keccak256(ethers.toUtf8Bytes(Date.now().toString() + address))) % BigInt(2) ** BigInt(248)

  // Get threshold for the tier
  const threshold = TIER_THRESHOLDS[tier] || 0

  // Compute Poseidon commitment (must match circuit)
  // We use circomlibjs Poseidon to compute the same hash as the circuit
  const { buildPoseidon } = await import('circomlibjs')
  const poseidon = await buildPoseidon()
  const commitmentBuf = poseidon([walletHash, BigInt(scoreInt), nonce])
  const commitment = poseidon.F.toString(commitmentBuf)

  // Circuit input
  const input = {
    walletHash: walletHash.toString(),
    score: scoreInt.toString(),
    nonce: nonce.toString(),
    commitment: commitment,
    threshold: threshold.toString(),
  }

  // Generate Groth16 proof in browser
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    '/zk/credit_score.wasm',
    '/zk/credit_score_final.zkey'
  )

  // Verify locally before returning
  const vkey = await fetch('/zk/verification_key.json').then(r => r.json())
  const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof)

  const proofTime = Date.now() - start

  return {
    proof: proof as unknown as ZKProofResult['proof'],
    publicSignals,
    commitment,
    valid,
    proofTime,
  }
}

/**
 * Format proof for Solidity verifier contract
 */
export function formatProofForSolidity(proof: ZKProofResult['proof']): {
  a: [string, string]
  b: [[string, string], [string, string]]
  c: [string, string]
} {
  return {
    a: [proof.pi_a[0], proof.pi_a[1]],
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]], // Note: reversed for Solidity
      [proof.pi_b[1][1], proof.pi_b[1][0]],
    ],
    c: [proof.pi_c[0], proof.pi_c[1]],
  }
}
