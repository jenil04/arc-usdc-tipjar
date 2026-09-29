import { configProblems, getAppDescription, getAppName, getAppUrl, safeNetwork } from '@/lib/config';
import { ENDPOINTS } from '@/lib/endpoints';
import { TOOLS } from '@/lib/tools/registry';
import { fetchTipJarStatus, getTipJarAddress, explorerBase, rpcUrl } from '@/lib/tipjar';

// Server-rendered so agents that don't run JavaScript get the whole page.
export const dynamic = 'force-dynamic';

const Code = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--card)] p-3 text-xs">
    <code>{children}</code>
  </pre>
);

export default async function AgentsPage() {
  const appUrl = getAppUrl();
  const network = safeNetwork();
  // Setup problems are shown only in development; in production callers just see the docs.
  const problems = process.env.NODE_ENV === 'production' ? [] : configProblems();
  const tipJar = network ? await fetchTipJarStatus(network) : null;
  const tipJarAddr = getTipJarAddress();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 font-mono text-sm leading-relaxed">
      {problems.length > 0 ? (
        <section className="mb-10 rounded-md border border-amber-500/60 p-4">
          <p className="font-semibold">Setup needed before this service can take payments:</p>
          <ul className="mt-2 list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <header className="mb-10">
        <h1 className="text-2xl font-bold">{getAppName()}</h1>
        <p className="mt-2 text-[var(--muted)]">{getAppDescription()}</p>
        <p className="mt-4 text-[var(--muted)]">
          Paid per call in USDC{network ? ` on ${network.label} (${network.id})` : ''} via x402. Machine-readable:{' '}
          <a className="underline" href="/llms.txt">
            /llms.txt
          </a>
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">UsdcTipJar on Arc</h2>
        {network ? (
          <div className="rounded-md border border-[var(--border)] p-4 space-y-2">
            <p>
              Chain: <code>{network.label}</code> · id <code>{network.chainId}</code> ·{' '}
              <a className="underline" href={explorerBase(network)} target="_blank" rel="noreferrer">
                explorer
              </a>
            </p>
            <p>
              RPC: <code>{rpcUrl(network)}</code>
            </p>
            <p>
              USDC ERC-20 (6 decimals): <code>{network.usdc}</code>
            </p>
            {tipJarAddr && tipJar?.configured ? (
              <>
                <p>
                  Tip jar:{' '}
                  <a
                    className="underline font-semibold"
                    href={tipJar.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tipJar.address}
                  </a>
                </p>
                {tipJar.owner ? (
                  <p>
                    Owner: <code>{tipJar.owner}</code>
                  </p>
                ) : null}
                {tipJar.ownerUsdcBalance !== undefined ? (
                  <p>
                    Owner ERC-20 USDC balance: <code>{tipJar.ownerUsdcBalance}</code> USDC
                  </p>
                ) : null}
                {tipJar.error ? <p className="text-amber-600">{tipJar.error}</p> : null}
              </>
            ) : (
              <p className="text-[var(--muted)]">
                Tip jar not deployed yet. After funding the deploy wallet with ~$1 USDC on Arc
                mainnet, run{' '}
                <code>NETWORK=arc CONFIRM_MAINNET=1 ./contracts/deploy.sh</code> and set{' '}
                <code>NEXT_PUBLIC_TIP_JAR_ADDRESS</code>.
              </p>
            )}
          </div>
        ) : (
          <p className="text-[var(--muted)]">NETWORK is not configured.</p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Paid endpoints</h2>
        <ul className="space-y-6">
          {ENDPOINTS.map((e) => {
            const query = e.exampleInput ? `?${new URLSearchParams(e.exampleInput)}` : '';
            return (
              <li key={e.path} className="rounded-md border border-[var(--border)] p-4">
                <p>
                  <code className="font-semibold">
                    {e.method} {e.path}
                  </code>{' '}
                  · ${e.priceUsd} USDC
                </p>
                <p className="mt-2 text-[var(--muted)]">{e.description}</p>
                <div className="mt-3 space-y-2">
                  <Code>{`# Unpaid: returns 402 + a PAYMENT-REQUIRED header (base64 JSON)
curl -i ${appUrl}${e.path}${query}`}</Code>
                  {e.exampleOutput ? <Code>{JSON.stringify(e.exampleOutput, null, 2)}</Code> : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[var(--muted)]">
          Pay with any x402 client, e.g. <code>@x402/fetch</code>: it reads the 402, signs a USDC
          authorization, and retries with a PAYMENT-SIGNATURE header.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">MCP (free tools)</h2>
        <Code>{JSON.stringify({ mcpServers: { service: { url: `${appUrl}/api/mcp` } } }, null, 2)}</Code>
        <ul className="mt-4 space-y-2">
          {TOOLS.map((t) => (
            <li key={t.name}>
              <code className="font-semibold">{t.name}</code>: {t.description}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
