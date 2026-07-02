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
pnpm verify:fuji
pnpm dev
pnpm build
```

Root commands:

- `pnpm eerc:assets` copies the verified eERC circuit artifacts into the starter's public folder
- `pnpm verify:fuji` checks the verified Fuji sample contracts over JSON-RPC
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
- the sample Fuji contracts can be checked with `pnpm verify:fuji`
- the starter can boot against a verified Fuji sample contract without extra env vars
- the starter can switch between verified sample presets at runtime
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

## Current blocker

The repo no longer needs manual proof asset URLs, and it now has a verified Fuji sample contract path, but it still does not own its own deployed Fuji eERC contract yet.

For a project-owned demo, the remaining work is choosing whether to rely on the shared sample deployment or deploy fresh Fuji contracts for this repo.
