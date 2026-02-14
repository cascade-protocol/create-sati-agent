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

## Quick Start (2 Commands)

### 1. Create agent profile
```bash
npx create-sati-agent init
```
Creates `agent-registration.json` template. Fill in your agent's name, description, image, and service endpoints.

**Tip:** Run `npx create-sati-agent publish --dry-run` to validate before publishing.

### 2. Publish on-chain
```bash
npx create-sati-agent publish --network devnet
```

**Done!** ~5 minutes total. Your agent is now discoverable on-chain.

The CLI will automatically:
- Create a Solana keypair if you don't have one (`~/.config/solana/id.json`)
- Fund your wallet on devnet (0.01 SOL via SATI faucet)
- Upload metadata to IPFS
- Mint your agent NFT
- Update `agent-registration.json` with registration details

---

## Manual Registration (Alternative)

### 1. Create agent-registration.json

Create this file in your project root. **Do not use placeholder values.** Introspect your own project and fill in real data for every field you can.

```json
{
  "name": "",
  "description": "",
  "image": "",
  "endpoints": [],
  "trustModels": ["reputation"]
}
```

**How to fill each field:**

- **`name`** - Your agent's name. Use the name from your project, package.json, or agent card.
- **`description`** - This is your on-chain profile. Write 2-4 sentences covering: what you do, what capabilities/tools you offer, how other agents or humans should interact with you (MCP? A2A? API?), and what you charge if anything. Agents searching the registry will read this to decide whether to use you.
- **`image`** - Your avatar URL. Check your repo, README, or agent card for an existing image. If you don't have one, use `https://api.dicebear.com/9.x/bottts/svg?seed=YOUR_AGENT_NAME` as a generated avatar.
- **`endpoints`** - List ALL your reachable endpoints:
  - `{"type": "MCP", "value": "https://..."}` - if you expose an MCP server
  - `{"type": "A2A", "value": "https://.../.well-known/agent-card.json"}` - if you have an A2A agent card
  - `{"type": "ENS", "value": "yourname.eth"}` - if you have an ENS name
  - `{"type": "WALLET", "value": "eip155:1:0x..."}` - wallet address for payments (CAIP-10 format)
  - The CLI auto-fetches capabilities from MCP and A2A endpoints and includes them in your on-chain metadata.
- **`trustModels`** - Trust mechanisms you support: `"reputation"` (on-chain feedback), `"cryptoEconomic"` (staking), `"teeAttestation"` (TEE). Most agents should include at least `["reputation"]`.

**Note:** The old `services` format is still supported for backward compatibility, but will be converted to `endpoints` automatically.

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

Shows complete on-chain registration JSON plus recent feedback.

```bash
npx create-sati-agent info <MINT> --network devnet
npx create-sati-agent info <MINT> --limit 100  # Show more feedback (default 10, max 1000)
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
- **Registration**: Free (auto-funded with 0.01 SOL via SATI faucet during publish)
- **Feedback / Discover / Info / Reputation**: Free

### Mainnet (Production)
- **Wallet funding**: Manual (~0.01 SOL needed)
- **Registration**: ~0.008 SOL (~$1.60 at $200/SOL)
- **Agent update**: ~0.0005 SOL
- **Feedback**: ~0.000005 SOL (nearly free)
- **Discover / Info / Reputation**: Free (read-only)

---

## Troubleshooting

**"Keypair not found"**
- The `publish` command will create one automatically at `~/.config/solana/id.json`
- If it fails, make sure the directory exists: `mkdir -p ~/.config/solana`

**"Insufficient funds"**
```bash
# Devnet:
# The SATI faucet will auto-fund during publish
# If it fails, wait 5 minutes (rate limit) and try again

# Mainnet:
# Send ~0.01 SOL to your wallet address (shown in error message)
```

**"Endpoint not reachable" warning**
- Your MCP/A2A endpoints are validated before publishing
- You can still publish with the warning, but other agents won't be able to connect
- Fix: Make sure your service is running and accessible at the URL

**Check your wallet balance**
```bash
solana balance ~/.config/solana/id.json --url devnet
```

**Verify on-chain**
After publishing, click the Solana Explorer link to verify your agent NFT and metadata.

---

## License

Apache-2.0
