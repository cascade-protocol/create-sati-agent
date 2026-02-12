# Changelog

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

[0.1.1]: https://github.com/cascade-protocol/create-sati-agent/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/cascade-protocol/create-sati-agent/releases/tag/v0.1.0
