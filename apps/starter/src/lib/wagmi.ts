import { avalancheFuji } from "wagmi/chains";
import { createConfig, http, injected } from "wagmi";

export const starterChains = [avalancheFuji] as const;

export const wagmiConfig = createConfig({
  connectors: [
    injected(),
  ],
  chains: starterChains,
  transports: {
    [avalancheFuji.id]: http(),
  },
});
