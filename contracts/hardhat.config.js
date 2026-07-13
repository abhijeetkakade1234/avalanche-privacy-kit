require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

const rpcUrl =
  process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const privateKey = process.env.FUJI_PRIVATE_KEY || process.env.PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
  },
  networks: {
    fuji: {
      url: rpcUrl,
      accounts: privateKey ? [privateKey] : [],
      chainId: 43113,
    },
  },
};
