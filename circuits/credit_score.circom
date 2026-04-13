pragma circom 2.1.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/// @title CreditScoreProof
/// @notice Proves that a wallet's credit score meets a minimum threshold
///         without revealing the wallet address or exact score.
/// @dev Private inputs: walletHash, score, nonce
///      Public inputs: commitment, threshold
///      Constraints:
///        1. Poseidon(walletHash, score, nonce) == commitment
///        2. score >= threshold
///        3. score <= 100 (valid range)

template CreditScoreProof() {
    // Private inputs — known only to the prover
    signal input walletHash;   // Poseidon hash of the wallet address
    signal input score;        // Credit score (0-100)
    signal input nonce;        // Random nonce for commitment uniqueness

    // Public inputs — visible on-chain
    signal input commitment;   // Poseidon(walletHash, score, nonce)
    signal input threshold;    // Minimum required score (e.g., 60 for GOOD tier)

    // Output — publicly verifiable
    signal output valid;

    // === Constraint 1: Verify commitment ===
    // The commitment must equal Poseidon(walletHash, score, nonce)
    component hasher = Poseidon(3);
    hasher.inputs[0] <== walletHash;
    hasher.inputs[1] <== score;
    hasher.inputs[2] <== nonce;

    // Enforce commitment matches
    commitment === hasher.out;

    // === Constraint 2: Score >= Threshold ===
    // Prove score is at least the threshold without revealing exact score
    component gte = GreaterEqThan(8); // 8 bits = scores 0-255
    gte.in[0] <== score;
    gte.in[1] <== threshold;

    // Must be true (score >= threshold)
    gte.out === 1;

    // === Constraint 3: Score <= 100 (valid range) ===
    component lte = LessEqThan(8);
    lte.in[0] <== score;
    lte.in[1] <== 100;

    lte.out === 1;

    // === Constraint 4: Score >= 0 ===
    // Ensure score is non-negative (prevent underflow)
    component gte_zero = GreaterEqThan(8);
    gte_zero.in[0] <== score;
    gte_zero.in[1] <== 0;

    gte_zero.out === 1;

    // Output validity
    valid <== gte.out;
}

component main {public [commitment, threshold]} = CreditScoreProof();
