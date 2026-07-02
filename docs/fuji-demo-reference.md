# Fuji Demo Reference

This file records the verified Fuji demo references currently closest to a live starter path.

## Verified sample contracts

These addresses come from the AvaCloud-linked example app `BeratOz01/3dent` and were verified to have bytecode on Avalanche Fuji on July 2, 2026.

- Standalone eERC: `0x5E9c6F952fB9615583182e70eDDC4e6E4E0aC0e0`
- Converter eERC: `0x372dAB27c8d223Af11C858ea00037Dc03053B22E`
- Demo ERC20 for converter mode: `0xb0Fe621B4Bd7fe4975f7c58E3D6ADaEb2a2A35CD`

## Verified supporting sources

- AvaCloud SDK overview example link: https://docs.avacloud.io/encrypted-erc/usage/sdk-overview
- Example app repo: https://github.com/BeratOz01/3dent
- Official circuits/contracts repo: https://github.com/ava-labs/EncryptedERC
- Fuji RPC: https://api.avax-test.network/ext/bc/C/rpc

## Practical use

For the current starter:

1. run `pnpm eerc:assets`
2. optionally run `pnpm verify:fuji`
3. run `pnpm dev`
4. use the in-app preset switcher for `standalone` or `converter`
5. only create a local env file if you want custom addresses or want to force a preset from config

Optional env overrides:

- `VITE_EERC_PRESET=converter`
- `VITE_EERC_CONTRACT_ADDRESS=...`
- `VITE_EERC_TOKEN_ADDRESS=...`

## Caveat

These are reference deployments, not deployments owned by this repo.

They are useful for integration testing and demo flows, but a proper event submission should still decide whether to rely on:

- the shared example deployment
- a fresh Fuji deployment for this project
- both
