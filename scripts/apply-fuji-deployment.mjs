import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const deploymentPath = path.join(repoRoot, "output", "fuji-deployment.json");
const appConfigPath = path.join(
  repoRoot,
  "apps",
  "starter",
  "src",
  "lib",
  "localDemoContracts.ts",
);
const envLocalPath = path.join(repoRoot, "apps", "starter", ".env.local");

const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
const addressPattern = /^0x[a-fA-F0-9]{40}$/;

for (const key of ["standalone", "converter", "demoToken"]) {
  if (!addressPattern.test(deployment[key])) {
    throw new Error(`output/fuji-deployment.json has invalid ${key}`);
  }
}

writeFileSync(
  appConfigPath,
  `export const localDemoContracts = {
  standalone: {
    label: "Repo-owned Fuji standalone deployment",
    contractAddress: "${deployment.standalone}",
  },
  converter: {
    label: "Repo-owned Fuji converter deployment",
    contractAddress: "${deployment.converter}",
    tokenAddress: "${deployment.demoToken}",
  },
};\n`,
);

mkdirSync(path.dirname(envLocalPath), { recursive: true });
writeFileSync(envLocalPath, "VITE_EERC_PRESET=standalone\n");

console.log(`Applied ${deploymentPath} to starter config`);
