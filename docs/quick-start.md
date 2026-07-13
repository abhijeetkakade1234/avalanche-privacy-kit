# Quick Start

This repo now contains a runnable starter app at `apps/starter`.

## Target experience

A developer should be able to:

1. clone the repo
2. install dependencies
3. configure environment values
4. run the starter app
5. connect a wallet
6. initialize privacy state
7. send a private transaction on Fuji

## Verified commands

```bash
pnpm install
pnpm eerc:assets
pnpm deploy:fuji
pnpm dev
pnpm build
```

Root commands:

- `pnpm eerc:assets` copies the verified eERC circuit artifacts into the starter's public folder
- `pnpm apply:fuji` applies `output/fuji-deployment.json` to the starter config
- `pnpm deploy:fuji` deploys repo-owned Fuji contracts, writes the starter addresses, stages assets, and verifies the deployment
- `pnpm verify:fuji` rechecks the repo-owned Fuji deployment from `output/fuji-deployment.json`
- `pnpm dev` runs the starter app
- `pnpm build` builds the starter app for production

Starter-only commands:

```bash
pnpm --filter @avalanche-privacy-kit/starter dev
pnpm --filter @avalanche-privacy-kit/starter build
```

## Environment setup

The starter now defaults to the verified Fuji `standalone` preset.

You only need a local env file when you want to:

- switch to the verified `converter` preset
- override the contract address
- override the token address

You can also switch between the verified `standalone` and `converter` sample presets directly in the starter UI when you are not using custom env overrides.

The current starter is intentionally honest about the remaining integration requirement:

- wallet connect is live
- Fuji targeting is live
- the current official `@avalabs/eerc-sdk` hook is wired in
- the official circuit assets can be staged locally with `pnpm eerc:assets`
- repo-owned deployments use the snarkJS prod verifier contracts that match those proof assets
- the repo-owned Fuji contracts can be checked with `pnpm verify:fuji`
- shared Fuji sample presets remain available for comparison only
- custom deployments still use `VITE_EERC_CONTRACT_ADDRESS`, plus token address for converter mode

Required env areas:

- Node.js version
- pnpm version
- wallet support expectations
- eERC contract address if overriding the sample default
- token address if the selected contract is converter-mode

## Current verification

Verified locally on July 2, 2026:

- `pnpm install`
- `pnpm eerc:assets`
- `pnpm verify:fuji`
- `pnpm build`
- Vite dev server booted on `127.0.0.1:4174`

## Repo-owned Fuji deployment

The repo can deploy its own Fuji playground with either `pnpm deploy:fuji` from a local private key or the starter UI's `Deploy repo-owned Fuji stack` button from a connected browser wallet.

Fresh deployments require one owner setup flow in the starter:

1. Register the wallet privacy key.
2. Set the contract auditor.
3. Mint private balance in standalone mode, or approve and deposit the demo ERC20 in converter mode.
