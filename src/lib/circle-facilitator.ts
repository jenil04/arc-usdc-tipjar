import type { FacilitatorClient } from '@x402/core/server';
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  SupportedResponse,
  VerifyResponse,
} from '@x402/core/types';
import { keccak256, toBytes, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getCircleApiKey, getSellerPrivateKey } from './config';
import { networkById } from './networks';

/**
 * x402 facilitator client for Circle's Facilitator Service (Arc + Base, mainnet + testnet).
 * https://developers.circle.com/facilitator-service
 *
 * Auth, in order:
 *  1. CIRCLE_API_KEY → `Authorization: Bearer` (production; no trial limit).
 *  2. SELLER_PRIVATE_KEY → keyless trial: every call carries a fresh EIP-712 "seller proof"
 *     signed by the key that controls PAY_TO, bound to the call's purpose and exact body.
 *
 * The built-in HTTPFacilitatorClient can't do (2): its auth hook never sees the request body.
 */
const BASE_URL = 'https://api.circle.com/v1/facilitator/x402';

type Purpose = 'verify' | 'settle';

async function sellerProof(purpose: Purpose, body: string, requirements: PaymentRequirements) {
  const key = getSellerPrivateKey();
  if (!key) {
    throw new Error('Set CIRCLE_API_KEY, or SELLER_PRIVATE_KEY (the key for PAY_TO) for the keyless trial');
  }
  const network = networkById(requirements.network);
  if (!network) throw new Error(`Unsupported network ${requirements.network}`);

  const account = privateKeyToAccount(key);
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 300; // the service allows at most 5 minutes
  const payTo = requirements.payTo as `0x${string}`;

  const signature = await account.signTypedData({
    domain: { name: 'Circle Facilitator Seller Request', version: '1', chainId: network.chainId },
    types: {
      SellerRequest: [
        { name: 'purpose', type: 'string' },
        { name: 'method', type: 'string' },
        { name: 'bodyHash', type: 'bytes32' },
        { name: 'network', type: 'string' },
        { name: 'payTo', type: 'address' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'issuedAt', type: 'uint64' },
        { name: 'expiresAt', type: 'uint64' },
      ],
    },
    primaryType: 'SellerRequest',
    message: {
      purpose,
      method: 'POST',
      bodyHash: keccak256(toBytes(body)),
      network: requirements.network,
      payTo,
      nonce,
      issuedAt: BigInt(issuedAt),
      expiresAt: BigInt(expiresAt),
    },
  });

  const envelope = { version: 1, signature, network: requirements.network, payTo, nonce, issuedAt, expiresAt };
  return Buffer.from(JSON.stringify(envelope)).toString('base64url');
}

async function call(purpose: Purpose, payload: PaymentPayload, requirements: PaymentRequirements) {
  const body = JSON.stringify({ x402Version: 2, paymentPayload: payload, paymentRequirements: requirements });
  const apiKey = getCircleApiKey();
  const auth: Record<string, string> = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : { 'Facilitator-Seller-Proof': await sellerProof(purpose, body, requirements) };

  const res = await fetch(`${BASE_URL}/${purpose}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...auth },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // e.g. 403 registration_required once the keyless trial is used up.
    throw new Error(`Circle facilitator ${purpose} failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

export const circleFacilitator: FacilitatorClient = {
  async verify(payload, requirements) {
    return (await call('verify', payload, requirements)) as unknown as VerifyResponse;
  },

  async settle(payload, requirements) {
    // Always HTTP 200. `success: false` with errorReason "settlement_pending" means it
    // hasn't confirmed yet: never deliver on pending (the x402 server won't, since success is false).
    return (await call('settle', payload, requirements)) as unknown as SettleResponse;
  },

  async getSupported() {
    const res = await fetch(`${BASE_URL}/supported`, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Circle facilitator /supported failed (${res.status})`);
    return (await res.json()) as SupportedResponse;
  },
};
