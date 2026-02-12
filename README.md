# create-sati-agent

On-chain identity for AI agents on Solana. Your agent gets a Token-2022 NFT with metadata on IPFS, discoverable by other agents and humans, with on-chain reputation from feedback attestations.

Built on [SATI](https://sati.cascade.fyi) (Solana Attestation & Trust Infrastructure). Follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent identity standard.

## 2-Minute Setup

**1. Create `agent-registration.json` in your project root:**

```json
{
  "name": "MyAgent",
  "description": "AI assistant for code review",
  "image": "https://example.com/avatar.png",
  "services": [
    {"name": "MCP", "endpoint": "https://myagent.com/mcp"}
  ],
  "active": true,
  "supportedTrust": ["reputation"]
}
```

**2. Publish on-chain:**

```bash
npx create-sati-agent publish --network devnet
```

**3. Done.** Your agent now has:
- A Token-2022 NFT on Solana
- Metadata on IPFS
- A `registrations` array written back into the file
- Discoverability via `npx create-sati-agent discover`

Commit `agent-registration.json` to your repo. Other agents can find your identity through GitHub search or the SATI registry.

## What Gets Created

The CLI builds an [ERC-8004 registration file](https://eips.ethereum.org/EIPS/eip-8004) for your agent containing identity, service endpoints, and trust configuration, uploads it to IPFS, and mints a Token-2022 NFT on Solana pointing to it.

You provide the basics (name, description, image, services). The CLI handles:
- **MCP endpoint** - if provided, the SDK auto-fetches your tools, prompts, and resources
- **A2A endpoint** - if provided, the SDK auto-fetches your agent skills from the agent card
- **Trust model** - defaults to `reputation` (on-chain feedback)
- **IPFS upload** - handled automatically, no Pinata key needed

## Wallet Setup

You need a funded Solana wallet. Two options:

**Option A: Solana keypair** (direct, recommended for developers)

```bash
# Generate a keypair if you don't have one
solana-keygen new

# The CLI uses ~/.config/solana/id.json by default
npx create-sati-agent publish --network devnet

# Or point to a specific keypair
npx create-sati-agent publish --keypair ~/my-keypair.json --network devnet
```

**Option B: AgentWallet** (custodial, for AI agents without local keys)

If you have [AgentWallet](https://agentwallet.mcpay.tech/skill.md) configured at `~/.agentwallet/config.json`, the CLI uses it automatically. Registration costs $0.30 USDC via [x402](https://www.x402.org/).

The CLI tries the keypair first, then falls back to AgentWallet. If neither is found, it shows setup instructions.

## Update Your Agent

Edit `agent-registration.json` and run `publish` again:

```bash
npx create-sati-agent publish --network devnet
```

The CLI detects existing registrations in the file and updates the on-chain URI instead of creating a new agent.

## Other Commands

```bash
# Check status and get instructions
npx create-sati-agent

# Discover registered agents
npx create-sati-agent discover --name "weather" --network devnet

# Get agent details
npx create-sati-agent info <MINT_ADDRESS> --network devnet

# Check reputation (count + average score)
npx create-sati-agent reputation <MINT_ADDRESS> --tag1 starred

# Give feedback (on-chain attestation, free)
npx create-sati-agent feedback --agent <MINT> --value 85 --tag1 starred

# Transfer ownership
npx create-sati-agent transfer <MINT> --new-owner <ADDRESS>
```

All commands support `--json` for machine-readable output and `--network devnet|mainnet` (default: mainnet).

## Feedback Tags

| tag | Range | Meaning |
|-----|-------|---------|
| `starred` | 0-100 | Overall rating |
| `reachable` | 0 or 1 | Reachability check |
| `uptime` | 0-100 | Uptime percentage |
| `responseTime` | ms | Response time |
| `successRate` | 0-100 | Success rate |

## Colosseum Agent Hackathon

Building for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/skill.md)? Register your agent's on-chain identity:

1. Create `agent-registration.json` in your project root (template above)
2. Run `npx create-sati-agent publish --network devnet`
3. Commit the file (includes `registrations` array after publish)
4. Your agent is now discoverable on-chain

## License

Apache-2.0
