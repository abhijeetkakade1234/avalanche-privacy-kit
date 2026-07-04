import { isAddress } from "viem";
import { demoContracts, type DemoPreset } from "./demoContracts";

const requiredFields = [] as const;
const defaultPreset: DemoPreset = "standalone";

type RequiredField = (typeof requiredFields)[number];

export type StarterConfig = {
  preset: DemoPreset;
  presetLabel: string;
  contractAddress?: `0x${string}`;
  tokenAddress?: `0x${string}`;
  isCustomOverride: boolean;
  usingDefaultContract: boolean;
  circuitUrls?: {
    register: { wasm: string; zkey: string };
    transfer: { wasm: string; zkey: string };
    mint: { wasm: string; zkey: string };
    withdraw: { wasm: string; zkey: string };
    burn: { wasm: string; zkey: string };
  };
  missing: RequiredField[];
  invalid: string[];
};

function readEnvValue(name: string) {
  const value = import.meta.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPreset(): DemoPreset {
  const value = readEnvValue("VITE_EERC_PRESET");
  return value === "converter" ? "converter" : defaultPreset;
}

export function getStarterConfig(): StarterConfig {
  const missing = requiredFields.filter((field) => !readEnvValue(field));
  const preset = readPreset();
  const presetConfig = demoContracts[preset];
  const invalid: string[] = [];

  const rawContractAddress =
    readEnvValue("VITE_EERC_CONTRACT_ADDRESS") ?? presetConfig.contractAddress;
  const rawTokenAddress =
    readEnvValue("VITE_EERC_TOKEN_ADDRESS") ?? presetConfig.tokenAddress;

  const contractAddress = rawContractAddress && isAddress(rawContractAddress)
    ? rawContractAddress
    : undefined;
  const tokenAddress = rawTokenAddress && isAddress(rawTokenAddress)
    ? rawTokenAddress
    : undefined;

  if (rawContractAddress && !contractAddress) {
    invalid.push("VITE_EERC_CONTRACT_ADDRESS");
  }

  if (rawTokenAddress && !tokenAddress) {
    invalid.push("VITE_EERC_TOKEN_ADDRESS");
  }

  if (missing.length > 0 || invalid.length > 0 || !contractAddress) {
    return {
      preset,
      presetLabel: presetConfig.label,
      contractAddress: contractAddress as `0x${string}` | undefined,
      tokenAddress: tokenAddress as `0x${string}` | undefined,
      isCustomOverride:
        contractAddress !== presetConfig.contractAddress ||
        tokenAddress !== presetConfig.tokenAddress,
      usingDefaultContract: contractAddress === presetConfig.contractAddress,
      missing,
      invalid,
    };
  }

  return {
    preset,
    presetLabel: presetConfig.label,
    contractAddress: contractAddress as `0x${string}`,
    tokenAddress: tokenAddress as `0x${string}` | undefined,
    isCustomOverride:
      contractAddress !== presetConfig.contractAddress ||
      tokenAddress !== presetConfig.tokenAddress,
    usingDefaultContract: contractAddress === presetConfig.contractAddress,
    circuitUrls: {
      register: {
        wasm: "/registration.wasm",
        zkey: "/registration.zkey",
      },
      transfer: {
        wasm: "/transfer.wasm",
        zkey: "/transfer.zkey",
      },
      mint: {
        wasm: "/mint.wasm",
        zkey: "/mint.zkey",
      },
      withdraw: {
        wasm: "/withdraw.wasm",
        zkey: "/withdraw.zkey",
      },
      burn: {
        wasm: "/burn.wasm",
        zkey: "/burn.zkey",
      },
    },
    missing: [],
    invalid: [],
  };
}
