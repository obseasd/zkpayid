# ZK-PayID

**Private Credit Scoring on HashKey Chain**

Prove your creditworthiness with zero-knowledge proofs. Your wallet identity stays hidden. Your score is verifiable on-chain. DeFi access is gated by trust, not collateral.

**Live Demo:** [zkpayid.vercel.app](https://zkpayid.vercel.app)
**Track:** ZKID - HashKey Chain Horizon Hackathon

---

## Problem

On-chain credit assessment requires exposing wallet addresses, balances, and transaction history. This creates a privacy paradox: to prove you're creditworthy, you must reveal everything about your financial activity. Existing DeFi lending protocols require 150%+ overcollateralization because they can't assess borrower risk privately.

## Solution

ZK-PayID computes a 5-dimension credit score from on-chain data and generates a Groth16 zero-knowledge proof that your score meets a minimum threshold. The proof is submitted on-chain as a Poseidon hash commitment. Verifiers can check your credit tier without ever knowing your wallet address or exact score.

## Architecture

```
User Wallet                    ZK-PayID                      HashKey Chain
     |                            |                               |
     |--- Connect Wallet -------->|                               |
     |                            |--- Read on-chain state ------>|
     |                            |<-- Balances, tx count, etc ---|
     |                            |                               |
     |<-- 5-Dim Credit Score -----|                               |
     |                            |                               |
     |--- Generate ZK Proof ----->|                               |
     |    (browser-side)          |                               |
     |    Poseidon(wallet,score,  |                               |
     |    nonce) == commitment    |                               |
     |    score >= threshold      |                               |
     |                            |                               |
     |<-- Groth16 Proof ----------|                               |
     |    (pi_a, pi_b, pi_c)     |                               |
     |                            |                               |
     |--- Submit Attestation -----|--- submitScore(commitment) -->|
     |                            |                               |
     |                       Verifier                              |
     |                            |--- verify(commitment) ------->|
     |                            |<-- tier, maxLoan, APR --------|
     |                            |   (no wallet address leaked)  |
```

## ZK Circuit: credit_score.circom

```
Template: CreditScoreProof
Constraints: 286 (non-linear)
Proving system: Groth16 (bn128)
Hash function: Poseidon (circomlib)

Private inputs:
  - walletHash   (Poseidon hash of wallet address)
  - score        (credit score 0-100)
  - nonce        (random, ensures commitment uniqueness)

Public inputs:
  - commitment   (Poseidon(walletHash, score, nonce))
  - threshold    (minimum required score for tier)

Constraints:
  1. Poseidon(walletHash, score, nonce) == commitment
  2. score >= threshold
  3. score <= 100
  4. score >= 0

Output: valid (1 if all constraints satisfied)
```

## Credit Scoring (5 Dimensions)

| Dimension | Max Points | Source |
|-----------|-----------|--------|
| Wallet Activity | 20 | Transaction count (nonce) |
| Transaction History | 20 | Total transactions |
| Holdings | 20 | Native token balance |
| DeFi Engagement | 20 | Contract interaction depth |
| Balance Stability | 20 | Balance consistency heuristic |

**Tiers:**
| Tier | Score | Max Loan | APR |
|------|-------|----------|-----|
| Poor | 0-29 | $0 | 15% |
| Fair | 30-59 | $500 | 10% |
| Good | 60-79 | $5,000 | 5% |
| Excellent | 80-100 | $50,000 | 3.5% |

## Deployed Contracts (HashKey Chain Testnet, Chain ID 133)

| Contract | Address | Purpose |
|----------|---------|---------|
| ZKCreditScore | [`0x1d03f395bCC1E5bd0e516bE2C1Aa28950910DDC5`](https://hashkey.blockscout.com/address/0x1d03f395bCC1E5bd0e516bE2C1Aa28950910DDC5) | Score attestation registry |
| ZKGatedPool | [`0x3338d2791e1cab22835a3975b1401C0f16C2AcCa`](https://hashkey.blockscout.com/address/0x3338d2791e1cab22835a3975b1401C0f16C2AcCa) | DeFi pool gated by credit tier |
| Groth16Verifier | [`0x217dC1a541e72B2dcE8EF921885123DD5F6AbA5D`](https://hashkey.blockscout.com/address/0x217dC1a541e72B2dcE8EF921885123DD5F6AbA5D) | On-chain ZK proof verifier |

## User Flow

1. **Connect** wallet to HashKey Chain Testnet
2. **Score** — 5-dimension on-chain credit analysis
3. **ZK Prove** — Generate Groth16 proof in browser (snarkjs WASM, ~2s)
4. **Attest** — Submit Poseidon commitment on-chain (no identity revealed)
5. **Access** — Credit tier unlocks ZK-gated DeFi pools

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Circuit | Circom 2.1.9, circomlib (Poseidon, comparators) |
| Proving | Groth16 (bn128), snarkjs, Powers of Tau |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| Wallet | ethers.js v6, MetaMask/Rabby |
| Contracts | Solidity 0.8.20, Hardhat 3 |
| Chain | HashKey Chain Testnet (ID 133) |
| Visual | Vanta.js (Three.js waves), glassmorphism |
| Deploy | Vercel (frontend), HashKey Testnet (contracts) |

## Run Locally

```bash
git clone https://github.com/obseasd/zkpayid.git
cd zkpayid
npm install
npm run dev
```

## Run Tests

```bash
node test/circuit.test.mjs
```

7 tests: valid proof, exact threshold, below threshold rejection, max score, zero score, wrong commitment rejection, commitment uniqueness.

## Compile Circuit

```bash
circom circuits/credit_score.circom --r1cs --wasm --sym -o circuits/
npx snarkjs groth16 setup circuits/credit_score.r1cs circuits/pot12_final.ptau circuits/credit_score.zkey
npx snarkjs zkey export solidityverifier circuits/credit_score.zkey contracts/Groth16Verifier.sol
```

## Security

- All ZK proof computation happens client-side (browser). No private data is sent to any server.
- Poseidon hash commitments are the only data stored on-chain.
- Each attestation uses a unique nonce, preventing commitment correlation.
- Groth16Verifier contract deployed for on-chain proof verification.

## Team

**obseasd** — Solo builder. EVM/DeFi specialist.

## License

MIT
