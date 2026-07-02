import { copyFileSync, existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();
const outputDir = path.join(repoRoot, "apps", "starter", "public");
const sourceDir = path.join(
  repoRoot,
  ".codex",
  "references",
  "EncryptedERC",
  "circom",
  "build",
);

const files = [
  {
    source: path.join("registration", "registration.wasm"),
    output: "registration.wasm",
  },
  {
    source: path.join("registration", "circuit_final.zkey"),
    output: "registration.zkey",
  },
  {
    source: path.join("mint", "mint.wasm"),
    output: "mint.wasm",
  },
  {
    source: path.join("mint", "mint.zkey"),
    output: "mint.zkey",
  },
  {
    source: path.join("transfer", "transfer.wasm"),
    output: "transfer.wasm",
  },
  {
    source: path.join("transfer", "transfer.zkey"),
    output: "transfer.zkey",
  },
  {
    source: path.join("withdraw", "withdraw.wasm"),
    output: "withdraw.wasm",
  },
  {
    source: path.join("withdraw", "circuit_final.zkey"),
    output: "withdraw.zkey",
  },
  {
    source: path.join("burn", "burn.wasm"),
    output: "burn.wasm",
  },
  {
    source: path.join("burn", "burn.zkey"),
    output: "burn.zkey",
  },
];

const baseUrl =
  "https://raw.githubusercontent.com/ava-labs/EncryptedERC/main/circom/build";

await mkdir(outputDir, { recursive: true });

for (const file of files) {
  const sourcePath = path.join(sourceDir, file.source);
  const targetPath = path.join(outputDir, file.output);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    continue;
  }

  const response = await fetch(`${baseUrl}/${file.source.replaceAll("\\", "/")}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${file.output}: ${response.status}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, data);
}

await writeFile(
  path.join(outputDir, "eerc-assets.json"),
  JSON.stringify(
    {
      source: "https://github.com/ava-labs/EncryptedERC",
      files: files.map((file) => file.output),
    },
    null,
    2,
  ),
);

console.log(`eERC assets ready in ${outputDir}`);
