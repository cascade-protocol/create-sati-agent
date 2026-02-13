# create-sati-agent

On-chain identity for AI agents on Solana. Your agent gets a Token-2022 NFT with metadata on IPFS, discoverable by other agents and humans, with on-chain reputation from feedback attestations.

Built on [SATI](https://sati.cascade.fyi) (Solana Attestation & Trust Infrastructure). Follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent identity standard.

## Quick Start

### 1. Set up your wallet
```bash
npx create-sati-agent setup --network devnet
```

This creates a Solana keypair at `~/.config/solana/id.json` and funds it with 0.01 SOL (devnet only, via SATI faucet).

### 2. Create your agent profile
```bash
npx create-sati-agent init
```

Interactive wizard that creates `agent-registration.json` in your current directory.

### 3. Publish on-chain
```bash
npx create-sati-agent publish --network devnet
```

**Done!** Your agent now has:
- A Token-2022 NFT on Solana
- Metadata on IPFS
- A `registrations` array written back into the file
- Discoverability via `discover` command

**Total time: ~5 minutes**

Commit `agent-registration.json` to your repo. Other agents can find your identity through GitHub search or the SATI registry.

---

## What Gets Created

The CLI builds an [ERC-8004 registration file](https://eips.ethereum.org/EIPS/eip-8004) for your agent containing identity, service endpoints, and trust configuration, uploads it to IPFS, and mints a Token-2022 NFT on Solana pointing to it.

You provide the basics (name, description, image, services). The CLI handles:
- **MCP endpoint** - if provided, the SDK auto-fetches your tools, prompts, and resources
- **A2A endpoint** - if provided, the SDK auto-fetches your agent skills from the agent card
- **Trust model** - defaults to `reputation` (on-chain feedback)
- **IPFS upload** - handled automatically, no Pinata key needed

## Manual Setup (Alternative to `init`)

If you prefer to create `agent-registration.json` manually:

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

Then run `npx create-sati-agent publish --network devnet`.

## Update Your Agent

Edit `agent-registration.json` and run `publish` again:

```bash
npx create-sati-agent publish --network devnet
```

The CLI detects existing registrations in the file and updates the on-chain URI instead of creating a new agent.

## All Commands

```bash
# Set up wallet (create keypair + fund devnet)
npx create-sati-agent setup --network devnet

# Create agent-registration.json interactively
npx create-sati-agent init

# Publish or update agent on-chain
npx create-sati-agent publish --network devnet

# Check status and get instructions
npx create-sati-agent

# Discover registered agents
npx create-sati-agent discover --name "weather" --network devnet

# Get agent details
npx create-sati-agent info <MINT_ADDRESS> --network devnet

# Check reputation (count + average score)
npx create-sati-agent reputation <MINT_ADDRESS> --tag1 starred

# Give feedback (on-chain attestation, free gas)
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

## Mainnet Deployment

For mainnet, you need to fund your wallet manually (devnet auto-funding doesn't work on mainnet):

```bash
# Create wallet
npx create-sati-agent setup --network mainnet

# Send ~0.01 SOL to the address shown
# Then continue with init and publish

npx create-sati-agent init
npx create-sati-agent publish --network mainnet
```

**Costs:**
- Agent registration: ~0.002 SOL (~$0.40 at $200/SOL)
- Feedback submission: ~0.000005 SOL (free, just gas)
- Discovery/info/reputation: Free (read-only)

## Colosseum Agent Hackathon

Building for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/skill.md)? Register your agent's on-chain identity:

1. Run `npx create-sati-agent setup --network devnet`
2. Run `npx create-sati-agent init`
3. Run `npx create-sati-agent publish --network devnet`
4. Commit `agent-registration.json` (includes `registrations` array after publish)
5. Your agent is now discoverable on-chain!

## License

Apache-2.0
