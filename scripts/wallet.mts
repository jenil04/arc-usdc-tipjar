/**
 * Create a wallet and save it to .env.local (created from .env.example if missing), so keys
 * never need to be copied from the terminal.
 *
 *   npm run wallet            # the service's wallet: PAY_TO + SELLER_PRIVATE_KEY
 *   npm run wallet -- buyer   # a test buyer for `npm run pay`: BUYER_PRIVATE_KEY
 *
 * Existing values are never overwritten.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const FILE = '.env.local';
const buyer = process.argv[2] === 'buyer';
const key = generatePrivateKey();
const address = privateKeyToAccount(key).address;
const values: Record<string, string> = buyer
  ? { BUYER_PRIVATE_KEY: key }
  : { PAY_TO: address, SELLER_PRIVATE_KEY: key };

if (!existsSync(FILE)) copyFileSync('.env.example', FILE);
let text = readFileSync(FILE, 'utf8');
for (const [name, value] of Object.entries(values)) {
  const line = new RegExp(`^${name}=(.*)$`, 'm');
  const current = text.match(line)?.[1]?.trim();
  if (current) {
    console.error(`${FILE} already has ${name}. Clear it first to replace it.`);
    process.exit(1);
  }
  text = line.test(text) ? text.replace(line, `${name}=${value}`) : `${text.trimEnd()}\n${name}=${value}\n`;
}
writeFileSync(FILE, text);

console.log(`Saved to ${FILE}. ${buyer ? 'Buyer' : 'Service (PAY_TO)'} address: ${address}`);
if (buyer) console.log('Fund it with test USDC at https://faucet.circle.com (choose your NETWORK).');
