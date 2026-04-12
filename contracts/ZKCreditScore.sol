// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ZKCreditScore — Privacy-preserving on-chain credit scoring for HashKey Chain
/// @notice Users prove creditworthiness via ZK proofs without revealing wallet identity or balances
/// @dev Uses Groth16 proofs verified on-chain. Score tiers unlock PayFi flows (lending, payments)

contract ZKCreditScore {
    // --- Types ---
    struct CreditAttestation {
        bytes32 commitment;     // Poseidon hash of (address, score, nonce)
        uint8 tier;             // 0=poor, 1=fair, 2=good, 3=excellent
        uint256 maxLoanUSD;     // Max loan amount in USD (6 decimals)
        uint256 suggestedAPR;   // Suggested APR in basis points (e.g., 350 = 3.5%)
        uint256 timestamp;
        bool valid;
    }

    // --- State ---
    mapping(bytes32 => CreditAttestation) public attestations;
    mapping(address => bytes32[]) public userAttestations;
    address public verifier;    // Groth16 verifier contract
    address public owner;
    uint256 public totalScored;

    // --- Events ---
    event CreditScored(bytes32 indexed commitment, uint8 tier, uint256 maxLoanUSD, uint256 timestamp);
    event AttestationRevoked(bytes32 indexed commitment);
    event VerifierUpdated(address indexed newVerifier);

    // --- Errors ---
    error InvalidProof();
    error AttestationNotFound();
    error OnlyOwner();
    error AlreadyExists();

    constructor(address _verifier) {
        owner = msg.sender;
        verifier = _verifier;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /// @notice Submit a ZK credit score attestation
    /// @param commitment Poseidon(address, score, nonce) — hides identity
    /// @param tier Credit tier (0-3)
    /// @param maxLoanUSD Maximum loan in USD (6 decimals)
    /// @param suggestedAPR APR in basis points
    /// @param proof Groth16 proof bytes (placeholder for now)
    function submitScore(
        bytes32 commitment,
        uint8 tier,
        uint256 maxLoanUSD,
        uint256 suggestedAPR,
        bytes calldata proof
    ) external {
        if (attestations[commitment].valid) revert AlreadyExists();

        // In production: verify Groth16 proof on-chain
        // IVerifier(verifier).verify(proof, [commitment, tier, maxLoanUSD])
        // For hackathon: accept if proof length > 0
        if (proof.length == 0) revert InvalidProof();

        attestations[commitment] = CreditAttestation({
            commitment: commitment,
            tier: tier,
            maxLoanUSD: maxLoanUSD,
            suggestedAPR: suggestedAPR,
            timestamp: block.timestamp,
            valid: true
        });

        userAttestations[msg.sender].push(commitment);
        totalScored++;

        emit CreditScored(commitment, tier, maxLoanUSD, block.timestamp);
    }

    /// @notice Verify a credit attestation exists and is valid
    /// @param commitment The commitment to check
    /// @return tier Credit tier
    /// @return maxLoanUSD Maximum loan
    /// @return suggestedAPR Suggested APR
    /// @return timestamp When scored
    function verify(bytes32 commitment) external view returns (
        uint8 tier, uint256 maxLoanUSD, uint256 suggestedAPR, uint256 timestamp
    ) {
        CreditAttestation memory a = attestations[commitment];
        if (!a.valid) revert AttestationNotFound();
        return (a.tier, a.maxLoanUSD, a.suggestedAPR, a.timestamp);
    }

    /// @notice Check if a commitment meets minimum tier for a PayFi flow
    /// @param commitment The commitment
    /// @param minTier Minimum required tier (0-3)
    /// @return eligible Whether the commitment meets the requirement
    function isEligible(bytes32 commitment, uint8 minTier) external view returns (bool eligible) {
        CreditAttestation memory a = attestations[commitment];
        return a.valid && a.tier >= minTier;
    }

    /// @notice Revoke an attestation
    function revoke(bytes32 commitment) external {
        CreditAttestation storage a = attestations[commitment];
        if (!a.valid) revert AttestationNotFound();
        a.valid = false;
        emit AttestationRevoked(commitment);
    }

    /// @notice Update the verifier contract
    function setVerifier(address _verifier) external onlyOwner {
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    /// @notice Get all attestations for a user
    function getUserAttestations(address user) external view returns (bytes32[] memory) {
        return userAttestations[user];
    }
}
