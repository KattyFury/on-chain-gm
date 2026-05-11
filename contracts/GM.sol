// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title OnChain GM
/// @notice Say GM permanently on the Arc blockchain
contract GM {
    // Emitted every time someone says GM
    event GMSent(address indexed sender, uint256 timestamp);

    // How many times each address has said GM
    mapping(address => uint256) public gmCount;

    // Total GMs sent by everyone
    uint256 public totalGMs;

    /// @notice Say GM on-chain
    function gm() external {
        gmCount[msg.sender]++;
        totalGMs++;
        emit GMSent(msg.sender, block.timestamp);
    }
}
