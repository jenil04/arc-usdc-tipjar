import { getAppName } from '@/lib/config';
import { RPC, jsonResponse, rpcErr, rpcOk, toolResult, type JsonRpcRequest } from '@/lib/mcp';
import { handlers } from '@/lib/tools/handlers';
import { TOOLS } from '@/lib/tools/registry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * MCP server: JSON-RPC 2.0 over POST /api/mcp.
 *  - `tools/list` → src/lib/tools/registry.ts
 *  - `tools/call` → src/lib/tools/handlers.ts
 */
export async function POST(req: Request): Promise<Response> {
  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return jsonResponse(rpcErr(null, RPC.PARSE_ERROR, 'Invalid JSON'), 400);
  }
  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return jsonResponse(rpcErr(body?.id ?? null, RPC.INVALID_REQUEST, 'Invalid JSON-RPC 2.0 request'), 400);
  }

  const { id, method, params } = body;

  if (method === 'initialize') {
    return jsonResponse(
      rpcOk(id, {
        protocolVersion: '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: getAppName(), version: '1.0.0' },
      }),
    );
  }
  if (method === 'notifications/initialized') return new Response(null, { status: 202 });
  if (method === 'tools/list') return jsonResponse(rpcOk(id, { tools: TOOLS }));

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = (params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
    const handler = name ? handlers[name] : undefined;
    if (!handler) return jsonResponse(rpcErr(id, RPC.METHOD_NOT_FOUND, `Unknown tool: ${name}`), 404);
    try {
      return jsonResponse(rpcOk(id, toolResult(await handler(args))));
    } catch (err) {
      console.error(`[mcp] tool "${name}" failed:`, err);
      return jsonResponse(rpcErr(id, RPC.INTERNAL_ERROR, 'Tool execution failed.'), 500);
    }
  }

  return jsonResponse(rpcErr(id, RPC.METHOD_NOT_FOUND, `Method not found: ${method}`), 404);
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
