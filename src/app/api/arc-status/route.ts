import { NextResponse, type NextRequest } from 'next/server';
import { paid } from '@/lib/paid';
import { getNetwork } from '@/lib/config';
import { NETWORKS } from '@/lib/networks';
import { fetchTipJarStatus, rpcUrl, explorerBase } from '@/lib/tipjar';

export const runtime = 'nodejs';

function networkKey(id: string) {
  return Object.entries(NETWORKS).find(([, n]) => n.id === id)?.[0];
}

/** Paid: live Arc tip-jar + chain status agents can trust. */
export const GET = paid('/api/arc-status', async (_req: NextRequest) => {
  const network = getNetwork();
  const tipJar = await fetchTipJarStatus(network);
  return NextResponse.json({
    network: {
      key: networkKey(network.id),
      id: network.id,
      chainId: network.chainId,
      label: network.label,
      testnet: network.testnet,
      rpc: rpcUrl(network),
      explorer: explorerBase(network),
    },
    tipJar,
    usdcErc20: network.usdc,
    note: 'Amounts are 6-decimal ERC-20 USDC. Arc gas is native USDC with 18 decimals; never mix them.',
  });
});
