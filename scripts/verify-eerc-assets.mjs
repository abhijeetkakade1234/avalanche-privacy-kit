import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, "apps", "starter", "public");

const expectedArtifacts = {
  "deploy-artifacts/registration-verifier.json": {
    contractName: "RegistrationVerifier",
    sourceName: "contracts/prod/RegistrationVerifier.sol",
  },
  "deploy-artifacts/mint-verifier.json": {
    contractName: "MintVerifier",
    sourceName: "contracts/prod/MintVerifier.sol",
  },
  "deploy-artifacts/withdraw-verifier.json": {
    contractName: "WithdrawVerifier",
    sourceName: "contracts/prod/WithdrawVerifier.sol",
  },
  "deploy-artifacts/transfer-verifier.json": {
    contractName: "TransferVerifier",
    sourceName: "contracts/prod/TransferVerifier.sol",
  },
  "deploy-artifacts/burn-verifier.json": {
    contractName: "BurnVerifier",
    sourceName: "contracts/prod/BurnVerifier.sol",
  },
  "deploy-artifacts/babyjubjub.json": {
    contractName: "BabyJubJub",
    sourceName: "contracts/libraries/BabyJubJub.sol",
  },
  "deploy-artifacts/registrar.json": {
    contractName: "Registrar",
    sourceName: "contracts/Registrar.sol",
  },
  "deploy-artifacts/encrypted-erc.json": {
    contractName: "EncryptedERC",
    sourceName: "contracts/EncryptedERC.sol",
  },
  "deploy-artifacts/simple-erc20.json": {
    contractName: "SimpleERC20",
    sourceName: "contracts/tokens/SimpleERC20.sol",
  },
};

const expectedCircuitFiles = [
  "registration.wasm",
  "registration.zkey",
  "mint.wasm",
  "mint.zkey",
  "transfer.wasm",
  "transfer.zkey",
  "withdraw.wasm",
  "withdraw.zkey",
  "burn.wasm",
  "burn.zkey",
];

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(publicDir, relativePath), "utf8"));
}

for (const file of expectedCircuitFiles) {
  const fullPath = path.join(publicDir, file);
  if (!existsSync(fullPath)) {
    throw new Error(`Missing circuit asset: ${file}`);
  }
}

for (const [file, expected] of Object.entries(expectedArtifacts)) {
  const artifact = readJson(file);
  if (artifact.contractName !== expected.contractName) {
    throw new Error(
      `${file} contractName mismatch: expected ${expected.contractName}, got ${artifact.contractName}`,
    );
  }
  if (artifact.sourceName !== expected.sourceName) {
    throw new Error(
      `${file} sourceName mismatch: expected ${expected.sourceName}, got ${artifact.sourceName}`,
    );
  }
  if (!artifact.bytecode || artifact.bytecode === "0x") {
    throw new Error(`${file} is missing deployable bytecode`);
  }
}

console.log("eERC public assets and deploy artifacts are aligned");
