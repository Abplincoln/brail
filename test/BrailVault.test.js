const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BrailVault", function () {
  let vault;
  let rejectingReceiver;
  let maliciousReceiver;
  let owner;
  let recipient1;
  let recipient2;
  let unapprovedUser;
  let depositor;

  const INITIAL_MAX_PER_WITHDRAWAL = ethers.parseEther("1.0"); // 1 BOT/ETH
  const INITIAL_DAILY_LIMIT = ethers.parseEther("5.0"); // 5 BOT/ETH

  beforeEach(async function () {
    [owner, recipient1, recipient2, unapprovedUser, depositor] =
      await ethers.getSigners();

    const BrailVault = await ethers.getContractFactory("BrailVault");
    vault = await BrailVault.deploy(
      INITIAL_MAX_PER_WITHDRAWAL,
      INITIAL_DAILY_LIMIT
    );
    await vault.waitForDeployment();

    const RejectingReceiver = await ethers.getContractFactory("RejectingReceiver");
    rejectingReceiver = await RejectingReceiver.deploy();
    await rejectingReceiver.waitForDeployment();

    const MaliciousReentrantReceiver = await ethers.getContractFactory(
      "MaliciousReentrantReceiver"
    );
    maliciousReceiver = await MaliciousReentrantReceiver.deploy(await vault.getAddress());
    await maliciousReceiver.waitForDeployment();
  });

  describe("1. Deployment and Initialization", function () {
    it("should set deployer as the initial owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("should configure initial withdrawal limits correctly", async function () {
      expect(await vault.maxPerWithdrawal()).to.equal(INITIAL_MAX_PER_WITHDRAWAL);
      expect(await vault.dailyLimit()).to.equal(INITIAL_DAILY_LIMIT);
    });

    it("should emit LimitsUpdated on deployment", async function () {
      const BrailVault = await ethers.getContractFactory("BrailVault");
      const newVault = await BrailVault.deploy(
        ethers.parseEther("0.5"),
        ethers.parseEther("2.0")
      );
      await expect(newVault.deploymentTransaction())
        .to.emit(newVault, "LimitsUpdated")
        .withArgs(ethers.parseEther("0.5"), ethers.parseEther("2.0"));
    });

    it("should reject deployment with zero maxPerWithdrawal", async function () {
      const BrailVault = await ethers.getContractFactory("BrailVault");
      await expect(
        BrailVault.deploy(0, INITIAL_DAILY_LIMIT)
      ).to.be.revertedWithCustomError(vault, "InvalidLimits");
    });

    it("should reject deployment with zero dailyLimit", async function () {
      const BrailVault = await ethers.getContractFactory("BrailVault");
      await expect(
        BrailVault.deploy(INITIAL_MAX_PER_WITHDRAWAL, 0)
      ).to.be.revertedWithCustomError(vault, "InvalidLimits");
    });

    it("should reject deployment when maxPerWithdrawal exceeds dailyLimit", async function () {
      const BrailVault = await ethers.getContractFactory("BrailVault");
      await expect(
        BrailVault.deploy(ethers.parseEther("10"), ethers.parseEther("5"))
      ).to.be.revertedWithCustomError(vault, "InvalidLimits");
    });
  });

  describe("2. Recipient Management & Access Control", function () {
    it("should allow owner to add an approved recipient and emit RecipientAdded", async function () {
      await expect(vault.connect(owner).addRecipient(recipient1.address))
        .to.emit(vault, "RecipientAdded")
        .withArgs(recipient1.address);

      expect(await vault.isRecipientApproved(recipient1.address)).to.be.true;
      const recipients = await vault.getApprovedRecipients();
      expect(recipients).to.deep.equal([recipient1.address]);
      expect(await vault.getApprovedRecipientsCount()).to.equal(1);
    });

    it("should reject unauthorized user from adding a recipient", async function () {
      await expect(
        vault.connect(unapprovedUser).addRecipient(recipient1.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(unapprovedUser.address);
    });

    it("should reject adding the zero address as recipient", async function () {
      await expect(
        vault.connect(owner).addRecipient(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("should reject adding an already approved recipient", async function () {
      await vault.connect(owner).addRecipient(recipient1.address);
      await expect(
        vault.connect(owner).addRecipient(recipient1.address)
      ).to.be.revertedWithCustomError(vault, "RecipientAlreadyApproved")
        .withArgs(recipient1.address);
    });

    it("should allow owner to remove an approved recipient and emit RecipientRemoved", async function () {
      await vault.connect(owner).addRecipient(recipient1.address);
      await vault.connect(owner).addRecipient(recipient2.address);

      await expect(vault.connect(owner).removeRecipient(recipient1.address))
        .to.emit(vault, "RecipientRemoved")
        .withArgs(recipient1.address);

      expect(await vault.isRecipientApproved(recipient1.address)).to.be.false;
      expect(await vault.isRecipientApproved(recipient2.address)).to.be.true;

      const recipients = await vault.getApprovedRecipients();
      expect(recipients).to.deep.equal([recipient2.address]);
      expect(await vault.getApprovedRecipientsCount()).to.equal(1);
    });

    it("should reject unauthorized user from removing a recipient", async function () {
      await vault.connect(owner).addRecipient(recipient1.address);
      await expect(
        vault.connect(unapprovedUser).removeRecipient(recipient1.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(unapprovedUser.address);
    });

    it("should reject removing a non-approved recipient", async function () {
      await expect(
        vault.connect(owner).removeRecipient(recipient1.address)
      ).to.be.revertedWithCustomError(vault, "RecipientNotApproved")
        .withArgs(recipient1.address);
    });
  });

  describe("3. Limit Management & Access Control", function () {
    it("should allow owner to update limits and emit LimitsUpdated", async function () {
      const newMax = ethers.parseEther("2.0");
      const newDaily = ethers.parseEther("8.0");

      await expect(vault.connect(owner).setLimits(newMax, newDaily))
        .to.emit(vault, "LimitsUpdated")
        .withArgs(newMax, newDaily);

      expect(await vault.maxPerWithdrawal()).to.equal(newMax);
      expect(await vault.dailyLimit()).to.equal(newDaily);
    });

    it("should reject unauthorized user from updating limits", async function () {
      await expect(
        vault.connect(unapprovedUser).setLimits(
          ethers.parseEther("2.0"),
          ethers.parseEther("8.0")
        )
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(unapprovedUser.address);
    });

    it("should reject updating limits with invalid values", async function () {
      // zero maxPerWithdrawal
      await expect(
        vault.connect(owner).setLimits(0, ethers.parseEther("5.0"))
      ).to.be.revertedWithCustomError(vault, "InvalidLimits");

      // zero dailyLimit
      await expect(
        vault.connect(owner).setLimits(ethers.parseEther("1.0"), 0)
      ).to.be.revertedWithCustomError(vault, "InvalidLimits");

      // maxPerWithdrawal > dailyLimit
      await expect(
        vault.connect(owner).setLimits(
          ethers.parseEther("10.0"),
          ethers.parseEther("5.0")
        )
      ).to.be.revertedWithCustomError(vault, "InvalidLimits");
    });
  });

  describe("4. Deposits and Restrictive Limits Invariance", function () {
    it("should accept deposits via deposit() function and emit Deposit", async function () {
      const depositAmount = ethers.parseEther("3.0");
      await expect(
        vault.connect(depositor).deposit({ value: depositAmount })
      )
        .to.emit(vault, "Deposit")
        .withArgs(depositor.address, depositAmount);

      expect(await vault.getVaultBalance()).to.equal(depositAmount);
    });

    it("should accept deposits via direct native transfer receive() fallback", async function () {
      const transferAmount = ethers.parseEther("1.5");
      await expect(
        depositor.sendTransaction({
          to: await vault.getAddress(),
          value: transferAmount,
        })
      )
        .to.emit(vault, "Deposit")
        .withArgs(depositor.address, transferAmount);

      expect(await vault.getVaultBalance()).to.equal(transferAmount);
    });

    it("should reject zero-value deposit()", async function () {
      await expect(
        vault.connect(depositor).deposit({ value: 0 })
      ).to.be.revertedWithCustomError(vault, "ZeroDepositAmount");
    });

    it("should allow deposits when withdrawal limits are highly restrictive or daily limit exhausted", async function () {
      // Configure very restrictive limits: max 0.001 BOT, daily 0.002 BOT
      await vault.connect(owner).setLimits(
        ethers.parseEther("0.001"),
        ethers.parseEther("0.002")
      );

      // Deposit a large amount (50 BOT) - must succeed unconditionally
      const largeDeposit = ethers.parseEther("50.0");
      await expect(
        vault.connect(depositor).deposit({ value: largeDeposit })
      )
        .to.emit(vault, "Deposit")
        .withArgs(depositor.address, largeDeposit);

      expect(await vault.getVaultBalance()).to.equal(largeDeposit);

      // Exhaust the daily limit
      await vault.connect(owner).addRecipient(recipient1.address);
      await vault.connect(owner).withdraw(recipient1.address, ethers.parseEther("0.001"));
      await vault.connect(owner).withdraw(recipient1.address, ethers.parseEther("0.001"));

      // Daily limit is now 100% exhausted
      expect(await vault.getAvailableDailyAllowance()).to.equal(0);

      // Depositing another 10 BOT must still succeed
      const secondDeposit = ethers.parseEther("10.0");
      await expect(
        vault.connect(depositor).deposit({ value: secondDeposit })
      )
        .to.emit(vault, "Deposit")
        .withArgs(depositor.address, secondDeposit);

      expect(await vault.getVaultBalance()).to.equal(largeDeposit - ethers.parseEther("0.002") + secondDeposit);
    });
  });

  describe("5. Withdrawals: Security Rules & Boundary Enforcement", function () {
    beforeEach(async function () {
      // Seed vault with 10 BOT
      await vault.connect(depositor).deposit({ value: ethers.parseEther("10.0") });
      await vault.connect(owner).addRecipient(recipient1.address);
    });

    it("should reject unauthorized withdrawal attempts by non-owner", async function () {
      await expect(
        vault.connect(unapprovedUser).withdraw(
          recipient1.address,
          ethers.parseEther("0.5")
        )
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount")
        .withArgs(unapprovedUser.address);
    });

    it("should reject withdrawal to an unapproved recipient", async function () {
      await expect(
        vault.connect(owner).withdraw(
          unapprovedUser.address,
          ethers.parseEther("0.5")
        )
      ).to.be.revertedWithCustomError(vault, "RecipientNotApproved")
        .withArgs(unapprovedUser.address);
    });

    it("should reject zero-value withdrawals", async function () {
      await expect(
        vault.connect(owner).withdraw(recipient1.address, 0)
      ).to.be.revertedWithCustomError(vault, "ZeroWithdrawalAmount");
    });

    it("should reject withdrawal to zero address", async function () {
      await expect(
        vault.connect(owner).withdraw(ethers.ZeroAddress, ethers.parseEther("0.5"))
      ).to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("should reject withdrawal exceeding maxPerWithdrawal", async function () {
      const excessiveAmount = INITIAL_MAX_PER_WITHDRAWAL + 1n;
      await expect(
        vault.connect(owner).withdraw(recipient1.address, excessiveAmount)
      ).to.be.revertedWithCustomError(vault, "ExceedsMaxPerWithdrawal")
        .withArgs(excessiveAmount, INITIAL_MAX_PER_WITHDRAWAL);
    });

    it("should execute successful withdrawal, transfer native BOT, and update daily accounting", async function () {
      const withdrawAmount = ethers.parseEther("0.8");
      const currentDay = await vault.getCurrentDay();

      const recipientBeforeBalance = await ethers.provider.getBalance(recipient1.address);

      await expect(
        vault.connect(owner).withdraw(recipient1.address, withdrawAmount)
      )
        .to.emit(vault, "Withdrawal")
        .withArgs(recipient1.address, withdrawAmount, currentDay);

      const recipientAfterBalance = await ethers.provider.getBalance(recipient1.address);
      expect(recipientAfterBalance - recipientBeforeBalance).to.equal(withdrawAmount);

      expect(await vault.dailyWithdrawn(currentDay)).to.equal(withdrawAmount);
      expect(await vault.getCurrentDayWithdrawn()).to.equal(withdrawAmount);
      expect(await vault.getAvailableDailyAllowance()).to.equal(
        INITIAL_DAILY_LIMIT - withdrawAmount
      );
    });

    it("should allow multiple withdrawals up to the exact daily limit and reject exceeding it", async function () {
      // INITIAL_MAX_PER_WITHDRAWAL is 1.0 BOT, INITIAL_DAILY_LIMIT is 5.0 BOT
      const chunk = ethers.parseEther("1.0");

      for (let i = 0; i < 5; i++) {
        await vault.connect(owner).withdraw(recipient1.address, chunk);
      }

      const currentDay = await vault.getCurrentDay();
      expect(await vault.dailyWithdrawn(currentDay)).to.equal(INITIAL_DAILY_LIMIT);
      expect(await vault.getAvailableDailyAllowance()).to.equal(0);

      // Attempting any additional withdrawal on the same day must revert
      await expect(
        vault.connect(owner).withdraw(recipient1.address, 1n)
      ).to.be.revertedWithCustomError(vault, "ExceedsDailyLimit")
        .withArgs(1n, INITIAL_DAILY_LIMIT, INITIAL_DAILY_LIMIT);
    });

    it("should reject withdrawal when vault has insufficient balance", async function () {
      // Empty vault by deploying a new vault with only 0.2 BOT
      const BrailVault = await ethers.getContractFactory("BrailVault");
      const lowBalanceVault = await BrailVault.deploy(
        ethers.parseEther("1.0"),
        ethers.parseEther("5.0")
      );
      await lowBalanceVault.waitForDeployment();
      await lowBalanceVault.connect(owner).addRecipient(recipient1.address);

      // Deposit only 0.2 BOT
      await lowBalanceVault.connect(depositor).deposit({ value: ethers.parseEther("0.2") });

      // Request 0.5 BOT (under max per tx, under daily limit, but exceeds balance)
      await expect(
        lowBalanceVault.connect(owner).withdraw(
          recipient1.address,
          ethers.parseEther("0.5")
        )
      ).to.be.revertedWithCustomError(lowBalanceVault, "InsufficientVaultBalance")
        .withArgs(ethers.parseEther("0.5"), ethers.parseEther("0.2"));
    });
  });

  describe("6. UTC-Day Rollover & Allowance Refresh", function () {
    beforeEach(async function () {
      await vault.connect(depositor).deposit({ value: ethers.parseEther("20.0") });
      await vault.connect(owner).addRecipient(recipient1.address);
    });

    it("should reset available allowance when advancing to the next UTC day", async function () {
      const day1 = await vault.getCurrentDay();
      const chunk = ethers.parseEther("1.0");

      // Withdraw full daily limit on Day 1 (5 BOT)
      for (let i = 0; i < 5; i++) {
        await vault.connect(owner).withdraw(recipient1.address, chunk);
      }

      expect(await vault.dailyWithdrawn(day1)).to.equal(INITIAL_DAILY_LIMIT);
      expect(await vault.getAvailableDailyAllowance()).to.equal(0);

      // Advance blockchain time by exactly 1 full UTC day (86400 seconds)
      await time.increase(86400);

      const day2 = await vault.getCurrentDay();
      expect(day2).to.be.greaterThan(day1);

      // Confirmation: Yesterday's withdrawals do NOT count against today's allowance
      expect(await vault.dailyWithdrawn(day2)).to.equal(0);
      expect(await vault.getAvailableDailyAllowance()).to.equal(INITIAL_DAILY_LIMIT);

      // Withdrawals on the new day succeed up to the full daily limit again
      await expect(
        vault.connect(owner).withdraw(recipient1.address, chunk)
      ).to.emit(vault, "Withdrawal").withArgs(recipient1.address, chunk, day2);

      expect(await vault.dailyWithdrawn(day2)).to.equal(chunk);
    });
  });

  describe("7. Failed Transfer Reverts & Accounting Rollback", function () {
    beforeEach(async function () {
      await vault.connect(depositor).deposit({ value: ethers.parseEther("10.0") });
      // Approve the RejectingReceiver
      await vault.connect(owner).addRecipient(await rejectingReceiver.getAddress());
    });

    it("should revert transaction if destination rejects transfer and NOT consume daily allowance", async function () {
      const currentDay = await vault.getCurrentDay();
      const allowanceBefore = await vault.getAvailableDailyAllowance();
      const vaultBalanceBefore = await vault.getVaultBalance();

      const rejectingAddr = await rejectingReceiver.getAddress();

      // Attempt withdrawal to the rejecting contract
      await expect(
        vault.connect(owner).withdraw(rejectingAddr, ethers.parseEther("1.0"))
      ).to.be.revertedWithCustomError(vault, "WithdrawalTransferFailed");

      // Verify that daily accounting and balance were completely rolled back
      expect(await vault.dailyWithdrawn(currentDay)).to.equal(0);
      expect(await vault.getAvailableDailyAllowance()).to.equal(allowanceBefore);
      expect(await vault.getVaultBalance()).to.equal(vaultBalanceBefore);
    });
  });

  describe("8. Reentrancy Protection", function () {
    beforeEach(async function () {
      await vault.connect(depositor).deposit({ value: ethers.parseEther("10.0") });
      await vault.connect(owner).addRecipient(await maliciousReceiver.getAddress());
    });

    it("should protect against reentrant calls during withdrawal", async function () {
      const maliciousAddr = await maliciousReceiver.getAddress();

      // Owner initiates withdrawal to malicious contract, which tries to call withdraw again in receive()
      // The reentrant call is stopped by ReentrancyGuard and reverts
      await expect(
        vault.connect(owner).withdraw(maliciousAddr, ethers.parseEther("1.0"))
      ).to.be.reverted;

      // Vault balance remains intact
      expect(await vault.getVaultBalance()).to.equal(ethers.parseEther("10.0"));
    });
  });

  describe("9. Direct Blockchain Interaction (No Frontend Bypass)", function () {
    it("should strictly enforce all rules when called directly via raw contract calls", async function () {
      // Non-owner sends raw transaction to withdraw
      const vaultAddress = await vault.getAddress();
      const iface = vault.interface;
      const data = iface.encodeFunctionData("withdraw", [
        recipient1.address,
        ethers.parseEther("0.1"),
      ]);

      await expect(
        unapprovedUser.sendTransaction({
          to: vaultAddress,
          data: data,
        })
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });
});
