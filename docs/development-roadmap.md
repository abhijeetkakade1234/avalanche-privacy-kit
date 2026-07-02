# Development Roadmap

## Phase 0: Documentation and repo setup

- define product scope
- define package boundaries
- define success path for a first-time developer
- set up monorepo tooling

Exit condition:

- docs exist
- workspace boots
- empty packages and apps can build

## Phase 1: Contract and SDK foundation

- add contract workspace
- integrate official Avalanche privacy dependencies
- build the first `sdk-wrapper` primitives

Exit condition:

- local or testnet flow can initialize a client
- one private balance read works
- one private transfer path works

## Phase 2: Starter application

- create React + TypeScript starter
- add wallet connection
- add privacy initialization flow
- add encrypted balance and transfer screens

Exit condition:

- a new developer can run the starter and complete one private transfer

## Phase 3: Hooks and UI package extraction

- move app-learned logic into `react-hooks`
- extract reusable UI components
- remove starter-only coupling

Exit condition:

- starter mostly consumes packages instead of local duplicate logic

## Phase 4: Playground and auditor demo

- build public vs private comparison flow
- build auditor-only reveal flow
- document privacy model clearly

Exit condition:

- demos explain privacy value without protocol deep knowledge

## Phase 5: Example applications

- private payroll
- confidential invoice payments
- treasury dashboard
- private peer-to-peer transfer flow

Exit condition:

- at least two examples are complete enough to copy from

## Phase 6: Hardening

- tests on critical flows
- docs cleanup
- CI
- deployment setup

Exit condition:

- contributors can clone, run, test, and deploy without guesswork
