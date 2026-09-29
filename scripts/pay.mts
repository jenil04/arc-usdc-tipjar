/**
 * Pay for one of your own endpoints, as a buyer agent would.
 *
 *   BUYER_PRIVATE_KEY=0x... npm run pay -- http://localhost:3000/api/example?name=builder
 *
 * The buyer wallet needs a little USDC on the service's network. On Arc testnet or Base
 * Sepolia, get test USDC from Circle's faucet: https://faucet.circle.com
 */
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS, type NetworkKey } from '../src/lib/networks.ts';
import { existsSync } from 'node:fs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const url = process.argv[2] ?? 'http://localhost:3000/api/example?name=builder';
const key = process.env.BUYER_PRIVATE_KEY as `0x${string}` | undefined;
if (!key) {
  console.error('No BUYER_PRIVATE_KEY. Run `npm run wallet -- buyer`, then fund it at https://faucet.circle.com');
  process.exit(1);
}

const network = NETWORKS[(process.env.NETWORK ?? 'arc-testnet') as NetworkKey];
if (!network) {
  console.error(`NETWORK must be one of: ${Object.keys(NETWORKS).join(', ')}`);
  process.exit(1);
}
const account = privateKeyToAccount(key);
// x402 clients only pay in tokens they recognize. Arc USDC isn't in @x402's built-in list
// yet (2.27), so allow this network's USDC explicitly, capped at $1 per payment.
const client = new x402Client()
  .register(network.id, new ExactEvmScheme(account))
  .setSpendControls({
    allowedAssets: [{ network: network.id, asset: network.usdc, maxAmountPerPayment: '1000000' }],
  });
const fetchWithPay = wrapFetchWithPayment(fetch, client);

console.log(`Buyer ${account.address} paying on ${network.label}: ${url}`);
const res = await fetchWithPay(url);
console.log(`HTTP ${res.status}`);
console.log(await res.text());
if (!res.ok) process.exitCode = 1;
if (res.status === 402) {
  // Still unpaid: the reason (e.g. insufficient_funds) is in the PAYMENT-REQUIRED header.
  const required = res.headers.get('PAYMENT-REQUIRED');
  const reason = required ? JSON.parse(Buffer.from(required, 'base64').toString()).error : undefined;
  console.log(`Payment not accepted: ${reason ?? 'unknown reason'}`);
}
const receipt = res.headers.get('PAYMENT-RESPONSE');
if (receipt) console.log('Settlement:', decodePaymentResponseHeader(receipt));
