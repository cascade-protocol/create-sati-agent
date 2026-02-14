# create-sati-agent

On-chain identity for AI agents on Solana. Token-2022 NFT + IPFS metadata + reputation system.

## Quick Start (Devnet)

```bash
npx create-sati-agent init     # creates agent-registration.json
npx create-sati-agent publish  # publishes to devnet (auto-funded)
```

**Done.** Your agent has:
- Token-2022 NFT on Solana
- Metadata on IPFS (name, description, image, endpoints)
- On-chain reputation (via feedback attestations)
- Discoverability (`search` command, SATI registry)

## agent-registration.json

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "MyAgent",
  "description": "Does X for Y",
  "image": "https://example.com/avatar.png",
  "properties": {
    "files": [{"uri": "https://example.com/avatar.png", "type": "image/png"}],
    "category": "image"
  },
  "services": [
    {"name": "MCP", "endpoint": "https://myagent.com/mcp", "version": "2025-06-18"},
    {"name": "A2A", "endpoint": "https://myagent.com/.well-known/agent-card.json", "version": "0.3.0"}
  ],
  "supportedTrust": ["reputation"],
  "active": false,
  "x402Support": false,
  "registrations": []
}
```

**Supported services:** `MCP`, `A2A`, `OASF`, `ENS`, `DID`, `agentWallet`

**Service-specific fields:**
- `MCP`: `mcpTools: []` - list of MCP tools
- `A2A`: `a2aSkills: []` - list of A2A skills (slash-separated taxonomy)
- `OASF`: `skills: []`, `domains: []` - standardized capability taxonomies

See [docs/best-practices/](docs/best-practices/) for comprehensive guides.

## Mainnet Deployment

**Security:** The CLI creates a wallet at `~/.config/solana/id.json` for convenience. This is **not secure** for mainnet. Follow this 3-step flow:

### Step 1: Practice on Devnet (optional but recommended)

```bash
npx create-sati-agent init
npx create-sati-agent publish --network devnet  # auto-funded
npx create-sati-agent info <MINT> --network devnet
```

### Step 2: Publish on Mainnet

```bash
npx create-sati-agent publish --network mainnet
# ❌ Error: Insufficient funds. Send ~0.01 SOL to: BrcYS3e3Ld51Sg3YswREtXMtN1pUJzNf1XGUNXsAMNxG
```

Send ~0.01 SOL to that address, then:

```bash
npx create-sati-agent publish --network mainnet
# ✅ Agent registered: 2LETZxjxSpEZzHM42Fp6RYrcuxtjLytdVUSgGVAbVrqi
```

### Step 3: Transfer to Secure Wallet

```bash
# Transfer ownership + refund leftover SOL to your secure wallet
npx create-sati-agent transfer <MINT> \
  --new-owner <YOUR_SECURE_WALLET> \
  --refund-sol \
  --network mainnet

# Sends remaining SOL (~0.002) to your secure wallet
# Temp wallet becomes empty
```

**Done.** Your agent is now owned by your secure wallet (hardware wallet, multisig, etc.).

**Costs:**
- Registration: ~0.008 SOL
- Transfer: ~0.0005 SOL
- Total: ~0.0085 SOL (~$1.70 at $200/SOL)

## Commands

```bash
init                    # create template
publish                 # publish or update agent
search                  # find agents by name
info [MINT]             # show agent details + feedback (auto-discovers from agent-registration.json)
give-feedback           # submit on-chain attestation
transfer <MINT>         # change ownership
```

All commands support `--help` for details, `--json` for parseable output, `--network devnet|mainnet`.

**Context-aware commands:**
- `info` - When run in a directory with `agent-registration.json`, automatically shows all registered agents (devnet + mainnet)
- `info --network devnet` - Filter to specific network
- `info <MINT> --network devnet` - Query any agent by mint address

## Feedback Tags

```bash
--tag1 starred --value 85       # rating (0-100)
--tag1 reachable --value 1      # health check (0 or 1)
--tag1 uptime --value 99        # uptime % (0-100)
--tag1 responseTime --value 150 # latency (ms)
--tag1 successRate --value 98   # success % (0-100)
```

## Devnet Faucet

Auto-funds wallets on devnet (0.01 SOL). Rate limit: 1 airdrop per 5 minutes.

## Built On

- [SATI](https://sati.cascade.fyi) - Solana Attestation & Trust Infrastructure
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard

## License

Apache-2.0
