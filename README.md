# Avalanche Privacy Kit

Base docs live in [docs/README.md](./docs/README.md).

Starter app lives in [apps/starter](./apps/starter).

## What This Project Is

This repo is a developer starter for testing Avalanche encrypted ERC flows on Fuji.

It gives developers a live app, verified Fuji sample contracts, and the current eERC SDK wiring so they can test privacy flows without deploying everything from scratch first.

## Why The Two Modes Exist

The starter supports two real contract shapes:

- `standalone`: the private token system works on its own. Developers can mint, transfer, and burn private balances directly.
- `converter`: the private system sits behind a public ERC20. Developers first hold a normal public token, then deposit it into the privacy contract to get private balance.

## Why This Is Useful For Developers

- `standalone` is the fastest way to test private logic itself.
- `converter` is the realistic path for apps that want to privatize an existing ERC20 flow.
- having both modes in one starter helps developers compare integration cost, wallet flow, asset funding, and UX tradeoffs early instead of learning that after deployment.
- the verified Fuji presets make debugging cheaper because developers can separate repo bugs from contract deployment bugs.

## Why Anyone Would Use It

People use this kind of kit when they want token flows onchain without exposing every balance and transfer publicly.

Without a privacy layer, normal ERC20 usage makes sender, receiver, and amount easy to inspect. This starter exists for teams that want to test or build private balance and transfer flows on Avalanche instead of building the cryptography, proof wiring, and contract integration from zero.

It is useful for:

- private payroll or treasury flows
- applications that do not want user balances visible by default
- business or marketplace flows where transaction visibility is a problem
- developers who want to prototype encrypted token UX on Fuji before doing a project-owned deployment

The practical value is simple: this repo shortens the path from “privacy sounds useful” to “we have a running app against a real Fuji sample and understand what the integration actually costs.”

Useful commands:

- `pnpm eerc:assets`
- `pnpm verify:fuji`
- `pnpm dev`
