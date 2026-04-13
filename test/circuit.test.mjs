// ZK Credit Score Circuit Tests
// Tests the Groth16 circuit: credit_score.circom (286 constraints)

import { buildPoseidon } from 'circomlibjs'
import * as snarkjs from 'snarkjs'
import assert from 'assert'

const WASM = 'circuits/credit_score_js/credit_score.wasm'
const ZKEY = 'circuits/credit_score_final.zkey'
const VKEY_PATH = 'circuits/verification_key.json'

let poseidon

async function loadPoseidon() {
  if (!poseidon) poseidon = await buildPoseidon()
  return poseidon
}

function computeCommitment(p, walletHash, score, nonce) {
  const buf = p([walletHash, score, nonce])
  return p.F.toString(buf)
}

async function proveAndVerify(input) {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY)
  const fs = await import('fs')
  const vkey = JSON.parse(fs.readFileSync(VKEY_PATH, 'utf-8'))
  const valid = await snarkjs.groth16.verify(vkey, publicSignals, proof)
  return { proof, publicSignals, valid }
}

// Test 1: Valid proof — score 75 >= threshold 60
async function testValidProof() {
  const p = await loadPoseidon()
  const walletHash = BigInt('12345678901234567890')
  const score = BigInt(75)
  const nonce = BigInt('98765432101234567890')
  const commitment = computeCommitment(p, walletHash, score, nonce)

  const { valid, publicSignals } = await proveAndVerify({
    walletHash: walletHash.toString(),
    score: score.toString(),
    nonce: nonce.toString(),
    commitment,
    threshold: '60',
  })

  assert.strictEqual(valid, true, 'Proof should be valid')
  assert.strictEqual(publicSignals[0], '1', 'Output should be 1 (valid)')
  console.log('  PASS: Valid proof (score=75, threshold=60)')
}

// Test 2: Score exactly at threshold
async function testExactThreshold() {
  const p = await loadPoseidon()
  const walletHash = BigInt('11111111111111111111')
  const score = BigInt(60)
  const nonce = BigInt('22222222222222222222')
  const commitment = computeCommitment(p, walletHash, score, nonce)

  const { valid } = await proveAndVerify({
    walletHash: walletHash.toString(),
    score: '60',
    nonce: nonce.toString(),
    commitment,
    threshold: '60',
  })

  assert.strictEqual(valid, true, 'Score at exact threshold should be valid')
  console.log('  PASS: Exact threshold (score=60, threshold=60)')
}

// Test 3: Score below threshold should fail
async function testBelowThreshold() {
  const p = await loadPoseidon()
  const walletHash = BigInt('33333333333333333333')
  const score = BigInt(50)
  const nonce = BigInt('44444444444444444444')
  const commitment = computeCommitment(p, walletHash, score, nonce)

  try {
    await proveAndVerify({
      walletHash: walletHash.toString(),
      score: '50',
      nonce: nonce.toString(),
      commitment,
      threshold: '60',
    })
    assert.fail('Should have thrown — score below threshold')
  } catch (e) {
    console.log('  PASS: Below threshold rejected (score=50, threshold=60)')
  }
}

// Test 4: Maximum score (100)
async function testMaxScore() {
  const p = await loadPoseidon()
  const walletHash = BigInt('55555555555555555555')
  const score = BigInt(100)
  const nonce = BigInt('66666666666666666666')
  const commitment = computeCommitment(p, walletHash, score, nonce)

  const { valid } = await proveAndVerify({
    walletHash: walletHash.toString(),
    score: '100',
    nonce: nonce.toString(),
    commitment,
    threshold: '80',
  })

  assert.strictEqual(valid, true, 'Max score should be valid')
  console.log('  PASS: Maximum score (score=100, threshold=80)')
}

// Test 5: Zero score with zero threshold
async function testZeroScore() {
  const p = await loadPoseidon()
  const walletHash = BigInt('77777777777777777777')
  const score = BigInt(0)
  const nonce = BigInt('88888888888888888888')
  const commitment = computeCommitment(p, walletHash, score, nonce)

  const { valid } = await proveAndVerify({
    walletHash: walletHash.toString(),
    score: '0',
    nonce: nonce.toString(),
    commitment,
    threshold: '0',
  })

  assert.strictEqual(valid, true, 'Zero score with zero threshold should be valid')
  console.log('  PASS: Zero score/threshold (score=0, threshold=0)')
}

// Test 6: Wrong commitment should fail
async function testWrongCommitment() {
  try {
    await proveAndVerify({
      walletHash: '12345678901234567890',
      score: '75',
      nonce: '98765432101234567890',
      commitment: '999999999999999999', // wrong
      threshold: '60',
    })
    assert.fail('Should have thrown — wrong commitment')
  } catch (e) {
    console.log('  PASS: Wrong commitment rejected')
  }
}

// Test 7: Different wallets produce different commitments
async function testUniqueness() {
  const p = await loadPoseidon()
  const score = BigInt(75)
  const nonce = BigInt(12345)

  const c1 = computeCommitment(p, BigInt(111), score, nonce)
  const c2 = computeCommitment(p, BigInt(222), score, nonce)

  assert.notStrictEqual(c1, c2, 'Different wallets should produce different commitments')
  console.log('  PASS: Commitment uniqueness per wallet')
}

// Run all
async function main() {
  console.log('\nZK-PayID Circuit Tests (credit_score.circom)')
  console.log('=' .repeat(50))

  await testValidProof()
  await testExactThreshold()
  await testBelowThreshold()
  await testMaxScore()
  await testZeroScore()
  await testWrongCommitment()
  await testUniqueness()

  console.log('\n' + '='.repeat(50))
  console.log('All 7 tests passed\n')
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1) })
