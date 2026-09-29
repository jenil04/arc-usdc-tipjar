import { getAppDescription, getAppName, getAppUrl, safeNetwork } from '@/lib/config';
import { ENDPOINTS } from '@/lib/endpoints';
import { TOOLS } from '@/lib/tools/registry';

export const dynamic = 'force-dynamic';

/** Machine-readable index, generated from the same lists as /agents. */
export function GET(): Response {
  const appUrl = getAppUrl();
  const network = safeNetwork();
  if (!network) return new Response('Service is not configured yet.\n', { status: 503 });
  const body = [
    `# ${getAppName()}`,
    '',
    `> ${getAppDescription()}`,
    '',
    `Payments: x402, exact scheme, USDC on ${network.label} (${network.id}).`,
    'An unpaid call returns HTTP 402 with a base64 PAYMENT-REQUIRED header; retry with PAYMENT-SIGNATURE.',
    '',
    '## Paid endpoints',
    '',
    ...ENDPOINTS.map((e) => `- ${e.method} ${appUrl}${e.path}: ${e.description} ($${e.priceUsd} USDC)`),
    '',
    '## MCP (free tools)',
    '',
    `Server: ${appUrl}/api/mcp`,
    ...TOOLS.map((t) => `- ${t.name}: ${t.description}`),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
