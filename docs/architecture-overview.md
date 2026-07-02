# Architecture Overview

## Goal

Keep the architecture boring and layered: official protocol libraries at the bottom, kit abstractions in the middle, apps on top.

## System layers

### 1. Contracts

Smart contracts define the onchain private token behavior and any demo-specific logic.

Responsibilities:

- eERC-compatible token contracts
- example demo contracts
- deployment scripts and config

### 2. SDK wrapper

This package is a thin compatibility layer over the official Avalanche privacy SDKs.

Responsibilities:

- initialize privacy clients
- normalize wallet/provider setup
- expose common actions with sane inputs
- isolate low-level SDK churn from apps

This layer should not become its own protocol.

### 3. React hooks

Hooks convert async SDK actions into app-friendly state.

Responsibilities:

- loading and error state
- wallet-aware data fetching
- transaction submission lifecycle
- decrypted and encrypted state management

### 4. UI components

Components are reusable views for privacy-specific interactions.

Responsibilities:

- wallet connection affordances
- balance display
- transfer forms
- transaction tables
- auditor views

### 5. Applications

Apps demonstrate real usage of the packages.

Initial app targets:

- starter
- playground
- payroll demo
- treasury demo

## Proposed dependency direction

```text
apps/* -> packages/react-hooks
apps/* -> packages/ui-components
packages/react-hooks -> packages/sdk-wrapper
packages/ui-components -> packages/shared
packages/sdk-wrapper -> official Avalanche privacy tooling
contracts -> independent
```

## Design principles

- Wrap complexity, do not duplicate protocol logic.
- Keep package boundaries obvious.
- Prefer framework-native patterns over custom state machinery.
- Make beginner paths short without blocking advanced usage.

## Open decisions

- Which deployed eERC contract and circuit assets the starter should target first
- Whether the starter owns deployment scripts or consumes deployed demo contracts
- How auditor permissions are represented in the public API
- Whether example apps live in `apps/` or `examples/`
