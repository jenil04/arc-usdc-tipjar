# Arc USDC Tip Jar

**Live on Arc mainnet:** https://jenil04.github.io/arc-usdc-tipjar/

| | |
|---|---|
| Contract (`UsdcTipJar`) | [`0x8Ab0Aa71f4a80f64024faAd7068278645b70f0C3`](https://explorer.arc.io/address/0x8Ab0Aa71f4a80f64024faAd7068278645b70f0C3) |
| Deploy tx | [`0x5ef1d11b…add2e6`](https://explorer.arc.io/tx/0x5ef1d11bb52e57689ee9ac6722106c82d84a4b1b74cba9d8f6396c5954add2e6) (block 24912362) |
| First tip (0.01 USDC) | [`0x3e1426cb…0e226f`](https://explorer.arc.io/tx/0x3e1426cb17bcd371ea63f00db4e62d8f0e28a329daf9cda222dfd38ac90e226f) |
| Chain | Arc mainnet, chain id `5042` |
| Explorer | https://explorer.arc.io/address/0x8Ab0Aa71f4a80f64024faAd7068278645b70f0C3 |

A small, deployable product on **Arc mainnet** for [Arc Microgrants](https://community.arc.io/public/events/arc-microgrants-f8tijfjhyq):

1. **UsdcTipJar** — Solidity contract that accepts ERC-20 USDC tips (6 decimals) and forwards them to an owner.
2. **Tip dapp** (`site/`) — static page hosted on GitHub Pages: live owner balance, recent `Tipped` events, and an approve + tip flow through the visitor's own browser wallet. No backend, no keys.
3. **x402 agent service** — Next.js docs/demo page plus paid MCP-discoverable HTTP endpoints agents can call for live tip-jar status and tip intents.

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

**Mainnet spends real USDC.** The deploy above cost about 0.008 USDC in gas.

Verify mainnet contracts at https://explorer.arc.io/contract-verification (CLI verify sits behind Cloudflare).

## Paid endpoints

| Path | Price | Returns |
|---|---|---|
| `GET /api/arc-status` | $0.001 USDC | Chain info + tip-jar address, owner, ERC-20 USDC balance, explorer URL |
| `GET /api/tip-intent?amount=0.5&note=...` | $0.001 USDC | Approve + tip cast commands / calldata hints |

Also: free MCP at `/api/mcp` (`list_paid_endpoints`), machine-readable `/llms.txt`.

## Hosting

- **Tip dapp:** `site/` is plain HTML/JS published to the `gh-pages` branch and served by GitHub Pages at https://jenil04.github.io/arc-usdc-tipjar/. It reads Arc over the public RPC and signs only in the visitor's wallet, so the host never holds a key. To republish after editing `site/`:
  ```sh
  git subtree split --prefix site -b gh-pages-build && git push -f origin gh-pages-build:gh-pages && git branch -D gh-pages-build
  ```
- **x402 agent service (Next.js):** needs a Node host (e.g. `npx vercel --prod`) with env from `.env.example`, including `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_TIP_JAR_ADDRESS=0x8Ab0Aa71f4a80f64024faAd7068278645b70f0C3`. Keep `NETWORK=arc`. For settlement on a shared host use `CIRCLE_API_KEY` from [Circle Console](https://console.circle.com); the keyless trial (`SELLER_PRIVATE_KEY`) is for local runs only. Without either, the docs page still renders and paid routes answer 503.

## Arc Microgrant notes

- Target: live prototype on **Arc mainnet** (not testnet).
- Submission needs a public repo + live deployment link.
- Submissions close **October 14, 2026**. Contract is deployed on Arc mainnet and the tip dapp is live (links at the top).
- Never commit `.env`, `.env.local`, or private keys.

## Credits

MIT. Contract and agent-service patterns from [EarnKit](https://earnkit.com) / Circle Arc kits.
