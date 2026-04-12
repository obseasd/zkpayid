// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ZKCreditScore.sol";

/// @title ZKGatedPool — DeFi pool gated by ZK credit attestation
/// @notice Only users with verified credit tier >= minTier can deposit/withdraw
/// @dev Demonstrates practical PayFi integration with ZKID attestations

contract ZKGatedPool {
    ZKCreditScore public immutable creditScore;
    uint8 public minTier; // Minimum tier to access pool (0-3)

    mapping(address => uint256) public deposits;
    uint256 public totalDeposits;
    uint256 public totalUsers;

    event Deposited(address indexed user, uint256 amount, bytes32 commitment);
    event Withdrawn(address indexed user, uint256 amount);
    event MinTierUpdated(uint8 newMinTier);

    error InsufficientCredit(bytes32 commitment, uint8 requiredTier);
    error InsufficientBalance();
    error TransferFailed();

    constructor(address _creditScore, uint8 _minTier) {
        creditScore = ZKCreditScore(_creditScore);
        minTier = _minTier;
    }

    /// @notice Deposit HSK into the pool — requires ZK credit attestation
    /// @param commitment The ZK commitment proving creditworthiness
    function deposit(bytes32 commitment) external payable {
        if (!creditScore.isEligible(commitment, minTier)) {
            revert InsufficientCredit(commitment, minTier);
        }

        if (deposits[msg.sender] == 0) totalUsers++;
        deposits[msg.sender] += msg.value;
        totalDeposits += msg.value;

        emit Deposited(msg.sender, msg.value, commitment);
    }

    /// @notice Withdraw from the pool
    /// @param amount Amount to withdraw (0 = all)
    function withdraw(uint256 amount) external {
        uint256 bal = deposits[msg.sender];
        if (amount == 0) amount = bal;
        if (amount > bal) revert InsufficientBalance();

        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        if (deposits[msg.sender] == 0) totalUsers--;

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Get pool stats
    function getStats() external view returns (uint256 total, uint256 users, uint8 tier) {
        return (totalDeposits, totalUsers, minTier);
    }

    receive() external payable {}
}
