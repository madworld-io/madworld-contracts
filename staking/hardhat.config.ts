import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import { config as dotenvConfig } from "dotenv";
import { readdirSync } from "fs";
import "hardhat-contract-sizer";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import { HardhatUserConfig } from "hardhat/config";
import { NetworkUserConfig } from "hardhat/types";
import { join, resolve } from "path";
import "solidity-coverage";
require("hardhat-contract-sizer");
require("./tasks");

dotenvConfig({ path: resolve(__dirname, "./.env") });

// init typechain for the first time
try {
  readdirSync(join(__dirname, "typechain"));
} catch {
  //
}

const chainIds = {
  goerli: 5,
  hardhat: 31337,
  kovan: 42,
  mainnet: 1,
  rinkeby: 4,
  ropsten: 3,
  polygon: 137,
};

// Ensure that we have all the environment variables we need.
const deployerPrivateKey: string | undefined = process.env.DEPLOYER_PRIVATE_KEY;
if (!deployerPrivateKey) {
  throw new Error("Please set your DEPLOYER_PRIVATE_KEY in a .env file");
}

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

function getChainConfig(network: keyof typeof chainIds): NetworkUserConfig {
  let url: string = "https://" + network + ".infura.io/v3/" + infuraApiKey;
  if (network === "polygon") {
    url = "https://polygon-rpc.com";
  }
  return {
    accounts: [`0x${deployerPrivateKey}`],
    chainId: chainIds[network],
    url,
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
    src: "./contracts",
  },
  networks: {
    hardhat: {
      chainId: chainIds.hardhat,
      accounts: {
        accountsBalance: "1000000000000000000000000000000",
      },
    },
    goerli: getChainConfig("goerli"),
    kovan: getChainConfig("kovan"),
    rinkeby: getChainConfig("rinkeby"),
    ropsten: getChainConfig("ropsten"),
    polygon: getChainConfig("polygon"),
  },
  etherscan: {
    // Your API key for Etherscan
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
    deploy: "./deployments/migrations",
    deployments: "./deployments/artifacts",
  },
  solidity: {
    compilers: [
      {
        version: "0.5.16",
      },
      {
        version: "0.7.6",
      },
      {
        version: "0.8.0",
        settings: {
          metadata: {
            // Not including the metadata hash
            // https://github.com/paulrberg/solidity-template/issues/31
            bytecodeHash: "none",
          },
          // Disable the optimizer when debugging
          // https://hardhat.org/hardhat-network/#solidity-optimizer-support
          optimizer: {
            enabled: true,
            runs: 800,
          },
          outputSelection: {
            "*": {
              "*": ["storageLayout"],
            },
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
