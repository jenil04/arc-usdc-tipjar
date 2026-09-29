/**
 * Networks this service can be paid on. Values checked on 2026-09-29 against Circle's
 * Facilitator Service (/supported) and each chain's USDC contract (name(), version()).
 *
 * The EIP-712 name differs per network ("USD Coin" on Base mainnet, "USDC" elsewhere);
 * payments fail if it's wrong, so it's per network, never hardcoded.
 */
export const NETWORKS = {
  arc: {
    id: 'eip155:5042',
    chainId: 5042,
    label: 'Arc',
    usdc: '0x3600000000000000000000000000000000000000',
    usdcName: 'USDC',
    testnet: false,
  },
  'arc-testnet': {
    id: 'eip155:5042002',
    chainId: 5042002,
    label: 'Arc testnet',
    usdc: '0x3600000000000000000000000000000000000000',
    usdcName: 'USDC',
    testnet: true,
  },
  base: {
    id: 'eip155:8453',
    chainId: 8453,
    label: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    usdcName: 'USD Coin',
    testnet: false,
  },
  'base-sepolia': {
    id: 'eip155:84532',
    chainId: 84532,
    label: 'Base Sepolia',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcName: 'USDC',
    testnet: true,
  },
} as const;

export type NetworkKey = keyof typeof NETWORKS;
export type Network = (typeof NETWORKS)[NetworkKey];

export const networkById = (id: string): Network | undefined =>
  Object.values(NETWORKS).find((n) => n.id === id);

/** USDC uses 6 decimals on every network here. On Arc, never use the 18-decimal native balance. */
export const USDC_DECIMALS = 6;

/** "$0.01" style price → an exact USDC amount on `network` (atomic units, 6 decimals). */
export function usdc(network: Network, dollars: number) {
  return {
    amount: String(Math.round(dollars * 10 ** USDC_DECIMALS)),
    asset: network.usdc,
    extra: { name: network.usdcName, version: '2' },
  };
}
