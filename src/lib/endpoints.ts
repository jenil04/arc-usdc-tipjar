/**
 * Paid endpoints: the single list the route wrappers, /agents docs, /llms.txt, and the MCP
 * `list_paid_endpoints` tool all read from, so prices and descriptions never drift.
 *
 * To add one: add an entry here, then create `src/app<path>/route.ts` exporting
 * `export const GET = paid('<path>', handler)`.
 */
export type PaidEndpoint = {
  path: `/api/${string}`;
  method: 'GET' | 'POST';
  /** One sentence an agent reads to decide whether to pay. */
  description: string;
  /** Price per call in US dollars, paid in USDC. */
  priceUsd: number;
  /** Example query or body, shown in the docs. */
  exampleInput?: Record<string, string>;
  /** What a paid call returns, shown in the docs. */
  exampleOutput?: unknown;
};

export const ENDPOINTS: PaidEndpoint[] = [
  {
    path: '/api/arc-status',
    method: 'GET',
    description:
      'Live Arc mainnet tip-jar status: chain id, RPC, explorer link, UsdcTipJar address, owner, and ERC-20 USDC balance of the owner.',
    priceUsd: 0.001,
    exampleOutput: {
      network: { key: 'arc', id: 'eip155:5042', chainId: 5042, label: 'Arc' },
      tipJar: {
        address: '0x...',
        owner: '0x...',
        ownerUsdcBalance: '1.25',
        explorerUrl: 'https://explorer.arc.io/address/0x...',
      },
      usdcErc20: '0x3600000000000000000000000000000000000000',
      note: 'Amounts are 6-decimal ERC-20 USDC. Arc gas is native USDC with 18 decimals.',
    },
  },
  {
    path: '/api/tip-intent',
    method: 'GET',
    description:
      'Build a tip intent for UsdcTipJar: approve + tip calldata and ready-to-run cast commands for a chosen amount and note.',
    priceUsd: 0.001,
    exampleInput: { amount: '0.5', note: 'thanks' },
    exampleOutput: {
      tipJar: '0x...',
      amountUsdc: '0.5',
      amountAtomic: '500000',
      note: 'thanks',
      steps: {
        approve: 'cast send 0x3600…0000 approve(address,uint256) <jar> 500000 ...',
        tip: 'cast send <jar> tip(uint256,string) 500000 "thanks" ...',
      },
    },
  },
];

export function endpoint(path: string) {
  const ep = ENDPOINTS.find((e) => e.path === path);
  if (!ep) throw new Error(`${path} is not in ENDPOINTS (src/lib/endpoints.ts)`);
  return ep;
}
