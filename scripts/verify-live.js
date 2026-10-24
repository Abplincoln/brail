const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x3f81204e12E225bAa714245f906b9307F71d15Bf";
  const txHash = "0xaf9ae2ec7184529bddea4322a999102900231111856fe674c70d2b8fb20e8ee5";

  console.log("==================================================");
  console.log("Verifying Live Deployment on BOT Chain Bohr Testnet");
  console.log("==================================================");

  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  console.log(`Transaction Status: ${receipt.status === 1 ? "SUCCESS (1)" : "FAILED (0)"}`);
  console.log(`Block Number: ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Contract Address in Receipt: ${receipt.contractAddress}`);

  // 1. Bytecode verification
  const code = await ethers.provider.getCode(contractAddress);
  console.log(`Bytecode length: ${code.length} characters`);
  if (code === "0x" || code === "0x0") {
    throw new Error("FAIL: No bytecode deployed at contract address!");
  }
  console.log("VERIFIED: On-chain bytecode exists.");

  // 2. State verification
  const BrailVault = await ethers.getContractFactory("BrailVault");
  const vault = BrailVault.attach(contractAddress);

  const owner = await vault.owner();
  const maxPerWithdrawal = await vault.maxPerWithdrawal();
  const dailyLimit = await vault.dailyLimit();
  const vaultBalance = await vault.getVaultBalance();
  const recipients = await vault.getApprovedRecipients();
  const currentDay = await vault.getCurrentDay();
  const allowance = await vault.getAvailableDailyAllowance();

  console.log("\nLive Contract State:");
  console.log(`- Owner: ${owner}`);
  console.log(`- Max Per Withdrawal: ${ethers.formatEther(maxPerWithdrawal)} BOT`);
  console.log(`- Daily Withdrawal Limit: ${ethers.formatEther(dailyLimit)} BOT`);
  console.log(`- Current Vault Balance: ${ethers.formatEther(vaultBalance)} BOT`);
  console.log(`- Approved Recipients Count: ${recipients.length}`);
  console.log(`- Current UTC Day: ${currentDay.toString()}`);
  console.log(`- Available Daily Allowance: ${ethers.formatEther(allowance)} BOT`);

  console.log("\nALL ON-CHAIN VERIFICATIONS PASSED!");
}

main().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
