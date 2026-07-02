import { createPublicClient, http } from "viem";
import { avalancheFuji } from "viem/chains";

const client = createPublicClient({
  chain: avalancheFuji,
  transport: http("https://api.avax-test.network/ext/bc/C/rpc"),
});

const eercAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "registrar", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "isConverter", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "auditorPublicKey",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }, { type: "uint256" }],
  },
];

const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];

const presets = [
  {
    preset: "standalone",
    contractAddress: "0x5E9c6F952fB9615583182e70eDDC4e6E4E0aC0e0",
  },
  {
    preset: "converter",
    contractAddress: "0x372dAB27c8d223Af11C858ea00037Dc03053B22E",
    tokenAddress: "0xb0Fe621B4Bd7fe4975f7c58E3D6ADaEb2a2A35CD",
  },
];

for (const preset of presets) {
  const code = await client.getBytecode({ address: preset.contractAddress });
  if (!code || code === "0x") {
    throw new Error(`No bytecode at ${preset.contractAddress}`);
  }

  const [name, symbol, registrar, isConverter, owner, auditorPublicKey] =
    await Promise.all([
      client.readContract({ address: preset.contractAddress, abi: eercAbi, functionName: "name" }),
      client.readContract({ address: preset.contractAddress, abi: eercAbi, functionName: "symbol" }),
      client.readContract({ address: preset.contractAddress, abi: eercAbi, functionName: "registrar" }),
      client.readContract({ address: preset.contractAddress, abi: eercAbi, functionName: "isConverter" }),
      client.readContract({ address: preset.contractAddress, abi: eercAbi, functionName: "owner" }),
      client.readContract({ address: preset.contractAddress, abi: eercAbi, functionName: "auditorPublicKey" }),
    ]);

  const result = {
    preset: preset.preset,
    contractAddress: preset.contractAddress,
    name,
    symbol,
    registrar,
    isConverter,
    owner,
    auditorPublicKey: auditorPublicKey.map((value) => value.toString()),
  };

  if (preset.tokenAddress) {
    const [tokenName, tokenSymbol, tokenDecimals] = await Promise.all([
      client.readContract({ address: preset.tokenAddress, abi: erc20Abi, functionName: "name" }),
      client.readContract({ address: preset.tokenAddress, abi: erc20Abi, functionName: "symbol" }),
      client.readContract({ address: preset.tokenAddress, abi: erc20Abi, functionName: "decimals" }),
    ]);
    result.tokenAddress = preset.tokenAddress;
    result.tokenName = tokenName;
    result.tokenSymbol = tokenSymbol;
    result.tokenDecimals = Number(tokenDecimals);
  }

  console.log(JSON.stringify(result, null, 2));
}
