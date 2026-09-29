import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS, type NetworkKey } from './networks';

/**
 * Typed env access. Missing payment config throws where it's used (not at import), so the
 * docs pages still build and render without it.
 */
function env(name: string) {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

export function getNetwork() {
  const key = (env('NETWORK') ?? 'arc-testnet') as NetworkKey;
  const network = NETWORKS[key];
  if (!network) {
    throw new Error(`NETWORK must be one of: ${Object.keys(NETWORKS).join(', ')} (got "${key}")`);
  }
  return network;
}

/** Wallet that receives USDC. */
export function getPayTo() {
  const payTo = env('PAY_TO');
  if (!payTo || !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
    throw new Error('PAY_TO is missing or not an 0x address. Run `npm run wallet` to create one.');
  }
  return payTo as `0x${string}`;
}

/** Circle API key (production). Without it, the keyless trial is used. */
export const getCircleApiKey = () => env('CIRCLE_API_KEY');

/** Private key controlling PAY_TO, only for the keyless trial's seller proof. */
export const getSellerPrivateKey = () => env('SELLER_PRIVATE_KEY') as `0x${string}` | undefined;

/**
 * Everything wrong with the payment setup, as fixes for the builder. Empty when ready.
 * Checked on each paid request so misconfiguration never looks healthy.
 */
export function configProblems(): string[] {
  const problems: string[] = [];
  try {
    getNetwork();
  } catch (err) {
    problems.push((err as Error).message);
  }
  let payTo: string | undefined;
  try {
    payTo = getPayTo();
  } catch (err) {
    problems.push((err as Error).message);
  }
  const sellerKey = getSellerPrivateKey();
  if (!getCircleApiKey()) {
    if (!sellerKey) {
      problems.push('Set CIRCLE_API_KEY, or SELLER_PRIVATE_KEY for the keyless trial (`npm run wallet` sets it).');
    } else if (payTo) {
      try {
        if (privateKeyToAccount(sellerKey).address.toLowerCase() !== payTo.toLowerCase()) {
          problems.push('SELLER_PRIVATE_KEY must be the private key of PAY_TO.');
        }
      } catch {
        problems.push('SELLER_PRIVATE_KEY is not a valid private key (0x + 64 hex characters).');
      }
    }
  }
  return problems;
}

/** The network, or undefined if NETWORK is invalid (for pages that should still render). */
export function safeNetwork() {
  try {
    return getNetwork();
  } catch {
    return undefined;
  }
}

export const getAppName = () => env('NEXT_PUBLIC_APP_NAME') ?? 'My Agent Service';
export const getAppDescription = () =>
  env('NEXT_PUBLIC_APP_DESCRIPTION') ?? 'A service other agents pay per call in USDC.';
export const getAppUrl = () => (env('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
