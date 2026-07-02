export type DemoPreset = "standalone" | "converter";

export const demoContracts = {
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
