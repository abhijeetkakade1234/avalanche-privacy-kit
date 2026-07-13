import { copyFileSync, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "apps", "starter", "public");
const assetSourceDir = path.join(repoRoot, "contracts", "assets");

const files = [
  {
    source: "registration.wasm",
    output: "registration.wasm",
  },
  {
    source: "registration.zkey",
    output: "registration.zkey",
  },
  {
    source: "mint.wasm",
    output: "mint.wasm",
  },
  {
    source: "mint.zkey",
    output: "mint.zkey",
  },
  {
    source: "transfer.wasm",
    output: "transfer.wasm",
  },
  {
    source: "transfer.zkey",
    output: "transfer.zkey",
  },
  {
    source: "withdraw.wasm",
    output: "withdraw.wasm",
  },
  {
    source: "withdraw.zkey",
    output: "withdraw.zkey",
  },
  {
    source: "burn.wasm",
    output: "burn.wasm",
  },
  {
    source: "burn.zkey",
    output: "burn.zkey",
  },
];

const artifactFiles = [
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "prod",
      "RegistrationVerifier.sol",
      "RegistrationVerifier.json",
    ),
    output: "registration-verifier.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "prod",
      "MintVerifier.sol",
      "MintVerifier.json",
    ),
    output: "mint-verifier.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "prod",
      "WithdrawVerifier.sol",
      "WithdrawVerifier.json",
    ),
    output: "withdraw-verifier.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "prod",
      "TransferVerifier.sol",
      "TransferVerifier.json",
    ),
    output: "transfer-verifier.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "prod",
      "BurnVerifier.sol",
      "BurnVerifier.json",
    ),
    output: "burn-verifier.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "libraries",
      "BabyJubJub.sol",
      "BabyJubJub.json",
    ),
    output: "babyjubjub.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "Registrar.sol",
      "Registrar.json",
    ),
    output: "registrar.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "EncryptedERC.sol",
      "EncryptedERC.json",
    ),
    output: "encrypted-erc.json",
  },
  {
    source: path.join(
      repoRoot,
      "contracts",
      "artifacts",
      "contracts",
      "tokens",
      "SimpleERC20.sol",
      "SimpleERC20.json",
    ),
    output: "simple-erc20.json",
  },
];

await mkdir(outputDir, { recursive: true });
await mkdir(path.join(outputDir, "deploy-artifacts"), { recursive: true });

for (const file of files) {
  const sourcePath = path.join(assetSourceDir, file.source);
  const targetPath = path.join(outputDir, file.output);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    continue;
  }
  throw new Error(`Missing local source for ${file.output}: ${sourcePath}`);
}

for (const file of artifactFiles) {
  if (!existsSync(file.source)) {
    throw new Error(`Missing compiled artifact for ${file.output}: ${file.source}`);
  }
  copyFileSync(file.source, path.join(outputDir, "deploy-artifacts", file.output));
}

await writeFile(
  path.join(outputDir, "eerc-assets.json"),
  JSON.stringify(
    {
      source: {
        deployment: "repo-owned tracked assets",
        circuits: "contracts/assets",
        deployArtifacts: "contracts/artifacts/contracts",
      },
      files: files.map((file) => ({
        output: file.output,
        source: file.source,
      })),
      deployArtifacts: artifactFiles.map((file) => ({
        output: `deploy-artifacts/${file.output}`,
        source: path.relative(repoRoot, file.source).replaceAll("\\", "/"),
      })),
    },
    null,
    2,
  ),
);

console.log(`eERC assets ready in ${outputDir}`);
