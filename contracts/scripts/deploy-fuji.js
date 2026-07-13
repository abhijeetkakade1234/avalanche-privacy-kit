const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

const DECIMALS = 2;

async function deploy(name, args = [], options = {}) {
  const factory = await hre.ethers.getContractFactory(name, options);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

async function main() {
  const privateKey = process.env.FUJI_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Missing FUJI_PRIVATE_KEY or PRIVATE_KEY for Fuji deployment.");
  }

  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();

  const registrationVerifier = await deploy("RegistrationVerifier");
  const mintVerifier = await deploy("MintVerifier");
  const withdrawVerifier = await deploy("WithdrawVerifier");
  const transferVerifier = await deploy("TransferVerifier");
  const burnVerifier = await deploy("BurnVerifier");
  const babyJubJub = await deploy("BabyJubJub");
  const registrar = await deploy("Registrar", [await registrationVerifier.getAddress()]);

  const standalone = await deploy(
    "EncryptedERC",
    [
      {
        registrar: await registrar.getAddress(),
        isConverter: false,
        name: "Avalanche Private Token",
        symbol: "APVT",
        decimals: DECIMALS,
        mintVerifier: await mintVerifier.getAddress(),
        withdrawVerifier: await withdrawVerifier.getAddress(),
        transferVerifier: await transferVerifier.getAddress(),
        burnVerifier: await burnVerifier.getAddress(),
      },
    ],
    {
      libraries: {
        BabyJubJub: await babyJubJub.getAddress(),
      },
    },
  );

  const demoToken = await deploy("SimpleERC20", ["DemoToken", "DMT", 18]);
  const mintTx = await demoToken.mint(deployer.address, hre.ethers.parseEther("10000"));
  await mintTx.wait();

  const converter = await deploy(
    "EncryptedERC",
    [
      {
        registrar: await registrar.getAddress(),
        isConverter: true,
        name: "",
        symbol: "",
        decimals: DECIMALS,
        mintVerifier: await mintVerifier.getAddress(),
        withdrawVerifier: await withdrawVerifier.getAddress(),
        transferVerifier: await transferVerifier.getAddress(),
        burnVerifier: await burnVerifier.getAddress(),
      },
    ],
    {
      libraries: {
        BabyJubJub: await babyJubJub.getAddress(),
      },
    },
  );

  const deployment = {
    network: "fuji",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    registrationVerifier: await registrationVerifier.getAddress(),
    mintVerifier: await mintVerifier.getAddress(),
    withdrawVerifier: await withdrawVerifier.getAddress(),
    transferVerifier: await transferVerifier.getAddress(),
    burnVerifier: await burnVerifier.getAddress(),
    babyJubJub: await babyJubJub.getAddress(),
    registrar: await registrar.getAddress(),
    standalone: await standalone.getAddress(),
    converter: await converter.getAddress(),
    demoToken: await demoToken.getAddress(),
  };

  const repoRoot = path.resolve(__dirname, "..", "..");
  const outputPath = path.join(repoRoot, "output", "fuji-deployment.json");
  const appConfigPath = path.join(
    repoRoot,
    "apps",
    "starter",
    "src",
    "lib",
    "localDemoContracts.ts",
  );
  const envLocalPath = path.join(repoRoot, "apps", "starter", ".env.local");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(deployment, null, 2)}\n`);
  fs.writeFileSync(
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
  fs.writeFileSync(envLocalPath, "VITE_EERC_PRESET=standalone\n");

  console.table(deployment);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
