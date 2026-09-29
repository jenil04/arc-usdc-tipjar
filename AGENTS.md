# Notes for coding agents

This repo is **arc-usdc-tipjar**: UsdcTipJar on Arc + an x402-paid agent service.
Read README.md first. Based on EarnKit `starter-agent-service` and `chain-kits/arc/example`.

## Building

- Paid work lives in route handlers under `src/app/api/`. Keep price/description in `src/lib/endpoints.ts`.
- Tip-jar reads: `src/lib/tipjar.ts` (public RPC only).
- Contract + deploy: `contracts/` (`NETWORK=arc CONFIRM_MAINNET=1 ./deploy.sh`).
- Free helpers: `src/lib/tools/` (MCP). Paid work stays on HTTP routes.

## Don't

- Don't change `src/lib/networks.ts` without checking Circle Facilitator + USDC EIP-712 name.
- Don't mix Arc's 18-decimal native USDC with 6-decimal ERC-20 amounts.
- Don't expose `SELLER_PRIVATE_KEY` / `CIRCLE_API_KEY` / Foundry `PRIVATE_KEY` to the client or git.
- Don't deploy mainnet or submit grants without the builder's explicit approval.
- Don't invent personal handles, emails, or DoraHacks accounts.

## Checks

```sh
npm install && npm run wallet
npm run typecheck && npm run build
curl -i "http://localhost:3000/api/arc-status"   # expect 402 when configured
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
