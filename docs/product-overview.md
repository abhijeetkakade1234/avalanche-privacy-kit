# Product Overview

## Vision

Avalanche Privacy Kit is an open-source toolkit that makes it easy to build privacy-first applications on Avalanche using Encrypted ERC (eERC).

The target outcome is simple: a developer should be able to start from a working template, connect a wallet, perform private token actions, and understand how the system fits together without first becoming an expert in privacy infrastructure.

## Current scope

The immediate build scope is the July 2026 Avalanche Builder Hub event brief, "Speedrun: Privacy on Avalanche".

Primary brief:

- https://build.avax.network/events/b5e9fe35-5b5d-4fac-8709-e8eac8a1eaee

## Problem

Today, building with eERC requires too much upfront context:

- wallet integration
- privacy key initialization
- SDK setup
- contract deployment
- client-side proof generation
- encrypted balance handling
- transaction decryption
- auditor access flows
- frontend state management

That stack is too heavy for a new builder who just wants to prototype or ship.

## Solution

Avalanche Privacy Kit wraps the official Avalanche privacy tooling behind a clean developer experience:

- starter apps that run quickly
- a thin SDK wrapper around official eERC primitives
- React hooks for common user flows
- reusable UI components for privacy apps
- examples that show real use cases
- docs that explain the system without protocol deep-dives

## Product goals

- Reduce setup time from hours to minutes.
- Make eERC development approachable for new builders.
- Ship production-shaped examples, not toy snippets.
- Provide an open-source base that can outlive a hackathon.

## Non-goals for v1

- Supporting every frontend framework on day one
- Abstracting away every protocol detail
- Building a full CLI before the toolkit itself is stable
- Solving multi-chain privacy in the first release

## Core deliverables

1. Starter application
2. SDK wrapper
3. React hooks
4. UI component library
5. Privacy playground
6. Auditor dashboard
7. Example applications
8. Strong documentation

## Success criteria

A developer unfamiliar with eERC should be able to:

- install the starter
- connect a wallet
- initialize privacy state
- send a private transaction
- read encrypted balances
- inspect private transaction history
- understand where to customize the toolkit for their own app
