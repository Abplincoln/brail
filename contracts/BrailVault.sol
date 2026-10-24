// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BrailVault
 * @notice Secure vault for holding native BOT Chain currency with multi-tier withdrawal protection:
 * - Deployer becomes owner with exclusive administrative and withdrawal initiation rights.
 * - Withdrawals are restricted to an approved recipient registry.
 * - Enforces both per-withdrawal caps and cumulative daily withdrawal limits using UTC-day accounting.
 * - Failed native transfers revert the entire transaction, restoring daily accounting.
 * - Protected against reentrancy.
 * - Deposits remain unconditionally open to anyone regardless of restrictive withdrawal limits.
 * - Zero backdoors or rescue mechanisms that bypass withdrawal constraints.
 */
contract BrailVault is Ownable, ReentrancyGuard {
    // --- State Variables ---

    /// @notice Maximum amount of native currency permitted in a single withdrawal transaction
    uint256 public maxPerWithdrawal;

    /// @notice Maximum cumulative amount of native currency permitted to be withdrawn in any single UTC day
    uint256 public dailyLimit;

    /// @notice Mapping from recipient address to approval status
    mapping(address => bool) public isRecipientApproved;

    /// @notice Internal list of all approved recipients for enumerable inspection
    address[] private _approvedRecipientsList;

    /// @notice Internal mapping for array indexing to enable efficient O(1) removal
    mapping(address => uint256) private _recipientIndex;

    /// @notice Tracks cumulative withdrawn amounts indexed by UTC day (block.timestamp / 1 days)
    mapping(uint256 => uint256) public dailyWithdrawn;

    // --- Custom Errors ---

    error ZeroAddress();
    error InvalidLimits(uint256 maxPerWithdrawal, uint256 dailyLimit);
    error RecipientAlreadyApproved(address recipient);
    error RecipientNotApproved(address recipient);
    error ZeroWithdrawalAmount();
    error ZeroDepositAmount();
    error ExceedsMaxPerWithdrawal(uint256 requested, uint256 maxAllowed);
    error ExceedsDailyLimit(uint256 requested, uint256 currentDailyWithdrawn, uint256 dailyLimit);
    error InsufficientVaultBalance(uint256 requested, uint256 availableBalance);
    error WithdrawalTransferFailed();

    // --- Events ---

    event Deposit(address indexed sender, uint256 amount);
    event Withdrawal(address indexed recipient, uint256 amount, uint256 indexed day);
    event RecipientAdded(address indexed recipient);
    event RecipientRemoved(address indexed recipient);
    event LimitsUpdated(uint256 maxPerWithdrawal, uint256 dailyLimit);

    // --- Constructor ---

    /**
     * @notice Initializes the vault with specified withdrawal boundaries
     * @dev Deployer becomes the initial owner through Ownable(msg.sender)
     * @param initialMaxPerWithdrawal The upper cap for any single withdrawal
     * @param initialDailyLimit The total allowance permitted within one UTC calendar day
     */
    constructor(
        uint256 initialMaxPerWithdrawal,
        uint256 initialDailyLimit
    ) Ownable(msg.sender) {
        if (initialMaxPerWithdrawal == 0 || initialDailyLimit == 0) {
            revert InvalidLimits(initialMaxPerWithdrawal, initialDailyLimit);
        }
        if (initialMaxPerWithdrawal > initialDailyLimit) {
            revert InvalidLimits(initialMaxPerWithdrawal, initialDailyLimit);
        }

        maxPerWithdrawal = initialMaxPerWithdrawal;
        dailyLimit = initialDailyLimit;

        emit LimitsUpdated(initialMaxPerWithdrawal, initialDailyLimit);
    }

    // --- Deposits ---

    /**
     * @notice Allows anyone to deposit native currency into the vault
     * @dev Deposits are never restricted by withdrawal limits
     */
    function deposit() external payable {
        _handleDeposit();
    }

    /**
     * @notice Direct native transfer fallback
     */
    receive() external payable {
        _handleDeposit();
    }

    /**
     * @notice Internal handler for native deposits
     */
    function _handleDeposit() internal {
        if (msg.value == 0) {
            revert ZeroDepositAmount();
        }
        emit Deposit(msg.sender, msg.value);
    }

    // --- Configuration (Owner Only) ---

    /**
     * @notice Adds an address to the approved recipient registry
     * @param recipient The address to authorize
     */
    function addRecipient(address recipient) external onlyOwner {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        if (isRecipientApproved[recipient]) {
            revert RecipientAlreadyApproved(recipient);
        }

        isRecipientApproved[recipient] = true;
        _recipientIndex[recipient] = _approvedRecipientsList.length;
        _approvedRecipientsList.push(recipient);

        emit RecipientAdded(recipient);
    }

    /**
     * @notice Removes an address from the approved recipient registry
     * @param recipient The address to revoke
     */
    function removeRecipient(address recipient) external onlyOwner {
        if (!isRecipientApproved[recipient]) {
            revert RecipientNotApproved(recipient);
        }

        isRecipientApproved[recipient] = false;

        uint256 indexToRemove = _recipientIndex[recipient];
        uint256 lastIndex = _approvedRecipientsList.length - 1;

        if (indexToRemove != lastIndex) {
            address lastRecipient = _approvedRecipientsList[lastIndex];
            _approvedRecipientsList[indexToRemove] = lastRecipient;
            _recipientIndex[lastRecipient] = indexToRemove;
        }

        _approvedRecipientsList.pop();
        delete _recipientIndex[recipient];

        emit RecipientRemoved(recipient);
    }

    /**
     * @notice Updates the withdrawal thresholds
     * @param newMaxPerWithdrawal New maximum amount per withdrawal
     * @param newDailyLimit New cumulative daily withdrawal limit
     */
    function setLimits(
        uint256 newMaxPerWithdrawal,
        uint256 newDailyLimit
    ) external onlyOwner {
        if (newMaxPerWithdrawal == 0 || newDailyLimit == 0) {
            revert InvalidLimits(newMaxPerWithdrawal, newDailyLimit);
        }
        if (newMaxPerWithdrawal > newDailyLimit) {
            revert InvalidLimits(newMaxPerWithdrawal, newDailyLimit);
        }

        maxPerWithdrawal = newMaxPerWithdrawal;
        dailyLimit = newDailyLimit;

        emit LimitsUpdated(newMaxPerWithdrawal, newDailyLimit);
    }

    // --- Withdrawals (Owner Only) ---

    /**
     * @notice Withdraws native BOT currency to an approved recipient subject to all constraints
     * @param to The recipient destination address (must be approved)
     * @param amount The amount of native currency (in wei) to withdraw
     */
    function withdraw(
        address payable to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (!isRecipientApproved[to]) {
            revert RecipientNotApproved(to);
        }
        if (amount == 0) {
            revert ZeroWithdrawalAmount();
        }
        if (amount > maxPerWithdrawal) {
            revert ExceedsMaxPerWithdrawal(amount, maxPerWithdrawal);
        }

        uint256 currentDay = getCurrentDay();
        uint256 newDailyWithdrawn = dailyWithdrawn[currentDay] + amount;
        if (newDailyWithdrawn > dailyLimit) {
            revert ExceedsDailyLimit(amount, dailyWithdrawn[currentDay], dailyLimit);
        }

        uint256 availableBalance = address(this).balance;
        if (availableBalance < amount) {
            revert InsufficientVaultBalance(amount, availableBalance);
        }

        // Checks-Effects-Interactions:
        // Update daily accounting state before external transfer
        dailyWithdrawn[currentDay] = newDailyWithdrawn;

        // Perform external native currency transfer
        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            // Entire transaction reverts, automatically restoring dailyWithdrawn accounting
            revert WithdrawalTransferFailed();
        }

        emit Withdrawal(to, amount, currentDay);
    }

    // --- Read & View Helpers ---

    /**
     * @notice Calculates the current UTC day index based on block timestamp
     * @return Current UTC day (integer division of timestamp by 86400)
     */
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    /**
     * @notice Returns total amount withdrawn in a specific UTC day
     * @param day UTC day index
     */
    function getDailyWithdrawn(uint256 day) external view returns (uint256) {
        return dailyWithdrawn[day];
    }

    /**
     * @notice Returns total amount withdrawn during the current UTC day
     */
    function getCurrentDayWithdrawn() external view returns (uint256) {
        return dailyWithdrawn[getCurrentDay()];
    }

    /**
     * @notice Returns the remaining withdrawal capacity for the current UTC day
     */
    function getAvailableDailyAllowance() external view returns (uint256) {
        uint256 currentDay = getCurrentDay();
        uint256 withdrawnToday = dailyWithdrawn[currentDay];
        if (withdrawnToday >= dailyLimit) {
            return 0;
        }
        return dailyLimit - withdrawnToday;
    }

    /**
     * @notice Returns list of all currently approved recipients
     */
    function getApprovedRecipients() external view returns (address[] memory) {
        return _approvedRecipientsList;
    }

    /**
     * @notice Returns the total count of approved recipients
     */
    function getApprovedRecipientsCount() external view returns (uint256) {
        return _approvedRecipientsList.length;
    }

    /**
     * @notice Returns the vault's current native balance
     */
    function getVaultBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
