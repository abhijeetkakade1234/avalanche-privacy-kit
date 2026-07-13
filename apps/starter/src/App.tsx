import { useEffect, useMemo, useState } from "react";
import {
  useEERC,
  type CompatiblePublicClient,
  type CompatibleWalletClient,
} from "@avalabs/eerc-sdk";
import { formatUnits, isAddress, parseUnits } from "viem";
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
import {
  demoContracts,
  readStoredDemoContracts,
  type DemoPreset,
} from "./lib/demoContracts";
import { deployRepoOwnedFujiStack } from "./lib/repoOwnedDeployment";
import {
  eercReadOnlyAbi,
  erc20ApproveAbi,
  erc20ReadOnlyAbi,
} from "./lib/eercReadOnly";

type ActivityItem = {
  id: number;
  label: string;
  detail: string;
};

type PublicTokenState = {
  balance?: bigint;
  allowance?: bigint;
  decimals?: number;
  symbol?: string;
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

function formatTokenAmount(value: bigint | undefined, decimals: number | undefined) {
  if (value === undefined) {
    return "-";
  }

  if (decimals === undefined) {
    return value.toString();
  }
  return formatUnits(value, decimals);
}

function isAuditorKeyConfigured(publicKey: string[] | undefined) {
  return Boolean(
    publicKey &&
      publicKey.length === 2 &&
      !(publicKey[0] === "0" && publicKey[1] === "1"),
  );
}

function stringifyWithBigints(value: unknown) {
  return JSON.stringify(
    value,
    (_key, currentValue) =>
      typeof currentValue === "bigint" ? currentValue.toString() : currentValue,
    2,
  );
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
  const [deploymentStatus, setDeploymentStatus] = useState("");
  const [deploymentError, setDeploymentError] = useState("");
  const [isDeployingOwnedStack, setIsDeployingOwnedStack] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, error: connectError, isPending: isConnectPending } =
    useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: avalancheFuji.id });
  const storedDemoContracts = useMemo(() => readStoredDemoContracts(), []);
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
  const activeStoredPreset = storedDemoContracts[selectedPreset];
  const isUsingStoredDeployment = Boolean(
    !baseConfig.isCustomOverride &&
      activeStoredPreset?.contractAddress &&
      starterConfig.contractAddress &&
      activeStoredPreset.contractAddress.toLowerCase() ===
        starterConfig.contractAddress.toLowerCase() &&
      (activeStoredPreset.tokenAddress?.toLowerCase() ?? "") ===
        (starterConfig.tokenAddress?.toLowerCase() ?? ""),
  );

  const isWrongChain = Boolean(isConnected && chainId !== avalancheFuji.id);

  const handleDeployOwnedStack = async () => {
    if (!address || !walletClient || !publicClient) {
      setDeploymentError("Connect a Fuji wallet before deploying.");
      return;
    }

    setDeploymentError("");
    setIsDeployingOwnedStack(true);

    try {
      await deployRepoOwnedFujiStack({
        account: address,
        publicClient,
        walletClient,
        onStatus: setDeploymentStatus,
      });
      setDeploymentStatus("Repo-owned deployment complete. Reloading starter...");
      window.location.reload();
    } catch (caught) {
      setDeploymentError(
        caught instanceof Error ? caught.message : "Repo-owned deployment failed",
      );
      setDeploymentStatus("Repo-owned deployment failed");
    } finally {
      setIsDeployingOwnedStack(false);
    }
  };

  const handleCopyStoredDeployment = async () => {
    if (!activeStoredPreset) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        stringifyWithBigints({
          [selectedPreset]: activeStoredPreset,
        }),
      );
      setCopyStatus("Copied current browser deployment JSON.");
    } catch (caught) {
      setCopyStatus(
        caught instanceof Error ? caught.message : "Copy failed",
      );
    }
  };

  const handleCopyStoredConfig = async () => {
    const standalone = storedDemoContracts.standalone;
    const converter = storedDemoContracts.converter;
    if (!standalone && !converter) {
      return;
    }

    const entries = [
      standalone
        ? `  standalone: {
    label: ${JSON.stringify(standalone.label)},
    contractAddress: "${standalone.contractAddress}",
  },`
        : "",
      converter
        ? `  converter: {
    label: ${JSON.stringify(converter.label)},
    contractAddress: "${converter.contractAddress}",
${converter.tokenAddress ? `    tokenAddress: "${converter.tokenAddress}",\n` : ""}  },`
        : "",
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(
        `export const localDemoContracts = {
${entries.join("\n")}
};\n`,
      );
      setCopyStatus("Copied localDemoContracts.ts content.");
    } catch (caught) {
      setCopyStatus(caught instanceof Error ? caught.message : "Copy failed");
    }
  };

  const handleResetStoredDeployment = () => {
    window.localStorage.removeItem("apk.localDemoContracts");
    window.location.reload();
  };

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
          Wallet connect works now. The app uses locally staged official circuit
          assets and can target either the shared Fuji sample or a repo-owned
          Fuji deployment.
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
                      : isUsingStoredDeployment
                        ? "browser deployment cache"
                        : "shared preset default"}
                  </code>
                </li>
                <li>
                  Converter token:{" "}
                  <code>{starterConfig.tokenAddress ?? "standalone contract or not set"}</code>
                </li>
              </ul>
              {activeStoredPreset ? (
                <div className="stack">
                  <p className="muted">
                    Browser-stored {selectedPreset} deployment is active on this device.
                  </p>
                  <div className="inline-actions">
                    <button
                      className="button button-ghost"
                      onClick={() => void handleCopyStoredDeployment()}
                    >
                      Copy deployment JSON
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={() => void handleCopyStoredConfig()}
                    >
                      Copy app config
                    </button>
                    <button
                      className="button button-ghost"
                      onClick={handleResetStoredDeployment}
                    >
                      Reset browser deployment
                    </button>
                  </div>
                  {copyStatus ? <p className="muted">{copyStatus}</p> : null}
                </div>
              ) : null}
              {isConnected && !isWrongChain && walletClient && publicClient ? (
                <div className="stack">
                  <button
                    className="button"
                    onClick={handleDeployOwnedStack}
                    disabled={isDeployingOwnedStack}
                  >
                    {isDeployingOwnedStack
                      ? "Deploying repo-owned Fuji stack..."
                      : "Deploy repo-owned Fuji stack"}
                  </button>
                  {deploymentStatus ? (
                    <p className="muted">{deploymentStatus}</p>
                  ) : (
                    <p className="muted">
                      Uses the connected Fuji wallet to deploy the full stack and store the
                      addresses in this browser.
                    </p>
                  )}
                  {deploymentError ? <p className="error">{deploymentError}</p> : null}
                </div>
              ) : null}
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
                  {isAuditorKeyConfigured(readOnlyState.auditorPublicKey)
                    ? "set"
                    : "missing"}
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
          ) : !address || !walletClient?.account?.address ? (
            <p className="muted">Waiting for the wallet session to finish loading.</p>
          ) : !readOnlyState?.registrar || readOnlyState.isConverter === undefined ? (
            <p className="muted">Reading live Fuji contract state...</p>
          ) : !starterConfig.contractAddress ||
            !starterConfig.circuitUrls ||
            !publicClient ||
            !walletClient ||
            !assetStatus.ready ? (
            <BlockedFlow config={starterConfig} assetStatus={assetStatus} />
          ) : (
            <PrivacyWorkbench
              key={`${starterConfig.contractAddress}:${address}:${starterConfig.preset}`}
              config={starterConfig}
              publicClient={publicClient}
              walletClient={walletClient}
              walletAddress={address}
              ownerAddress={readOnlyState.owner as `0x${string}`}
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
  ownerAddress,
}: {
  config: StarterConfig;
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>;
  walletClient: NonNullable<ReturnType<typeof useWalletClient>["data"]>;
  walletAddress?: `0x${string}`;
  ownerAddress?: `0x${string}`;
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
  const [depositAmount, setDepositAmount] = useState("1");
  const [mintAmount, setMintAmount] = useState("1");
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<string>("");
  const [needsBalanceRefresh, setNeedsBalanceRefresh] = useState(false);
  const [publicTokenState, setPublicTokenState] = useState<PublicTokenState>({});

  const eerc = useEERC(
    publicClient as CompatiblePublicClient,
    walletClient as CompatibleWalletClient,
    config.contractAddress!,
    config.circuitUrls!,
    decryptionKey || undefined,
  );

  const balance = eerc.useEncryptedBalance(config.tokenAddress);
  const publicTokenSymbol = publicTokenState.symbol ?? "token";
  const privateBalanceDecimals = Number(balance.decimals ?? 0n);
  const isOwner =
    Boolean(walletAddress && ownerAddress) &&
    walletAddress!.toLowerCase() === ownerAddress!.toLowerCase();
  const isStandaloneOwner =
    !eerc.isConverter &&
    isOwner;
  const hasEnoughAllowance = useMemo(() => {
    if (!publicTokenState.allowance || publicTokenState.decimals === undefined) {
      return false;
    }

    try {
      return publicTokenState.allowance >= parseUnits(depositAmount || "0", publicTokenState.decimals);
    } catch {
      return false;
    }
  }, [depositAmount, publicTokenState.allowance, publicTokenState.decimals]);

  useEffect(() => {
    if (!walletAddress || !config.tokenAddress || !config.contractAddress) {
      setPublicTokenState({});
      return;
    }

    let cancelled = false;

    const loadPublicTokenState = async () => {
      try {
        const [nextBalance, nextAllowance, nextDecimals, nextSymbol] = await Promise.all([
          publicClient.readContract({
            address: config.tokenAddress!,
            abi: erc20ReadOnlyAbi,
            functionName: "balanceOf",
            args: [walletAddress],
          }),
          publicClient.readContract({
            address: config.tokenAddress!,
            abi: erc20ReadOnlyAbi,
            functionName: "allowance",
            args: [walletAddress, config.contractAddress!],
          }),
          publicClient.readContract({
            address: config.tokenAddress!,
            abi: erc20ReadOnlyAbi,
            functionName: "decimals",
          }),
          publicClient.readContract({
            address: config.tokenAddress!,
            abi: erc20ReadOnlyAbi,
            functionName: "symbol",
          }),
        ]);

        if (!cancelled) {
          setPublicTokenState({
            balance: nextBalance,
            allowance: nextAllowance,
            decimals: Number(nextDecimals),
            symbol: nextSymbol,
          });
        }
      } catch {
        if (!cancelled) {
          setPublicTokenState({});
        }
      }
    };

    void loadPublicTokenState();
    const timer = window.setInterval(() => {
      void loadPublicTokenState();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [config.contractAddress, config.tokenAddress, publicClient, walletAddress]);

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
    if (!eerc.isInitialized || !eerc.isDecryptionKeySet) {
      setError("Privacy state is not ready yet.");
      setStatus("Private transfer failed");
      return;
    }

    if (needsBalanceRefresh) {
      setError("Refresh private balance after the last write before sending again.");
      setStatus("Private transfer failed");
      return;
    }

    if (!isAddress(recipient)) {
      setError("Recipient must be a valid EVM address.");
      setStatus("Private transfer failed");
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(amount)) {
      setError("Amount must be a valid token amount.");
      setStatus("Private transfer failed");
      return;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseUnits(amount, privateBalanceDecimals);
    } catch {
      setError("Amount does not match token decimals.");
      setStatus("Private transfer failed");
      return;
    }

    if (parsedAmount <= 0n) {
      setError("Amount must be greater than zero.");
      setStatus("Private transfer failed");
      return;
    }

    if (balance.decryptedBalance <= 0n || parsedAmount > balance.decryptedBalance) {
      setError("Amount is higher than the current private balance.");
      setStatus("Private transfer failed");
      return;
    }

    const recipientRegistration = await eerc.isAddressRegistered(recipient);
    if (!recipientRegistration.isRegistered) {
      setError("Recipient wallet has not registered a privacy key yet.");
      setStatus("Private transfer failed");
      return;
    }

    await runAction("Private transfer", async () => {
      const result = await balance.privateTransfer(recipient, parsedAmount);
      balance.refetchBalance();
      setNeedsBalanceRefresh(true);
      return `tx: ${result.transactionHash}`;
    });
  };

  const handleSetAuditor = async () => {
    if (!walletAddress || !isOwner) {
      setError("Only the contract owner can set the auditor key.");
      setStatus("Set auditor failed");
      return;
    }

    if (!eerc.isRegistered) {
      setError("Register this wallet first so the contract can reuse its public key.");
      setStatus("Set auditor failed");
      return;
    }

    await runAction("Set contract auditor", async () => {
      const transactionHash = await eerc.setContractAuditorPublicKey(walletAddress);
      return `tx: ${transactionHash}`;
    });
  };

  const handleApprove = async () => {
    if (!config.tokenAddress || !config.contractAddress) {
      setError("Converter token is not configured.");
      setStatus("Approve failed");
      return;
    }

    if (publicTokenState.decimals === undefined) {
      setError("Token decimals are not loaded yet.");
      setStatus("Approve failed");
      return;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseUnits(depositAmount, publicTokenState.decimals);
    } catch {
      setError("Deposit amount is invalid.");
      setStatus("Approve failed");
      return;
    }

    if (parsedAmount <= 0n) {
      setError("Deposit amount must be greater than zero.");
      setStatus("Approve failed");
      return;
    }

    const tokenAddress = config.tokenAddress;
    const contractAddress = config.contractAddress;
    const connectedWalletClient = walletClient as CompatibleWalletClient;

    await runAction("Approve public token", async () => {
      const { request } = await publicClient.simulateContract({
        address: tokenAddress,
        abi: erc20ApproveAbi,
        functionName: "approve",
        args: [contractAddress, parsedAmount],
        account: connectedWalletClient.account,
      });
      const transactionHash = await connectedWalletClient.writeContract(request);
      setPublicTokenState((current) => ({
        ...current,
        allowance: parsedAmount,
      }));
      return `tx: ${transactionHash}`;
    });
  };

  const handleDeposit = async () => {
    if (publicTokenState.decimals === undefined) {
      setError("Token decimals are not loaded yet.");
      setStatus("Deposit failed");
      return;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseUnits(depositAmount, publicTokenState.decimals);
    } catch {
      setError("Deposit amount is invalid.");
      setStatus("Deposit failed");
      return;
    }

    if (parsedAmount <= 0n) {
      setError("Deposit amount must be greater than zero.");
      setStatus("Deposit failed");
      return;
    }

    await runAction("Deposit to private balance", async () => {
      const result = await balance.deposit(parsedAmount);
      balance.refetchBalance();
      setNeedsBalanceRefresh(true);
      setPublicTokenState((current) => ({
        ...current,
        balance:
          current.balance === undefined ? current.balance : current.balance - parsedAmount,
      }));
      return `tx: ${result.transactionHash}`;
    });
  };

  const handlePrivateMint = async () => {
    if (!walletAddress || !isStandaloneOwner) {
      setError("Standalone private mint is only available to the contract owner.");
      setStatus("Private mint failed");
      return;
    }

    if (!eerc.isInitialized || !eerc.isDecryptionKeySet) {
      setError("Privacy state is not ready yet.");
      setStatus("Private mint failed");
      return;
    }

    if (needsBalanceRefresh) {
      setError("Refresh private balance after the last write before minting again.");
      setStatus("Private mint failed");
      return;
    }

    if (!/^\d+(\.\d+)?$/.test(mintAmount)) {
      setError("Mint amount must be a valid token amount.");
      setStatus("Private mint failed");
      return;
    }

    let parsedAmount: bigint;
    try {
      parsedAmount = parseUnits(mintAmount, privateBalanceDecimals);
    } catch {
      setError("Mint amount does not match token decimals.");
      setStatus("Private mint failed");
      return;
    }

    if (parsedAmount <= 0n) {
      setError("Mint amount must be greater than zero.");
      setStatus("Private mint failed");
      return;
    }

    await runAction("Private mint", async () => {
      const result = await balance.privateMint(walletAddress, parsedAmount);
      balance.refetchBalance();
      setNeedsBalanceRefresh(true);
      return `tx: ${result.transactionHash}`;
    });
  };

  const handleRefreshBalance = () => {
    balance.refetchBalance();
    setNeedsBalanceRefresh(false);
    setStatus("Balance refresh requested");
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
          <span>Private balance</span>
          <strong>{formatTokenAmount(balance.decryptedBalance, privateBalanceDecimals)}</strong>
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
        <button className="button button-ghost" onClick={handleRefreshBalance}>
          Refresh balance
        </button>
        {isOwner && eerc.isRegistered && !eerc.isAuditorKeySet ? (
          <button className="button button-ghost" onClick={handleSetAuditor}>
            Set contract auditor
          </button>
        ) : null}
      </div>

      {isOwner && !eerc.isAuditorKeySet ? (
        <p className="muted">
          Fresh repo-owned deployments need one owner action: register this wallet, then set
          it as the contract auditor before mint, deposit, or transfer.
        </p>
      ) : null}

      {needsBalanceRefresh ? (
        <p className="muted">
          Refresh private balance before the next write so the UI uses the latest state.
        </p>
      ) : null}

      {eerc.isConverter ? (
        <div className="stack">
          <div className="facts">
            <div>
              <span>Public {publicTokenSymbol} balance</span>
              <strong>
                {formatTokenAmount(publicTokenState.balance, publicTokenState.decimals)}
              </strong>
            </div>
            <div>
              <span>Allowance to converter</span>
              <strong>
                {formatTokenAmount(publicTokenState.allowance, publicTokenState.decimals)}
              </strong>
            </div>
          </div>
          <label className="field">
            <span>Deposit public {publicTokenSymbol} into private balance</span>
            <input
              value={depositAmount}
              onChange={(event) => setDepositAmount(event.target.value)}
              inputMode="decimal"
              placeholder="1"
            />
          </label>
          <div className="inline-actions">
            <button className="button button-ghost" onClick={handleApprove}>
              Approve {publicTokenSymbol}
            </button>
            <button
              className="button"
              onClick={handleDeposit}
              disabled={!eerc.isRegistered || !hasEnoughAllowance}
            >
              Deposit to private balance
            </button>
          </div>
          <p className="muted">
            In converter mode you need public {publicTokenSymbol} plus allowance before the
            private balance can increase.
          </p>
        </div>
      ) : null}

      {!eerc.isConverter ? (
        <div className="stack">
          <label className="field">
            <span>Mint private balance on standalone</span>
            <input
              value={mintAmount}
              onChange={(event) => setMintAmount(event.target.value)}
              inputMode="decimal"
              placeholder="1"
            />
          </label>
          <div className="inline-actions">
            <button
              className="button"
              onClick={handlePrivateMint}
              disabled={
                !eerc.isRegistered ||
                !eerc.isDecryptionKeySet ||
                !isStandaloneOwner ||
                needsBalanceRefresh
              }
            >
              Mint private balance
            </button>
          </div>
          <p className="muted">
            {isStandaloneOwner
              ? "Standalone mode skips public token deposit and mints directly into your private balance."
              : "Standalone minting is owner-only. Connect the deployer wallet, or use converter mode with public demo tokens."}
          </p>
        </div>
      ) : null}

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
            inputMode="decimal"
            placeholder="1"
          />
        </label>
        <button
          className="button"
          onClick={handleTransfer}
          disabled={!eerc.isRegistered || !eerc.isDecryptionKeySet || needsBalanceRefresh}
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
          <pre>{stringifyWithBigints(balance.encryptedBalance)}</pre>
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
