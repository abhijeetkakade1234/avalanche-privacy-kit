import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const publicDir = path.join(repoRoot, "apps", "starter", "public");
const envPath = path.join(repoRoot, "contracts", ".env");
const deploymentPath = path.join(repoRoot, "output", "fuji-deployment.json");
const configPath = path.join(
  repoRoot,
  "apps",
  "starter",
  "src",
  "lib",
  "localDemoContracts.ts",
);
const logPath = path.join(repoRoot, "output", "fuji-privacy-flow.log");
const encryptedErcArtifactPath = path.join(
  publicDir,
  "deploy-artifacts",
  "encrypted-erc.json",
);
const encryptedErcAbi = JSON.parse(
  readFileSync(encryptedErcArtifactPath, "utf8"),
).abi;

mkdirSync(path.dirname(logPath), { recursive: true });
writeFileSync(logPath, "");
function log(message) {
  const line = `${new Date().toISOString()} ${message}`;
  appendFileSync(logPath, `${line}\n`);
  console.log(message);
}

function readEnv() {
  if (!existsSync(envPath)) {
    throw new Error("Missing contracts/.env with FUJI_PRIVATE_KEY");
  }

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function readDeployment() {
  if (existsSync(deploymentPath)) {
    return JSON.parse(readFileSync(deploymentPath, "utf8"));
  }

  const config = readFileSync(configPath, "utf8");
  const standalone = config.match(
    /standalone:\s*{[\s\S]*?contractAddress:\s*"(?<address>0x[a-fA-F0-9]{40})"/,
  )?.groups?.address;
  if (!standalone) {
    throw new Error("No standalone repo-owned Fuji contract configured");
  }

  return { standalone };
}

function asset(name) {
  const value = path.join(publicDir, name);
  if (!existsSync(value)) {
    throw new Error(`Missing proof asset ${name}`);
  }
  return value;
}

async function wait(publicClient, transactionHash) {
  log(`Waiting for ${transactionHash}`);
  let receipt;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      receipt = await publicClient.getTransactionReceipt({
        hash: transactionHash,
      });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  if (!receipt) {
    throw new Error(`Timed out waiting for ${transactionHash}`);
  }

  if (receipt.status !== "success") {
    throw new Error(`Transaction failed: ${transactionHash}`);
  }
  return transactionHash;
}

function encryptedBalanceParts(balance) {
  const eGCT = balance[0];
  return [eGCT.c1.x, eGCT.c1.y, eGCT.c2.x, eGCT.c2.y];
}

const env = readEnv();
const privateKey = env.FUJI_PRIVATE_KEY?.startsWith("0x")
  ? env.FUJI_PRIVATE_KEY
  : `0x${env.FUJI_PRIVATE_KEY ?? ""}`;
if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
  throw new Error("FUJI_PRIVATE_KEY is missing or invalid");
}

const deployment = readDeployment();
const account = privateKeyToAccount(privateKey);
const rpcUrl = env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(rpcUrl),
});
const walletClient = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(rpcUrl),
});

log("Loading eERC SDK");
// ponytail: package main points at a missing CJS file; import the shipped ESM build directly.
const { EERC } = await import("../node_modules/@avalabs/eerc-sdk/dist/index.js");

const registrar = await publicClient.readContract({
  address: deployment.standalone,
  abi: encryptedErcAbi,
  functionName: "registrar",
});
log(`Using ${deployment.standalone} with ${account.address}`);
const circuitURLs = {
  register: {
    wasm: asset("registration.wasm"),
    zkey: asset("registration.zkey"),
  },
  transfer: {
    wasm: asset("transfer.wasm"),
    zkey: asset("transfer.zkey"),
  },
  mint: {
    wasm: asset("mint.wasm"),
    zkey: asset("mint.zkey"),
  },
  withdraw: {
    wasm: asset("withdraw.wasm"),
    zkey: asset("withdraw.zkey"),
  },
  burn: {
    wasm: asset("burn.wasm"),
    zkey: asset("burn.zkey"),
  },
};

let eerc = new EERC(
  publicClient,
  walletClient,
  deployment.standalone,
  registrar,
  false,
  circuitURLs,
);

const registered = await eerc.fetchPublicKey(account.address);
let decryptionKey;
let registerTx = "already registered";
if (registered[0] === 0n && registered[1] === 0n) {
  log("Registering wallet privacy key");
  const result = await eerc.register();
  decryptionKey = result.key;
  registerTx = await wait(publicClient, result.transactionHash);
} else {
  log("Wallet privacy key already registered");
  decryptionKey = await eerc.generateDecryptionKey();
}

eerc = new EERC(
  publicClient,
  walletClient,
  deployment.standalone,
  registrar,
  false,
  circuitURLs,
  decryptionKey,
);

let auditorTx = "already set";
let isAuditorKeySet = await publicClient.readContract({
  address: deployment.standalone,
  abi: encryptedErcAbi,
  functionName: "isAuditorKeySet",
});
if (!isAuditorKeySet) {
  log("Setting contract auditor");
  auditorTx = await wait(
    publicClient,
    await eerc.setContractAuditorPublicKey(account.address),
  );
  isAuditorKeySet = true;
} else {
  log("Contract auditor already set");
}

if (!isAuditorKeySet) {
  throw new Error("Auditor key is not set");
}

const auditorPublicKey = await publicClient.readContract({
  address: deployment.standalone,
  abi: encryptedErcAbi,
  functionName: "auditorPublicKey",
});
const mintAmount = parseUnits("1", 2);
log("Minting private balance");
const mintResult = await eerc.privateMint(
  account.address,
  mintAmount,
  auditorPublicKey,
);
const mintTx = await wait(publicClient, mintResult.transactionHash);

const balanceAfterMint = await publicClient.readContract({
  address: deployment.standalone,
  abi: encryptedErcAbi,
  functionName: "balanceOfStandalone",
  args: [account.address],
});
const decryptedBalance = eerc.calculateTotalBalance(
  balanceAfterMint[0],
  balanceAfterMint[2],
  balanceAfterMint[3],
);
if (decryptedBalance < mintAmount) {
  throw new Error(`Private balance did not increase; got ${decryptedBalance}`);
}

const transferAmount = parseUnits("0.01", 2);
log("Sending private transfer to self");
const transferResult = await eerc.transfer(
  account.address,
  transferAmount,
  encryptedBalanceParts(balanceAfterMint),
  decryptedBalance,
  auditorPublicKey,
);
const transferTx = await wait(publicClient, transferResult.transactionHash);

const summary = {
  account: account.address,
  contract: deployment.standalone,
  registrar,
  registerTx,
  auditorTx,
  mintTx,
  transferTx,
  privateBalanceAfterMint: decryptedBalance.toString(),
};

log("Fuji privacy flow proved");
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
