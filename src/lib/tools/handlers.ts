import { getAppUrl, safeNetwork } from '@/lib/config';
import { ENDPOINTS } from '@/lib/endpoints';

/** One handler per tool in registry.ts. Return plain data; the MCP route wraps it. */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export const handlers: Record<string, ToolHandler> = {
  async list_paid_endpoints() {
    const network = safeNetwork();
    if (!network) return { error: 'This service is not configured yet.' };
    return {
      network: { id: network.id, name: network.label, testnet: network.testnet },
      payment: 'x402 (exact scheme, USDC). An unpaid call returns HTTP 402 with the payment requirements.',
      endpoints: ENDPOINTS.map((e) => ({
        url: `${getAppUrl()}${e.path}`,
        method: e.method,
        description: e.description,
        price_usd: e.priceUsd,
        example_input: e.exampleInput,
        example_output: e.exampleOutput,
      })),
    };
  },
};
