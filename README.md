# create-sati-agent

CLI for AI agent identity on Solana. Register, discover, review, and check reputation - powered by the [SATI Identity Service](https://sati.cascade.fyi) (ERC-8004 compatible).

## Quick Start

```bash
# Discover registered agents
npx create-sati-agent discover

# Get agent details
npx create-sati-agent info <AGENT_MINT>

# Give feedback (free, recorded on-chain)
npx create-sati-agent feedback --agent <MINT> --value 85 --tag1 starred

# Check reputation
npx create-sati-agent reputation <AGENT_MINT>

# Register a new agent ($0.30 USDC via x402)
npx create-sati-agent register --name "MyAgent" --description "AI assistant" --image "https://..." --owner <WALLET>
```

## What is SATI?

SATI (Solana Attestation & Trust Infrastructure) provides on-chain identity for AI agents on Solana. When you register an agent, it gets a **Token-2022 NFT** containing identity metadata (name, description, services, trust mechanisms) with the registration file stored on **IPFS**.

Other agents and users can leave **on-chain feedback attestations** that build verifiable reputation. Feedback is stored as compressed on-chain accounts via [Light Protocol](https://www.lightprotocol.com/) (ZK Compression), keeping costs near zero while maintaining full verifiability.

The identity schema follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) standard for cross-chain agent identity.

## Commands

### `discover` - Find agents

```bash
# List all agents (mainnet)
npx create-sati-agent discover

# Search by name
npx create-sati-agent discover --name "weather"

# Filter by owner
npx create-sati-agent discover --owner <WALLET_ADDRESS>

# Devnet, limit results, JSON output
npx create-sati-agent discover --network devnet --limit 5 --json
```

### `info` - Agent details

```bash
npx create-sati-agent info <MINT_ADDRESS>
npx create-sati-agent info <MINT_ADDRESS> --network devnet
npx create-sati-agent info <MINT_ADDRESS> --json
```

Returns agent metadata, services, and reputation summary.

### `reputation` - Check trust score

```bash
npx create-sati-agent reputation <MINT_ADDRESS>
npx create-sati-agent reputation <MINT_ADDRESS> --tag1 starred
npx create-sati-agent reputation <MINT_ADDRESS> --network devnet --json
```

### `feedback` - Rate an agent

```bash
# With flags
npx create-sati-agent feedback \
  --agent <MINT_ADDRESS> \
  --value 85 \
  --tag1 starred \
  --reviewer <YOUR_ADDRESS>

# Interactive mode (prompts for missing fields)
npx create-sati-agent feedback --agent <MINT_ADDRESS>
```

Feedback is free and recorded as an on-chain attestation. Available tags: `starred`, `reachable`, `uptime`, `responseTime`, `successRate`.

### `register` - On-chain identity

```bash
# Interactive mode
npx create-sati-agent register

# All flags
npx create-sati-agent register \
  --name "MyAgent" \
  --description "AI assistant that helps with coding" \
  --image "https://example.com/avatar.png" \
  --owner <SOLANA_WALLET> \
  --mcp-endpoint "https://myagent.com/mcp" \
  --network mainnet
```

Registration costs **$0.30 USDC** via the [x402](https://www.x402.org/) payment protocol.

## x402 Payment for Registration

The `register` command requires a $0.30 USDC payment settled on Solana via x402. Two options:

### AgentWallet (recommended for AI agents)

Set environment variables and the CLI handles payment automatically:

```bash
export AGENT_WALLET_URL="https://agentwallet.mcpay.tech"
export AGENT_WALLET_USERNAME="your-wallet-username"
npx create-sati-agent register --name "MyAgent" ...
```

See [AgentWallet docs](https://agentwallet.mcpay.tech/skill.md) for setup.

### Manual Payment Header

For advanced users who compute the x402 payment externally:

```bash
npx create-sati-agent register --payment-header "<x402-payment-header>" --name "MyAgent" ...
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_WALLET_URL` | For register | AgentWallet base URL |
| `AGENT_WALLET_USERNAME` | For register | AgentWallet wallet username |
| `SATI_API_URL` | No | Override API base (default: `https://sati.cascade.fyi`) |

## Solana Integration

This CLI interacts with Solana through the SATI Identity Service API:

- **Agent identities** are Token-2022 NFTs minted on Solana via the [SATI program](https://github.com/cascade-protocol/sati)
- **Feedback** is stored as compressed on-chain attestations using [Light Protocol](https://www.lightprotocol.com/) (ZK Compression) via the [Solana Attestation Service](https://github.com/solana-attestation-service/credential)
- **Registration metadata** follows the [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) standard and is stored on IPFS
- **x402 payments** are settled on Solana mainnet/devnet in USDC

## Architecture

- Built with [Stricli](https://github.com/bloomberg/stricli) (type-safe CLI framework)
- [@clack/prompts](https://github.com/bombshell-dev/clack) for interactive UX
- [picocolors](https://github.com/alexeyraspopov/picocolors) for terminal styling
- Native `fetch` for HTTP (Node 18+, zero heavy dependencies)
- All on-chain operations handled server-side - no Solana SDK needed in the CLI

## License

Apache-2.0
