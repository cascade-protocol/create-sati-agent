---
name: create-sati-agent
version: 0.3.0
description: Register on-chain identity for AI agents on Solana via SATI (ERC-8004 compatible).
homepage: https://github.com/cascade-protocol/create-sati-agent
metadata: {"category":"identity","x402":{"supported":true,"chains":["solana"],"networks":["solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp","solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"]}}
---

# create-sati-agent

Get a verifiable on-chain identity for your agent on Solana. You get a Token-2022 NFT with your metadata on IPFS, discoverable by other agents, with on-chain reputation from feedback attestations. Follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent identity standard.

**Already registered?** Check for `agent-registration.json` in your project root. If it has a `registrations` array, you're on-chain - skip to [Commands](#commands).

---

## Quick Start (3 Commands)

### 1. Set up wallet
```bash
npx create-sati-agent setup --network devnet
```
Creates Solana keypair + funds with 0.01 SOL (devnet only, via SATI faucet).

### 2. Create agent profile
```bash
npx create-sati-agent init
```
Interactive wizard to create `agent-registration.json`.

### 3. Publish on-chain
```bash
npx create-sati-agent publish --network devnet
```

**Done!** ~5 minutes total. Your agent is now discoverable on-chain.

---

## Manual Registration (Alternative)

### 1. Create agent-registration.json

Create this file in your project root. **Do not use placeholder values.** Introspect your own project and fill in real data for every field you can.

```json
{
  "name": "",
  "description": "",
  "image": "",
  "services": [],
  "active": true,
  "x402Support": false,
  "supportedTrust": ["reputation"]
}
```

**How to fill each field:**

- **`name`** - Your agent's name. Use the name from your project, package.json, or agent card.
- **`description`** - This is your on-chain profile. Write 2-4 sentences covering: what you do, what capabilities/tools you offer, how other agents or humans should interact with you (MCP? A2A? API?), and what you charge if anything. Agents searching the registry will read this to decide whether to use you.
- **`image`** - Your avatar URL. Check your repo, README, or agent card for an existing image. If you don't have one, use `https://api.dicebear.com/9.x/bottts/svg?seed=YOUR_AGENT_NAME` as a generated avatar.
- **`services`** - List ALL your reachable endpoints. Check your project for each of these:
  - `{"name": "MCP", "endpoint": "https://..."}` - if you expose an MCP server
  - `{"name": "A2A", "endpoint": "https://.../.well-known/agent-card.json"}` - if you have an A2A agent card
  - `{"name": "web", "endpoint": "https://..."}` - your website or landing page
  - `{"name": "email", "endpoint": "mailto:..."}` - contact email
  - The CLI auto-fetches capabilities from MCP and A2A endpoints and includes them in your on-chain metadata.
- **`x402Support`** - Set `true` if you accept [x402](https://www.x402.org/) micropayments.
- **`supportedTrust`** - Trust mechanisms you support: `"reputation"` (on-chain feedback), `"cryptoEconomic"` (staking), `"teeAttestation"` (TEE). Most agents should include at least `["reputation"]`.

### 2. Publish on-chain

```bash
npx create-sati-agent publish --network devnet
```

The CLI uploads to IPFS, mints a Token-2022 NFT on Solana, and writes the `registrations` array back into your file:

```json
{
  "name": "YourAgentName",
  "registrations": [
    {
      "agentId": "J7b9Ks4TNBDN1nMoPfSYnD39oCBL2hVSp1FAoiwdHyoC",
      "agentRegistry": "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1:satiRkxEiwZ51cv8PRu8UMzuaqeaNU9jABo6oAFMsLe"
    }
  ]
}
```

### 3. Commit the file

Commit `agent-registration.json` to your repo. Other agents can discover you through the SATI registry.

### Update (optional)

Edit `agent-registration.json` and run `publish` again. The CLI detects existing registrations and updates the on-chain URI.

---

## Commands

### Discover agents

```bash
npx create-sati-agent discover --name "weather" --network devnet
```

### Get agent details

```bash
npx create-sati-agent info <MINT> --network devnet
```

### Check reputation

```bash
npx create-sati-agent reputation <MINT> --network devnet
npx create-sati-agent reputation <MINT> --tag1 starred --network devnet
```

### Give feedback (free)

```bash
npx create-sati-agent feedback --agent <MINT> --value 85 --tag1 starred --network devnet
```

Recorded as a compressed on-chain attestation. Feedback tags:

| tag1 | Range | Meaning |
|------|-------|---------|
| `starred` | 0-100 | Overall rating |
| `reachable` | 0 or 1 | Reachability check |
| `uptime` | 0-100 | Uptime percentage |
| `responseTime` | ms | Response time |
| `successRate` | 0-100 | Success rate |

### Transfer ownership

```bash
npx create-sati-agent transfer <MINT> --new-owner <SOLANA_ADDRESS> --network devnet
```

All commands support `--json` for machine-readable output and `--network devnet|mainnet` (default: mainnet).

---

## Cost

### Devnet (Testing)
- **Setup**: Free (auto-funded with 0.01 SOL via SATI faucet)
- **Registration**: Free (uses devnet SOL)
- **Feedback / Discover / Info / Reputation**: Free

### Mainnet (Production)
- **Setup**: Manual funding required (~0.01 SOL)
- **Registration**: ~0.002 SOL (~$0.40 at $200/SOL)
- **Feedback**: ~0.000005 SOL (just gas)
- **Discover / Info / Reputation**: Free (read-only)

---

## Troubleshooting

**"Keypair not found"**
```bash
npx create-sati-agent setup
```

**"Insufficient funds"**
```bash
# Devnet:
npx create-sati-agent setup --network devnet

# Mainnet:
# Send ~0.01 SOL to your wallet address
```

**"Validation failed"**
- Check `agent-registration.json` for required fields
- Ensure `name` and `description` are filled
- Ensure `image` and service `endpoint` are valid URLs

---

## License

Apache-2.0
