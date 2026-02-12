# Changelog

## [0.2.0] - 2026-02-12

### Changed
- Migrate from HTTP API to `@cascade-fyi/sati-agent0-sdk` for direct on-chain operations
- Migrate from npm to pnpm
- Rewrite README with 2-minute onboarding focus

### Added
- `transfer` command - transfer agent ownership to a new address
- Local Solana keypair support (`--keypair` flag, defaults to `~/.config/solana/id.json`)
- AgentWallet fallback for AI agents without local keys
- A2A endpoint support in `register` command (`--a2a-endpoint`)

### Removed
- HTTP API client (`SatiApiClient`) - all operations now go through the SDK directly
- `--payment-header` and `--owner` flags (signer is now the owner)

## [0.1.1] - 2026-02-12

### Fixed
- Fix `npx create-sati-agent` not working after install (bin entry stripped by npm)
- Migrate build from `tsc` to `tsdown` with proper `fixedExtension: false` for `.js` output

### Added
- Biome linter and formatter configuration
- `npm run check` (type-check + lint) and `npm run lint:fix` scripts

### Changed
- Build script now includes explicit clean step before bundling
- tsconfig.json simplified to type-check only (`noEmit: true`)

## [0.1.0] - 2026-02-12

### Added
- Initial release
- `register` command - register AI agent on-chain ($0.30 USDC via x402)
- `discover` command - search and list registered agents
- `info` command - get detailed agent information and reputation
- `feedback` command - give on-chain feedback on an agent (free)
- `reputation` command - get reputation summary for an agent
- Interactive mode with @clack/prompts for missing required fields
- JSON output mode (`--json` flag) for all commands
- Devnet and mainnet network support

[0.2.0]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cascade-protocol/create-sati-agent/releases/tag/v0.1.0
