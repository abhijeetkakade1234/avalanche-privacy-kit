# Repository Structure

## Planned layout

```text
avalanche-privacy-kit/
  apps/
    starter/
  packages/
    sdk-wrapper/
    react-hooks/
    ui-components/
    shared/
  contracts/
  docs/
  examples/
  scripts/
  assets/
```

## Current layout

Right now the implemented codebase is intentionally smaller:

```text
avalanche-privacy-kit/
  apps/
    starter/
  docs/
```

The rest of the folders stay planned, not pre-created, until they have real code.

## Folder roles

### `apps/`

Runnable applications. These prove the packages work in a real UI.

### `packages/sdk-wrapper/`

The smallest possible wrapper around official privacy tooling. This is where protocol-facing code lives.

### `packages/react-hooks/`

React-only integration layer that turns wrapper calls into app state.

### `packages/ui-components/`

Reusable UI for privacy workflows.

### `packages/shared/`

Shared types, constants, and tiny utilities used in more than one package.

### `contracts/`

Solidity contracts, deployment scripts, and contract tests.

### `docs/`

Project docs. This folder starts first so code does not drift without a plan.

### `examples/`

Small focused usage examples that are simpler than full apps.

### `scripts/`

Repo automation scripts only. No business logic here.

### `assets/`

Static project assets for docs, demos, and branding.

## Monorepo rules

- Keep package boundaries strict.
- Do not put app-specific logic into shared packages unless reused.
- If code is only used once, keep it in the app until reuse is real.
- `shared/` is for actual shared code, not a dumping ground.
