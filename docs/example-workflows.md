# Example Workflows

## Starter app flow

1. User connects a wallet.
2. App initializes privacy client state.
3. App fetches encrypted balance.
4. User submits a private transfer.
5. App shows pending and confirmed transaction state.
6. App refreshes encrypted history.

## Privacy playground flow

1. User compares a public transfer with a private transfer.
2. UI explains which data is visible in each path.
3. User sees how encrypted balances differ from plain ERC20 balances.

## Auditor flow

1. User enters auditor mode with authorized credentials or keys.
2. App fetches encrypted records.
3. App reveals only the data the auditor is allowed to decrypt.
4. Normal users remain unable to view that data.

## Example app targets

- Private payroll: employer sends confidential payouts
- Invoice payments: parties settle without exposing amounts publicly
- Treasury dashboard: team monitors private balances and flows
- Peer-to-peer transfers: simple private sends between wallets
