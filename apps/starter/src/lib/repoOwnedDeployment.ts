import type { Abi, Address, Hex } from "viem";
import { avalancheFuji } from "wagmi/chains";
import {
  DEPLOY_ARTIFACTS_VERSION,
  LOCAL_DEMO_CONTRACTS_STORAGE_KEY,
} from "./demoContracts";

type Artifact = {
  abi: Abi;
  bytecode: Hex;
  linkReferences?: Record<string, Record<string, { start: number; length: number }[]>>;
};

type Deployment = {
  deployer: Address;
  standalone: Address;
  converter: Address;
  demoToken: Address;
};

const DECIMALS = 2;

const artifactPaths = {
  registrationVerifier: "/deploy-artifacts/registration-verifier.json",
  mintVerifier: "/deploy-artifacts/mint-verifier.json",
  withdrawVerifier: "/deploy-artifacts/withdraw-verifier.json",
  transferVerifier: "/deploy-artifacts/transfer-verifier.json",
  burnVerifier: "/deploy-artifacts/burn-verifier.json",
  babyJubJub: "/deploy-artifacts/babyjubjub.json",
  registrar: "/deploy-artifacts/registrar.json",
  encryptedErc: "/deploy-artifacts/encrypted-erc.json",
  simpleErc20: "/deploy-artifacts/simple-erc20.json",
} as const;

async function loadArtifact(path: string): Promise<Artifact> {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Missing deploy artifact: ${path}`);
  }
  return response.json();
}

function linkBytecode(
  bytecode: Hex,
  linkReferences: Artifact["linkReferences"],
  libraries: Record<string, Address>,
): Hex {
  if (!linkReferences) {
    return bytecode;
  }

  let value = bytecode.slice(2);
  for (const contracts of Object.values(linkReferences)) {
    for (const [libraryName, references] of Object.entries(contracts)) {
      const address = libraries[libraryName];
      if (!address) {
        throw new Error(`Missing deployed library address for ${libraryName}`);
      }

      const replacement = address.slice(2).toLowerCase();
      for (const reference of references) {
        const start = reference.start * 2;
        const length = reference.length * 2;
        value =
          value.slice(0, start) +
          replacement +
          value.slice(start + length);
      }
    }
  }

  return `0x${value}` as Hex;
}

async function deployArtifact({
  abi,
  args = [],
  bytecode,
  publicClient,
  walletClient,
  account,
  nonce,
}: {
  abi: Abi;
  args?: readonly unknown[];
  bytecode: Hex;
  publicClient: any;
  walletClient: any;
  account: Address;
  nonce: number;
}) {
  const hash = await walletClient.deployContract({
    abi,
    account,
    args,
    bytecode,
    chain: avalancheFuji,
    nonce,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error(`Deployment receipt missing contract address for ${hash}`);
  }
  return receipt.contractAddress as Address;
}

export async function deployRepoOwnedFujiStack({
  publicClient,
  walletClient,
  account,
  onStatus,
}: {
  publicClient: any;
  walletClient: any;
  account: Address;
  onStatus?: (status: string) => void;
}): Promise<Deployment> {
  const [
    registrationVerifierArtifact,
    mintVerifierArtifact,
    withdrawVerifierArtifact,
    transferVerifierArtifact,
    burnVerifierArtifact,
    babyJubJubArtifact,
    registrarArtifact,
    encryptedErcArtifact,
    simpleErc20Artifact,
  ] = await Promise.all(
    Object.values(artifactPaths).map((path) => loadArtifact(path)),
  );
  let nonce = await publicClient.getTransactionCount({
    address: account,
    blockTag: "pending",
  });

  onStatus?.("Deploying registration verifier");
  const registrationVerifier = await deployArtifact({
    abi: registrationVerifierArtifact.abi,
    bytecode: registrationVerifierArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying mint verifier");
  const mintVerifier = await deployArtifact({
    abi: mintVerifierArtifact.abi,
    bytecode: mintVerifierArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying withdraw verifier");
  const withdrawVerifier = await deployArtifact({
    abi: withdrawVerifierArtifact.abi,
    bytecode: withdrawVerifierArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying transfer verifier");
  const transferVerifier = await deployArtifact({
    abi: transferVerifierArtifact.abi,
    bytecode: transferVerifierArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying burn verifier");
  const burnVerifier = await deployArtifact({
    abi: burnVerifierArtifact.abi,
    bytecode: burnVerifierArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying BabyJubJub library");
  const babyJubJub = await deployArtifact({
    abi: babyJubJubArtifact.abi,
    bytecode: babyJubJubArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying registrar");
  const registrar = await deployArtifact({
    abi: registrarArtifact.abi,
    args: [registrationVerifier],
    bytecode: registrarArtifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  const encryptedErcBytecode = linkBytecode(
    encryptedErcArtifact.bytecode,
    encryptedErcArtifact.linkReferences,
    { BabyJubJub: babyJubJub },
  );

  onStatus?.("Deploying standalone eERC");
  const standalone = await deployArtifact({
    abi: encryptedErcArtifact.abi,
    args: [
      {
        registrar,
        isConverter: false,
        name: "Avalanche Private Token",
        symbol: "APVT",
        decimals: DECIMALS,
        mintVerifier,
        withdrawVerifier,
        transferVerifier,
        burnVerifier,
      },
    ],
    bytecode: encryptedErcBytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Deploying demo ERC20");
  const demoToken = await deployArtifact({
    abi: simpleErc20Artifact.abi,
    args: ["DemoToken", "DMT", 18],
    bytecode: simpleErc20Artifact.bytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });
  nonce += 1;

  onStatus?.("Minting demo ERC20");
  const mintHash = await walletClient.writeContract({
    address: demoToken,
    abi: simpleErc20Artifact.abi,
    functionName: "mint",
    args: [account, 10_000n * 10n ** 18n],
    account,
    chain: avalancheFuji,
    nonce,
  });
  await publicClient.waitForTransactionReceipt({ hash: mintHash });
  nonce += 1;

  onStatus?.("Deploying converter eERC");
  const converter = await deployArtifact({
    abi: encryptedErcArtifact.abi,
    args: [
      {
        registrar,
        isConverter: true,
        name: "",
        symbol: "",
        decimals: DECIMALS,
        mintVerifier,
        withdrawVerifier,
        transferVerifier,
        burnVerifier,
      },
    ],
    bytecode: encryptedErcBytecode,
    publicClient,
    walletClient,
    account,
    nonce,
  });

  const deployment = {
    deployer: account,
    standalone,
    converter,
    demoToken,
  };

  window.localStorage.setItem(
    LOCAL_DEMO_CONTRACTS_STORAGE_KEY,
    JSON.stringify({
      version: DEPLOY_ARTIFACTS_VERSION,
      standalone: {
        label: "Repo-owned Fuji standalone deployment",
        contractAddress: standalone,
      },
      converter: {
        label: "Repo-owned Fuji converter deployment",
        contractAddress: converter,
        tokenAddress: demoToken,
      },
    }),
  );

  onStatus?.("Deployment complete");
  return deployment;
}
