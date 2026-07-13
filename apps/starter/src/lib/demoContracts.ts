import { isAddress } from "viem";
import { localDemoContracts } from "./localDemoContracts";

export type DemoPreset = "standalone" | "converter";
export const LOCAL_DEMO_CONTRACTS_STORAGE_KEY = "apk.localDemoContracts";

const sharedDemoContracts = {
  standalone: {
    label: "Verified Fuji standalone sample",
    contractAddress: "0x5E9c6F952fB9615583182e70eDDC4e6E4E0aC0e0",
    tokenAddress: undefined,
  },
  converter: {
    label: "Verified Fuji converter sample",
    contractAddress: "0x372dAB27c8d223Af11C858ea00037Dc03053B22E",
    tokenAddress: "0xb0Fe621B4Bd7fe4975f7c58E3D6ADaEb2a2A35CD",
  },
} as const satisfies Record<
  DemoPreset,
  {
    label: string;
    contractAddress: `0x${string}`;
    tokenAddress?: `0x${string}`;
  }
>;

const ownedDemoContracts = localDemoContracts as Partial<
  Record<
    DemoPreset,
    {
      label: string;
      contractAddress: `0x${string}`;
      tokenAddress?: `0x${string}`;
    }
  >
>;

export function readStoredDemoContracts() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_DEMO_CONTRACTS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Partial<
      Record<
        DemoPreset,
        {
          label?: string;
          contractAddress?: string;
          tokenAddress?: string;
        }
      >
    >;

    const next: Partial<
      Record<
        DemoPreset,
        {
          label: string;
          contractAddress: `0x${string}`;
          tokenAddress?: `0x${string}`;
        }
      >
    > = {};
    for (const preset of ["standalone", "converter"] as const) {
      const value = parsed[preset];
      if (!value?.contractAddress || !isAddress(value.contractAddress)) {
        continue;
      }

      next[preset] = {
        label: value.label?.trim() || `Repo-owned ${preset} deployment`,
        contractAddress: value.contractAddress,
        tokenAddress:
          value.tokenAddress && isAddress(value.tokenAddress)
            ? value.tokenAddress
            : undefined,
      };
    }
    return next;
  } catch {
    return {};
  }
}

const storedDemoContracts = readStoredDemoContracts();

export const demoContracts = {
  standalone: {
    ...sharedDemoContracts.standalone,
    ...ownedDemoContracts.standalone,
    ...storedDemoContracts.standalone,
  },
  converter: {
    ...sharedDemoContracts.converter,
    ...ownedDemoContracts.converter,
    ...storedDemoContracts.converter,
  },
} as const satisfies Record<
  DemoPreset,
  {
    label: string;
    contractAddress: `0x${string}`;
    tokenAddress?: `0x${string}`;
  }
>;
