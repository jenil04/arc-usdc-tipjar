/**
 * Free MCP tools: what `tools/list` returns, and what /agents and /llms.txt document.
 * Paid work lives at HTTP endpoints (src/lib/endpoints.ts), because x402 payments are
 * made over HTTP by the calling agent's x402 client.
 */
export interface ToolDef {
  /** snake_case tool name. */
  name: string;
  /** One sentence the calling agent reads. */
  description: string;
  /** JSON Schema: { type: 'object', properties: {...}, required: [...] }. */
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOLS: ToolDef[] = [
  {
    name: 'list_paid_endpoints',
    description:
      'List this service\'s paid HTTP endpoints with their price in USDC and network. Call them with an x402 client.',
    inputSchema: { type: 'object', properties: {} },
  },
];
