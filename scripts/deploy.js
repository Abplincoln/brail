const { ethers, network } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log(`Starting BrailVault Deployment on Network: ${network.name}`);
  console.log("==================================================");

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("Error: No deployer account configured.");
    console.error("Please set DEPLOYER_PRIVATE_KEY in your .env file.");
    process.exit(1);
  }

  const deployer = signers[0];
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`Deployer Account: ${deployerAddress}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} native currency`);

  if (balance === 0n && network.name !== "hardhat") {
    console.error("Error: Deployer balance is 0. Please fund this account from the faucet: https://faucet.botchain.ai/basic");
    process.exit(1);
  }

  // Initial Vault Configuration:
  // - Maximum per single withdrawal: 1.0 BOT
  // - Cumulative daily limit: 5.0 BOT
  const initialMaxPerWithdrawal = ethers.parseEther("1.0");
  const initialDailyLimit = ethers.parseEther("5.0");

  console.log("\nConfigured Initial Parameters:");
  console.log(`- Max Per Withdrawal: ${ethers.formatEther(initialMaxPerWithdrawal)} BOT`);
  console.log(`- Daily Withdrawal Limit: ${ethers.formatEther(initialDailyLimit)} BOT`);

  console.log("\nDeploying BrailVault...");
  const BrailVault = await ethers.getContractFactory("BrailVault");
  const vault = await BrailVault.deploy(initialMaxPerWithdrawal, initialDailyLimit);

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  const deployTx = vault.deploymentTransaction();

  console.log("\n--------------------------------------------------");
  console.log("SUCCESS: BrailVault deployed successfully!");
  console.log(`Contract Address: ${vaultAddress}`);
  if (deployTx) {
    console.log(`Transaction Hash: ${deployTx.hash}`);
    if (network.name === "bohrTestnet") {
      console.log(`Explorer Link: https://scan.bohr.life/tx/${deployTx.hash}`);
      console.log(`Contract Link: https://scan.bohr.life/address/${vaultAddress}`);
    }
  }
  console.log("--------------------------------------------------");
  console.log("\nNext Steps:");
  console.log(`1. Add to .env: VITE_VAULT_ADDRESS=${vaultAddress}`);
  console.log("2. Launch frontend: npm run dev");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
