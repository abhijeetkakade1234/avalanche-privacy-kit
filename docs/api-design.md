# API Design

## Goal

Expose a tiny public surface that covers the common privacy flows first.

## SDK wrapper candidates

```ts
initializeWallet(input): Promise<WalletSession>
sendPrivate(input): Promise<PrivateTransactionResult>
getPrivateBalance(input): Promise<EncryptedBalanceResult>
getTransactionHistory(input): Promise<PrivateTransaction[]>
decryptBalance(input): Promise<DecryptedBalanceResult>
decryptTransaction(input): Promise<DecryptedTransactionResult>
```

## API rules

- Inputs should be plain objects.
- Return values should be typed and predictable.
- Low-level provider and SDK details stay inside the wrapper where possible.
- Do not hide failures behind silent retries.

## React hook candidates

```ts
useWallet()
usePrivateBalance()
usePrivateTransfer()
usePrivateTransactions()
useAuditor()
```

## Hook rules

- Hooks own loading and error state.
- Hooks should compose small wrapper calls, not reimplement them.
- Hooks should expose imperative actions only where the UI needs them.

## Not in v1

- giant all-in-one client classes
- custom caching framework
- protocol-independent abstraction layers
