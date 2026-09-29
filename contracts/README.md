# UsdcTipJar (Arc)

From [earnkitai/chain-kits `arc/example`](https://github.com/earnkitai/chain-kits/tree/main/arc/example).

```sh
cp .env.example .env   # set PRIVATE_KEY
./deploy.sh            # Arc testnet
NETWORK=arc CONFIRM_MAINNET=1 ./deploy.sh   # Arc mainnet (real USDC)
```

Needs Foundry. Gas is native USDC (18 decimals); the contract tips via ERC-20 USDC (6 decimals) at `0x3600…0000`.
