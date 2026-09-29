# Arc USDC Tip Jar

A small, deployable product on **Arc mainnet** for [Arc Microgrants](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq):

1. **UsdcTipJar** — Solidity contract that accepts ERC-20 USDC tips (6 decimals) and forwards them to an owner.
2. **x402 agent service** — Next.js docs/demo page plus paid MCP-discoverable HTTP endpoints agents can call for live tip-jar status and tip intents.

Built from EarnKit starters:

- App: [earnkitai/starter-agent-service](https://github.com/earnkitai/starter-agent-service)
- Contract: [earnkitai/chain-kits `arc/example`](https://github.com/earnkitai/chain-kits/tree/main/arc/example)

## What Arc is used for

| Piece | Role on Arc |
|---|---|
| `UsdcTipJar.sol` | On-chain tip jar; tips settle in ERC-20 USDC at `0x3600…0000` |
| Gas | Native USDC, **18 decimals** (never mix with ERC-20 amounts) |
| x402 payments | Agents pay per call in USDC via Circle Facilitator (`NETWORK=arc`) |
| Docs page `/` | Shows live contract on [explorer.arc.io](https://explorer.arc.io), owner, balance |

Arc mainnet: chain id `5042`, RPC `https://rpc.mainnet.arc.io`, explorer `https://explorer.arc.io`.

## Quick start (local)

```sh
npm install
npm run wallet          # creates .env.local with PAY_TO + SELLER_PRIVATE_KEY
# edit .env.local: NETWORK=arc, NEXT_PUBLIC_APP_NAME, etc.
npm run dev             # http://localhost:3000
```

Check the paywall (expect `402`):

```sh
curl -i "http://localhost:3000/api/arc-status"
curl -i "http://localhost:3000/api/tip-intent?amount=0.5&note=hello"
```

## Deploy UsdcTipJar to Arc mainnet

Needs Foundry (`forge`, `cast`) and a little USDC on Arc for gas (~$1 is enough for deploy + a tip).

```sh
cd contracts
cp .env.example .env
# set PRIVATE_KEY (same key as SELLER_PRIVATE_KEY is fine)
# NETWORK=arc
NETWORK=arc CONFIRM_MAINNET=1 ./deploy.sh
```

Then put the printed jar address into the app `.env.local`:

```
NEXT_PUBLIC_TIP_JAR_ADDRESS=0x...
```

**Mainnet spends real USDC.** Do not run deploy until the wallet is funded and you intend to deploy.

Verify mainnet contracts at https://explorer.arc.io/contract-verification (CLI verify sits behind Cloudflare).

## Paid endpoints

| Path | Price | Returns |
|---|---|---|
| `GET /api/arc-status` | $0.001 USDC | Chain info + tip-jar address, owner, ERC-20 USDC balance, explorer URL |
| `GET /api/tip-intent?amount=0.5&note=...` | $0.001 USDC | Approve + tip cast commands / calldata hints |

Also: free MCP at `/api/mcp` (`list_paid_endpoints`), machine-readable `/llms.txt`.

## Go live (hosting)

1. Deploy the Next.js app (e.g. `npx vercel`) and set env from `.env.example`, including `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_TIP_JAR_ADDRESS`.
2. Keep `NETWORK=arc` for Arc Microgrants.
3. Keyless trial works on mainnet with a limited number of settlements per `PAY_TO`; after that set `CIRCLE_API_KEY` from [Circle Console](https://console.circle.com).

## Arc Microgrant notes

- Target: live prototype on **Arc mainnet** (not testnet).
- Submission needs a public repo + live deployment link.
- Submissions close **October 14, 2026**; this repo is the product code — do not submit until the contract is deployed and the app is hosted.
- Never commit `.env`, `.env.local`, or private keys.

## Credits

MIT. Contract and agent-service patterns from [EarnKit](https://earnkit.com) / Circle Arc kits.
