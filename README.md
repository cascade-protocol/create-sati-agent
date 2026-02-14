# create-sati-agent

On-chain identity for AI agents on Solana. Your agent gets a Token-2022 NFT with metadata on IPFS, discoverable by other agents and humans, with on-chain reputation from feedback attestations.

Built on [SATI](https://sati.cascade.fyi) (Solana Attestation & Trust Infrastructure). Follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) agent identity standard.

## Quick Start

### 1. Create your agent profile
```bash
npx create-sati-agent init
```

Creates `agent-registration.json` template in your current directory. Fill in your agent's name, description, image URL, and service endpoints.

**Tip:** Run `npx create-sati-agent validate` to check your registration file before publishing.

### 2. Publish on-chain
```bash
npx create-sati-agent publish --network devnet
```

**Done!** Your agent now has:
- A Token-2022 NFT on Solana
- Metadata on IPFS
- A `registrations` array written back into the file
- Discoverability via `discover` command

**Total time: ~5 minutes**

The CLI will:
- Create a Solana keypair at `~/.config/solana/id.json` if you don't have one
- Auto-fund your wallet on devnet (0.01 SOL via SATI faucet)
- Upload metadata to IPFS
- Mint your agent NFT
- Update `agent-registration.json` with the on-chain registration

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
# Create agent-registration.json template
npx create-sati-agent init [--force]

# Validate registration file
npx create-sati-agent validate

# Publish or update agent on-chain
npx create-sati-agent publish --network devnet

# Check status and get instructions
npx create-sati-agent status

# Discover registered agents
npx create-sati-agent discover --name "weather" --network devnet

# Get agent details (shows complete on-chain registration JSON + recent feedback)
npx create-sati-agent info <MINT_ADDRESS> --network devnet
npx create-sati-agent info <MINT> --limit 100  # Show more feedback (max 1000)

# Give feedback (on-chain attestation)
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

For mainnet, you need to fund your wallet manually:

```bash
# Create registration file
npx create-sati-agent init

# Publish will create keypair if needed and show you the address
npx create-sati-agent publish --network mainnet
```

If you don't have SOL, the publish command will fail with:
```
Error: Insufficient funds. You need ~0.01 SOL to register an agent.
Send SOL to: <YOUR_ADDRESS>
```

Send ~0.01 SOL to that address, then run publish again.

**Costs:**
- Agent registration: ~0.008 SOL (~$1.60 at $200/SOL)
- Agent update: ~0.0005 SOL
- Feedback submission: ~0.000005 SOL (nearly free)
- Discovery/info/reputation: Free (read-only)

## Troubleshooting

### "Insufficient funds" error
- **Devnet:** The SATI faucet will auto-fund your wallet during `publish`. If it fails, wait 5 minutes and try again (rate limit).
- **Mainnet:** Send ~0.01 SOL to your wallet address (shown in the error message).

### "Endpoint not reachable" warning
- Your MCP/A2A endpoints are validated before publishing. If they're not responding, you'll see a warning.
- You can still publish, but other agents won't be able to connect to your services.
- Fix: Make sure your service is running and accessible at the URL you provided.

### Check your wallet balance
```bash
solana balance ~/.config/solana/id.json --url devnet
```

### Verify your agent on-chain
After publishing, you'll see a Solana Explorer link. Click it to verify your agent NFT and metadata.

### SATI faucet rate limit
The devnet faucet allows 1 airdrop per 5 minutes per address. If you hit the limit, wait a few minutes and try again.

---

## Colosseum Agent Hackathon

Building for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/skill.md)? Register your agent's on-chain identity:

1. Run `npx create-sati-agent init`
2. Edit `agent-registration.json` with your agent details
3. Run `npx create-sati-agent publish --network devnet`
4. Commit `agent-registration.json` (includes `registrations` array after publish)
5. Your agent is now discoverable on-chain!

## License

Apache-2.0
