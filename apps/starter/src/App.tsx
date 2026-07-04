import { useEffect, useMemo, useState } from "react";
import {
  useEERC,
  type CompatiblePublicClient,
  type CompatibleWalletClient,
} from "@avalabs/eerc-sdk";
import { isAddress } from "viem";
import { avalancheFuji } from "wagmi/chains";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import { getStarterConfig, type StarterConfig } from "./lib/config";
import { demoContracts, type DemoPreset } from "./lib/demoContracts";
import { eercReadOnlyAbi, erc20ReadOnlyAbi } from "./lib/eercReadOnly";

type ActivityItem = {
  id: number;
  label: string;
  detail: string;
};

const docsUrl =
  "https://build.avax.network/events/b5e9fe35-5b5d-4fac-8709-e8eac8a1eaee";
const REQUIRED_ASSET_PATHS = [
  "/registration.wasm",
  "/registration.zkey",
  "/transfer.wasm",
  "/transfer.zkey",
  "/mint.wasm",
  "/mint.zkey",
  "/withdraw.wasm",
  "/withdraw.zkey",
  "/burn.wasm",
  "/burn.zkey",
] as const;

function truncate(value: string, width = 6) {
  return `${value.slice(0, width)}...${value.slice(-4)}`;
}

function formatMaybeBigint(value: bigint | undefined) {
  return value === undefined ? "-" : value.toString();
}

function getDecryptionKeyStorageKey(scope: string) {
  return `apk.decryption-key:${scope}`;
}

function useStoredDecryptionKey(scope: string | undefined) {
  const [key, setKey] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    if (!scope) {
      return "";
    }

    return window.localStorage.getItem(getDecryptionKeyStorageKey(scope)) ?? "";
  });

  useEffect(() => {
    if (typeof window === "undefined" || !scope) {
      setKey("");
      return;
    }

    setKey(window.localStorage.getItem(getDecryptionKeyStorageKey(scope)) ?? "");
  }, [scope]);

  const update = (next: string) => {
    setKey(next);
    if (typeof window === "undefined" || !scope) {
      return;
    }

    if (next) {
      window.localStorage.setItem(getDecryptionKeyStorageKey(scope), next);
      return;
    }

    window.localStorage.removeItem(getDecryptionKeyStorageKey(scope));
  };

  return [key, update] as const;
}

function App() {
  const baseConfig = useMemo(() => getStarterConfig(), []);
  const [assetStatus, setAssetStatus] = useState<{
    ready: boolean;
    missing: string[];
    error?: string;
  }>({ ready: false, missing: [] });
  const [selectedPreset, setSelectedPreset] = useState<DemoPreset>(baseConfig.preset);
  const [readOnlyState, setReadOnlyState] = useState<{
    name: string;
    symbol: string;
    registrar: string;
    isConverter?: boolean;
    owner: string;
    auditorPublicKey: string[];
    tokenName: string;
    tokenSymbol: string;
    tokenDecimals?: number;
  } | null>(null);
  const [readOnlyError, setReadOnlyError] = useState("");

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, error: connectError, isPending: isConnectPending } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: avalancheFuji.id });
  const starterConfig = useMemo(() => {
    if (baseConfig.isCustomOverride) {
      return baseConfig;
    }

    const presetConfig = demoContracts[selectedPreset];
    return {
      ...baseConfig,
      preset: selectedPreset,
      presetLabel: presetConfig.label,
      contractAddress: presetConfig.contractAddress,
      tokenAddress: presetConfig.tokenAddress,
      usingDefaultContract: true,
      isCustomOverride: false,
    };
  }, [baseConfig, selectedPreset]);

  const isWrongChain = Boolean(isConnected && chainId !== avalancheFuji.id);

  useEffect(() => {
    let cancelled = false;

    const checkAssets = async () => {
      const paths = ["/eerc-assets.json", ...REQUIRED_ASSET_PATHS];

      try {
        const results = await Promise.all(
          paths.map(async (path) => ({
            path,
            ok: (await fetch(path, { cache: "no-store" })).ok,
          })),
        );

        if (cancelled) {
          return;
        }

        const missing = results.filter((item) => !item.ok).map((item) => item.path);
        setAssetStatus({
          ready: missing.length === 0,
          missing,
        });
      } catch (caught) {
        if (!cancelled) {
          setAssetStatus({
            ready: false,
            missing: paths.slice(),
            error: caught instanceof Error ? caught.message : "Asset check failed",
          });
        }
      }
    };

    void checkAssets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!publicClient || !starterConfig.contractAddress) {
      setReadOnlyState(null);
      setReadOnlyError("");
      return;
    }

    let cancelled = false;

    const loadReadOnlyState = async () => {
      try {
        const [name, symbol, registrar, isConverter, owner, auditorPublicKey] =
          await Promise.all([
            publicClient.readContract({
              address: starterConfig.contractAddress!,
              abi: eercReadOnlyAbi,
              functionName: "name",
            }),
            publicClient.readContract({
              address: starterConfig.contractAddress!,
              abi: eercReadOnlyAbi,
              functionName: "symbol",
            }),
            publicClient.readContract({
              address: starterConfig.contractAddress!,
              abi: eercReadOnlyAbi,
              functionName: "registrar",
            }),
            publicClient.readContract({
              address: starterConfig.contractAddress!,
              abi: eercReadOnlyAbi,
              functionName: "isConverter",
            }),
            publicClient.readContract({
              address: starterConfig.contractAddress!,
              abi: eercReadOnlyAbi,
              functionName: "owner",
            }),
            publicClient.readContract({
              address: starterConfig.contractAddress!,
              abi: eercReadOnlyAbi,
              functionName: "auditorPublicKey",
            }),
          ]);

        let tokenName = "";
        let tokenSymbol = "";
        let tokenDecimals: number | undefined;

        if (starterConfig.tokenAddress) {
          const [nextTokenName, nextTokenSymbol, nextTokenDecimals] =
            await Promise.all([
              publicClient.readContract({
                address: starterConfig.tokenAddress,
                abi: erc20ReadOnlyAbi,
                functionName: "name",
              }),
              publicClient.readContract({
                address: starterConfig.tokenAddress,
                abi: erc20ReadOnlyAbi,
                functionName: "symbol",
              }),
              publicClient.readContract({
                address: starterConfig.tokenAddress,
                abi: erc20ReadOnlyAbi,
                functionName: "decimals",
              }),
            ]);
          tokenName = nextTokenName;
          tokenSymbol = nextTokenSymbol;
          tokenDecimals = Number(nextTokenDecimals);
        }

        if (cancelled) {
          return;
        }

        setReadOnlyError("");
        setReadOnlyState({
          name,
          symbol,
          registrar,
          isConverter,
          owner,
          auditorPublicKey: Array.from(auditorPublicKey, (value) =>
            value.toString(),
          ),
          tokenName,
          tokenSymbol,
          tokenDecimals,
        });
      } catch (caught) {
        if (!cancelled) {
          setReadOnlyState(null);
          setReadOnlyError(
            caught instanceof Error ? caught.message : "Live contract read failed",
          );
        }
      }
    };

    void loadReadOnlyState();
    const timer = window.setInterval(() => {
      void loadReadOnlyState();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [publicClient, starterConfig.contractAddress, starterConfig.tokenAddress]);

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Avalanche Privacy Kit</p>
        <h1>Shortest path to an eERC starter on Fuji.</h1>
        <p className="lede">
          This starter is wired around the current official Ava Labs eERC SDK.
          Wallet connect works now. The app defaults to a verified Fuji sample
          deployment and uses locally staged official circuit assets.
        </p>
        <div className="hero-actions">
          <a className="button button-ghost" href={docsUrl} target="_blank" rel="noreferrer">
            Event brief
          </a>
          <a
            className="button button-ghost"
            href="https://github.com/ava-labs/eerc-sdk"
            target="_blank"
            rel="noreferrer"
          >
            Official SDK
          </a>
        </div>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>Wallet</h2>
          <p className="muted">
            Target chain: Avalanche Fuji ({avalancheFuji.id})
          </p>
          {isConnected && address ? (
            <>
              <p className="status ok">Connected: {truncate(address)}</p>
              <p className="muted">Chain ID: {chainId}</p>
              <div className="inline-actions">
                {isWrongChain ? (
                  <button
                    className="button"
                    onClick={() => switchChain({ chainId: avalancheFuji.id })}
                  >
                    Switch to Fuji
                  </button>
                ) : null}
                <button className="button button-ghost" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="status warn">No wallet connected</p>
              {connectors.map((connector) => (
                <button
                  className="button"
                  key={connector.id}
                  onClick={() => connect({ connector })}
                >
                  Connect {connector.name}
                  {isConnectPending ? "..." : ""}
                </button>
              ))}
            </>
          )}
          {connectError ? <p className="error">{connectError.message}</p> : null}
          {!isConnected ? (
            <p className="muted">
              Use a browser session with an injected wallet such as MetaMask or
              Core to continue into registration and private transactions.
            </p>
          ) : null}
        </article>

        <article className="panel">
          <h2>Starter status</h2>
          <p
            className={`status ${
              starterConfig.missing.length === 0 && starterConfig.invalid.length === 0
                ? "ok"
                : "warn"
            }`}
          >
            {starterConfig.missing.length === 0 && starterConfig.invalid.length === 0
              ? "eERC config present"
              : "Waiting for eERC contract and proof assets"}
          </p>
          {starterConfig.missing.length > 0 || starterConfig.invalid.length > 0 ? (
            <>
              {starterConfig.missing.length > 0 ? (
                <>
                  <p className="muted">
                    Missing env vars from <code>apps/starter/.env.example</code>:
                  </p>
                  <ul className="list">
                    {starterConfig.missing.map((item) => (
                      <li key={item}>
                        <code>{item}</code>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {starterConfig.invalid.length > 0 ? (
                <>
                  <p className="error">Invalid env address values:</p>
                  <ul className="list">
                    {starterConfig.invalid.map((item) => (
                      <li key={item}>
                        <code>{item}</code>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <>
              {!starterConfig.isCustomOverride ? (
                <div className="inline-actions">
                  {(["standalone", "converter"] as const).map((preset) => (
                    <button
                      key={preset}
                      className={`button ${starterConfig.preset === preset ? "" : "button-ghost"}`}
                      onClick={() => setSelectedPreset(preset)}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              ) : null}
              <ul className="list">
                <li>
                  Preset: <code>{starterConfig.preset}</code>
                </li>
                <li>
                  Preset label: <code>{starterConfig.presetLabel}</code>
                </li>
                <li>
                  Contract: <code>{starterConfig.contractAddress}</code>
                </li>
                <li>
                  Contract source:{" "}
                  <code>
                    {starterConfig.isCustomOverride
                      ? "env override"
                      : "verified Fuji sample default"}
                  </code>
                </li>
                <li>
                  Converter token:{" "}
                  <code>{starterConfig.tokenAddress ?? "standalone contract or not set"}</code>
                </li>
              </ul>
            </>
          )}
        </article>

        <article className="panel">
          <h2>Live contract</h2>
          {readOnlyState ? (
            <ul className="list">
              <li>
                Name: <code>{readOnlyState.name || "(empty)"}</code>
              </li>
              <li>
                Symbol: <code>{readOnlyState.symbol || "(empty)"}</code>
              </li>
              <li>
                Registrar: <code>{readOnlyState.registrar || "loading"}</code>
              </li>
              <li>
                Mode onchain:{" "}
                <code>
                  {readOnlyState.isConverter === undefined
                    ? "loading"
                    : readOnlyState.isConverter
                      ? "converter"
                      : "standalone"}
                </code>
              </li>
              <li>
                Owner: <code>{readOnlyState.owner || "loading"}</code>
              </li>
              <li>
                Auditor key:{" "}
                <code>
                  {readOnlyState.auditorPublicKey.length > 0 ? "set" : "loading"}
                </code>
              </li>
              {starterConfig.tokenAddress ? (
                <li>
                  Token:{" "}
                  <code>
                    {readOnlyState.tokenName || "(loading)"} /{" "}
                    {readOnlyState.tokenSymbol || "(loading)"} /{" "}
                    {readOnlyState.tokenDecimals ?? "(loading)"} decimals
                  </code>
                </li>
              ) : null}
            </ul>
          ) : readOnlyError ? (
            <p className="error">{readOnlyError}</p>
          ) : (
            <p className="muted">Reading live Fuji contract state...</p>
          )}
        </article>

        <article className="panel panel-wide">
          <h2>Privacy flow</h2>
          {!isConnected ? (
            <p className="muted">Connect a wallet first.</p>
          ) : isWrongChain ? (
            <p className="muted">Switch to Fuji before using the privacy flow.</p>
          ) : !starterConfig.contractAddress ||
            !starterConfig.circuitUrls ||
            !publicClient ||
            !walletClient ||
            !assetStatus.ready ? (
            <BlockedFlow config={starterConfig} assetStatus={assetStatus} />
          ) : (
            <PrivacyWorkbench
              config={starterConfig}
              publicClient={publicClient}
              walletClient={walletClient}
              walletAddress={address}
            />
          )}
        </article>
      </section>
    </main>
  );
}

function BlockedFlow({
  config,
  assetStatus,
}: {
  config: StarterConfig;
  assetStatus: {
    ready: boolean;
    missing: string[];
    error?: string;
  };
}) {
  return (
    <div className="stack">
      <p className="status warn">Starter UI is live, eERC tx path is gated by config.</p>
      <p className="muted">
        Verified blocker: the starter still needs a real deployed eERC contract
        address.
      </p>
      {!assetStatus.ready ? (
        <>
          <p className="muted">
            Circuit assets are not staged cleanly yet. Run <code>pnpm eerc:assets</code>.
          </p>
          {assetStatus.error ? <p className="error">{assetStatus.error}</p> : null}
          {assetStatus.missing.length > 0 ? (
            <ul className="list">
              {assetStatus.missing.map((item) => (
                <li key={item}>
                  <code>{item}</code>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      <ul className="list">
        {config.missing.map((item) => (
          <li key={item}>
            <code>{item}</code>
          </li>
        ))}
        {config.invalid.map((item) => (
          <li key={item}>
            <code>{item}</code> invalid address
          </li>
        ))}
      </ul>
      <p className="muted">
        Once the wallet session is present, the same screen will use the real{" "}
        <code>useEERC</code> hook against the selected live preset.
      </p>
    </div>
  );
}

function PrivacyWorkbench({
  config,
  publicClient,
  walletClient,
  walletAddress,
}: {
  config: StarterConfig;
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>;
  walletClient: NonNullable<ReturnType<typeof useWalletClient>["data"]>;
  walletAddress?: `0x${string}`;
}) {
  const decryptionKeyScope = useMemo(() => {
    if (!walletAddress || !config.contractAddress) {
      return undefined;
    }

    return [
      walletAddress.toLowerCase(),
      config.contractAddress.toLowerCase(),
      config.preset,
    ].join(":");
  }, [config.contractAddress, config.preset, walletAddress]);
  const [decryptionKey, setDecryptionKey] = useStoredDecryptionKey(decryptionKeyScope);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("1");
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string>("");

  const eerc = useEERC(
    publicClient as CompatiblePublicClient,
    walletClient as CompatibleWalletClient,
    config.contractAddress!,
    config.circuitUrls!,
    decryptionKey || undefined,
  );

  const balance = eerc.useEncryptedBalance(config.tokenAddress);

  const pushActivity = (label: string, detail: string) => {
    setActivity((current) => [
      {
        id: Date.now() + current.length,
        label,
        detail,
      },
      ...current,
    ]);
  };

  const runAction = async (
    label: string,
    action: () => Promise<string | void>,
  ) => {
    setError("");
    setStatus(`${label}...`);

    try {
      const detail = await action();
      setStatus(`${label} complete`);
      pushActivity(label, detail ?? "Done");
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Unknown starter error";
      setError(message);
      setStatus(`${label} failed`);
    }
  };

  const handleRegister = async () => {
    await runAction("Register privacy key", async () => {
      const result = await eerc.register();
      setDecryptionKey(result.key);
      return result.transactionHash
        ? `tx: ${result.transactionHash}`
        : "Key recovered from an already registered wallet";
    });
  };

  const handleRecoverKey = async () => {
    await runAction("Recover local decryption key", async () => {
      const key = await eerc.generateDecryptionKey();
      setDecryptionKey(key);
      return "Stored locally for this browser";
    });
  };

  const handleTransfer = async () => {
    if (!isAddress(recipient)) {
      setError("Recipient must be a valid EVM address.");
      setStatus("Private transfer failed");
      return;
    }

    if (!/^[0-9]+$/.test(amount)) {
      setError("Amount must be a whole number.");
      setStatus("Private transfer failed");
      return;
    }

    const parsedAmount = BigInt(amount);

    if (parsedAmount <= 0n) {
      setError("Amount must be greater than zero.");
      setStatus("Private transfer failed");
      return;
    }

    await runAction("Private transfer", async () => {
      const result = await balance.privateTransfer(recipient, parsedAmount);
      balance.refetchBalance();
      return `tx: ${result.transactionHash}`;
    });
  };

  return (
    <>
      <p className="status ok">{status}</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="facts">
        <div>
          <span>Initialized</span>
          <strong>{String(eerc.isInitialized)}</strong>
        </div>
        <div>
          <span>Registered</span>
          <strong>{String(eerc.isRegistered)}</strong>
        </div>
        <div>
          <span>Contract mode</span>
          <strong>{eerc.isConverter ? "converter" : "standalone"}</strong>
        </div>
        <div>
          <span>Balance</span>
          <strong>{formatMaybeBigint(balance.decryptedBalance)}</strong>
        </div>
        <div>
          <span>Decryption key</span>
          <strong>{eerc.isDecryptionKeySet ? "present" : "missing"}</strong>
        </div>
        <div>
          <span>Auditor key</span>
          <strong>{eerc.isAuditorKeySet ? "set" : "missing"}</strong>
        </div>
      </div>

      <div className="inline-actions">
        {!eerc.isRegistered ? (
          <button className="button" onClick={handleRegister}>
            Register wallet privacy key
          </button>
        ) : null}
        {eerc.isRegistered && !eerc.isDecryptionKeySet ? (
          <button className="button button-ghost" onClick={handleRecoverKey}>
            Recover local key
          </button>
        ) : null}
        <button className="button button-ghost" onClick={() => balance.refetchBalance()}>
          Refresh balance
        </button>
      </div>

      <div className="stack">
        <label className="field">
          <span>Recipient address</span>
          <input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="0x..."
          />
        </label>
        <label className="field">
          <span>Amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            placeholder="1"
          />
        </label>
        <button
          className="button"
          onClick={handleTransfer}
          disabled={!eerc.isRegistered}
        >
          Send private transfer
        </button>
      </div>

      <div className="subgrid">
        <article className="subpanel">
          <h3>Encrypted balance snapshot</h3>
          <p className="muted">
            The SDK gives both decrypted and encrypted balance state.
          </p>
          <pre>{JSON.stringify(balance.encryptedBalance, null, 2)}</pre>
        </article>

        <article className="subpanel">
          <h3>Activity</h3>
          {activity.length === 0 ? (
            <p className="muted">No local activity yet.</p>
          ) : (
            <ul className="list">
              {activity.map((item) => (
                <li key={item.id}>
                  <strong>{item.label}</strong>: {item.detail}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </>
  );
}

export default App;
