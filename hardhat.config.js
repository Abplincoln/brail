require("@nomicfoundation/hardhat-toolbox");
const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Ignore if not present
  }
}

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const accounts = deployerKey
  ? [deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    bohrTestnet: {
      url: "https://rpc.bohr.life",
      chainId: 968,
      accounts: accounts,
    },
  },
};
