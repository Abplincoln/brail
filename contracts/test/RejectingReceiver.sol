// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title RejectingReceiver
 * @notice Test helper contract that deliberately reverts on receiving ETH/BOT
 */
contract RejectingReceiver {
    receive() external payable {
        revert("RejectingReceiver: transfer rejected");
    }

    fallback() external payable {
        revert("RejectingReceiver: fallback transfer rejected");
    }
}
