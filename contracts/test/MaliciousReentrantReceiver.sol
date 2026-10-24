// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IBrailVault {
    function withdraw(address payable to, uint256 amount) external;
}

/**
 * @title MaliciousReentrantReceiver
 * @notice Test helper contract that attempts reentrancy attack on BrailVault during withdrawal
 */
contract MaliciousReentrantReceiver {
    IBrailVault public targetVault;
    bool public attackAttempted;
    bool public attackSucceeded;
    bytes public reentrancyError;

    constructor(address _targetVault) {
        targetVault = IBrailVault(_targetVault);
    }

    receive() external payable {
        if (!attackAttempted) {
            attackAttempted = true;
            // Attempt to reenter the vault's withdraw function
            try targetVault.withdraw(payable(address(this)), msg.value) {
                attackSucceeded = true;
            } catch (bytes memory reason) {
                reentrancyError = reason;
                // Propagate revert so that reentrancy guard or rejection behavior is tested
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }
}
