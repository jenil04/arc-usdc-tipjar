/**
 * Read-only helpers for the UsdcTipJar contract on Arc.
 * Uses public RPC; never touches private keys.
 */
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { NETWORKS, USDC_DECIMALS, type Network } from './networks';

const USDC_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const TIP_JAR_ABI = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'USDC',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
] as const;

const RPC: Record<string, string> = {
  arc: 'https://rpc.mainnet.arc.io',
  'arc-testnet': 'https://rpc.testnet.arc.io',
};

const EXPLORER: Record<string, string> = {
  arc: 'https://explorer.arc.io',
  'arc-testnet': 'https://explorer.testnet.arc.io',
};

export function getTipJarAddress(): Address | undefined {
  const v = process.env.NEXT_PUBLIC_TIP_JAR_ADDRESS?.trim();
  if (!v || !/^0x[0-9a-fA-F]{40}$/.test(v)) return undefined;
  return v as Address;
}

export function explorerBase(network: Network) {
  const key = Object.entries(NETWORKS).find(([, n]) => n.id === network.id)?.[0] ?? 'arc';
  return EXPLORER[key] ?? 'https://explorer.arc.io';
}

export function rpcUrl(network: Network) {
  const key = Object.entries(NETWORKS).find(([, n]) => n.id === network.id)?.[0] ?? 'arc';
  return RPC[key] ?? 'https://rpc.mainnet.arc.io';
}

function clientFor(network: Network) {
  return createPublicClient({
    transport: http(rpcUrl(network), {
      fetchOptions: { headers: { 'User-Agent': 'arc-usdc-tipjar/0.1' } },
    }),
  });
}

export type TipJarStatus = {
  configured: boolean;
  address?: Address;
  owner?: Address;
  ownerUsdcBalance?: string;
  ownerUsdcBalanceAtomic?: string;
  usdcErc20: string;
  explorerUrl?: string;
  error?: string;
};

/** Live owner + ERC-20 USDC balance for the tip jar (or a clear "not deployed" status). */
export async function fetchTipJarStatus(network: Network): Promise<TipJarStatus> {
  const usdcErc20 = network.usdc;
  const address = getTipJarAddress();
  if (!address) {
    return {
      configured: false,
      usdcErc20,
      error: 'NEXT_PUBLIC_TIP_JAR_ADDRESS is not set. Deploy with contracts/deploy.sh first.',
    };
  }

  try {
    const client = clientFor(network);
    const owner = (await client.readContract({
      address,
      abi: TIP_JAR_ABI,
      functionName: 'owner',
    })) as Address;
    const bal = (await client.readContract({
      address: usdcErc20 as Address,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [owner],
    })) as bigint;

    return {
      configured: true,
      address,
      owner,
      ownerUsdcBalance: formatUnits(bal, USDC_DECIMALS),
      ownerUsdcBalanceAtomic: bal.toString(),
      usdcErc20,
      explorerUrl: `${explorerBase(network)}/address/${address}`,
    };
  } catch (err) {
    return {
      configured: true,
      address,
      usdcErc20,
      explorerUrl: `${explorerBase(network)}/address/${address}`,
      error: `Could not read tip jar on-chain: ${(err as Error).message}`,
    };
  }
}

/** Build approve + tip cast commands for a given amount (USDC, 6 decimals) and note. */
export function buildTipIntent(opts: {
  tipJar: Address;
  network: Network;
  amountUsdc: number;
  note: string;
}) {
  const { tipJar, network, amountUsdc, note } = opts;
  if (!(amountUsdc > 0) || !Number.isFinite(amountUsdc)) {
    throw new Error('amount must be a positive number (USDC, e.g. 0.5)');
  }
  const atomic = BigInt(Math.round(amountUsdc * 10 ** USDC_DECIMALS));
  const rpc = rpcUrl(network);
  const usdc = network.usdc;
  const safeNote = note.slice(0, 120).replace(/"/g, "'");

  return {
    tipJar,
    amountUsdc: String(amountUsdc),
    amountAtomic: atomic.toString(),
    note: safeNote,
    usdcErc20: usdc,
    rpc,
    explorerUrl: `${explorerBase(network)}/address/${tipJar}`,
    steps: {
      approve: `cast send ${usdc} 'approve(address,uint256)' ${tipJar} ${atomic} --rpc-url ${rpc} --private-key $PRIVATE_KEY`,
      tip: `cast send ${tipJar} 'tip(uint256,string)' ${atomic} "${safeNote}" --rpc-url ${rpc} --private-key $PRIVATE_KEY`,
    },
    abiHints: {
      approve: 'USDC.approve(tipJar, amountAtomic)',
      tip: 'UsdcTipJar.tip(amountAtomic, note) — transfers ERC-20 USDC (6 decimals) to owner',
    },
  };
}
