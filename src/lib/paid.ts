import { x402ResourceServer } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { withX402 } from '@x402/next';
import { NextResponse, type NextRequest } from 'next/server';
import { circleFacilitator } from './circle-facilitator';
import { configProblems, getNetwork, getPayTo } from './config';
import { endpoint } from './endpoints';
import { usdc } from './networks';

/** One x402 resource server for the app, settling through Circle's Facilitator Service. */
export const server = new x402ResourceServer(circleFacilitator).register('eip155:*', new ExactEvmScheme());

/**
 * Wraps a route handler so each call costs the endpoint's price in USDC.
 * Unpaid calls get HTTP 402 with payment requirements; paid calls run the handler, and the
 * payment settles only if the handler succeeds (status < 400), so buyers never pay for errors.
 * If payments aren't configured, callers get a plain 503 and the server log says how to fix it.
 */
export function paid<T>(path: string, handler: (req: NextRequest) => Promise<NextResponse<T>>) {
  const ep = endpoint(path);
  let protectedHandler: ((req: NextRequest) => Promise<NextResponse>) | undefined;

  return async (req: NextRequest): Promise<NextResponse> => {
    const problems = configProblems();
    if (problems.length > 0) {
      console.error(`[payments] ${ep.path} can't take payments yet:\n- ${problems.join('\n- ')}`);
      return NextResponse.json({ error: 'This service is not accepting payments right now.' }, { status: 503 });
    }
    const network = getNetwork();
    protectedHandler ??= withX402(
      handler,
      {
        [ep.path]: {
          accepts: {
            scheme: 'exact',
            network: network.id,
            price: usdc(network, ep.priceUsd),
            payTo: getPayTo(),
          },
          description: ep.description,
          mimeType: 'application/json',
        },
      },
      server,
    );
    return protectedHandler(req);
  };
}
