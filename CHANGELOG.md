# Changelog

## [0.3.0] - 2026-02-14

### Security
- Keypairs created with mode `0o600` (owner-only read/write) — was `0o664`
- Existing keypair warning prevents accidental overwrites during init
- IPFS privacy warning before uploading permanent public data

### Added
- Context-aware `info` command — auto-discovers `agent-registration.json` without needing network/mint args
- Flexible agent ID formats — accepts both CAIP-2 (`solana:...:mint`) and mint-only
- Comprehensive `agent-registration.jsonc` template with 230+ lines of inline comments
- ERC-8004 compliance via best-practices git submodule at `docs/best-practices/`
- `--refund-sol` flag on `transfer` command — sends leftover SOL to secure wallet

### Changed
- Migrated to `@solana/kit` 5.x exclusively (removed all `web3.js` v1 legacy)
- Full type safety — eliminated all `any` types with proper interfaces in `src/lib/types.ts`
- SDK errors wrapped with friendly messages and recovery steps (no more stack traces)
- Clear update vs create distinction in publish output

### Fixed
- Undefined `registeredMint` variable in publish success message
- Missing `@solana-program/system` dependency causing fresh install crashes
- Invalid address error handling (friendly messages instead of SDK traces)

## [0.2.1] - 2026-02-12

### Fixed
- Publish command now supports multi-network registrations (devnet + mainnet coexist)
- New registrations append to the array instead of replacing existing ones
- Cross-network sync: updating on one network automatically syncs all other registered networks

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

[0.3.0]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cascade-protocol/create-sati-agent/releases/tag/v0.1.0
