# AGENTS.md - Working with create-sati-agent

This document captures patterns, expectations, and conventions learned from working with @tenequm (Misha) on create-sati-agent. Written for AI agents who need to understand the project's context and working style.

**Last updated:** 2026-02-14

---

## Project Context

### What This Is

**create-sati-agent** is a CLI tool for registering AI agent identities on Solana using the ERC-8004 standard. It's the onboarding layer for [SATI](https://sati.cascade.fyi) (Solana Attestation & Trust Infrastructure).

**Core value proposition:**
- Takes users from zero to registered agent in ~5 minutes
- Was 45+ minutes before (67% spent stuck on faucets)
- Three commands: `init` → `publish` → done

**What it creates:**
- Token-2022 NFT (agent identity on Solana)
- IPFS metadata (name, description, image, service endpoints)
- On-chain reputation hooks (via feedback attestations)

### Architecture Decisions

**Key choices made during refactor (Feb 13-14, 2026):**

1. **Removed AgentWallet support** - Was two competing paths (keypair vs AgentWallet), now one clear journey
2. **SDK types over custom schemas** - Deleted custom Zod validation in favor of importing `agent0-sdk` types directly (eliminates schema drift)
3. **Git submodule for best-practices** - Chose submodule over copy to stay synced with upstream ERC-8004 examples
4. **Integrated faucet** - Auto-funds devnet wallets (0.01 SOL), 5-minute rate limit for dev iteration
5. **Simplified command surface** - 6 commands total, no interactive prompts (agent-friendly CLI)

**Why these matter:**
- SDK drift was a real bug: custom schema diverged from ERC-8004 spec, caused silent data loss
- Faucet integration removed 67% of onboarding time (users were getting stuck on public faucets)
- Interactive prompts broke agent workflows (now flags-only for automation)

### Repository Structure

```
create-sati-agent/
├── src/
│   ├── commands/          # CLI command implementations
│   │   ├── init.ts        # Template creation
│   │   ├── publish.ts     # Agent registration + updates
│   │   ├── search.ts      # Agent discovery
│   │   ├── info.ts        # Agent details + reputation
│   │   ├── feedback.ts    # Submit attestations
│   │   └── transfer.ts    # Change ownership
│   ├── lib/
│   │   ├── keypair.ts     # Solana keypair management
│   │   ├── ipfs.ts        # IPFS upload via Pinata
│   │   └── sdk-validation.ts  # ERC-8004 validation (uses agent0-sdk types)
│   └── app.ts             # Entry point
├── docs/
│   └── best-practices/    # Git submodule → erc-8004-contracts
├── README.md              # User-facing docs
└── VERIFICATION-REPORT.md # Testing results
```

**Important:** `docs/best-practices/` is a git submodule pointing to `erc-8004-contracts` repo. Don't edit directly - changes go upstream.

---

## Code Standards & Conventions

### ERC-8004 Compliance (Critical)

**What ERC-8004 is:**
- Cross-chain agent identity standard
- SATI implements it on Solana
- Reference implementations: `erc-8004-contracts` (Ethereum), `agent0-sdk` (multi-chain)

**Rules:**
1. **Use SDK types, never create custom schemas**
   - ❌ Custom Zod schema mirroring SDK types → causes drift
   - ✅ Import types from `agent0-sdk` directly
   - **Why:** Schema drift caused real bug (custom schema didn't support new endpoint types)

2. **Never frame as "fixing" ERC-8004**
   - ❌ "SATI fixes the limitations of ERC-8004"
   - ✅ "SATI extends ERC-8004 with blind signatures and delegation"
   - **Why:** SATI is an *implementation*, not a competitor. Blind signatures are SATI's innovation, not something ERC-8004 "had and removed"

3. **Validate with canonical validator**
   ```typescript
   // ✅ Good - uses official validator
   import { validateERC8004RegistrationFile } from 'agent0-sdk';
   const result = validateERC8004RegistrationFile(data);
   
   // ❌ Bad - custom validation that can drift
   import { z } from 'zod';
   const MySchema = z.object({ name: z.string(), ... });
   ```

4. **Registration file format** (agent-registration.json)
   - `type`: Must be `"https://eips.ethereum.org/EIPS/eip-8004#registration-v1"`
   - `services` → `endpoints` with `type` field (SDK naming)
   - `supportedTrust` → `trustModels` (SDK naming)
   - Always include: `owners`, `operators`, `metadata`, `updatedAt`

**Real example of drift:**
- Custom schema used `services: [{name, endpoint, version}]`
- SDK expects `endpoints: [{type: EndpointType, value: string}]`
- Result: validation passed, but protocol rejected

### TypeScript Patterns

**Dependencies:**
- `@solana/web3.js` 1.98.4 (keypair generation, transactions)
- `@cascade-fyi/sati-sdk` (agent registration, feedback, reputation)
- `@cascade-fyi/agent0-sdk` (ERC-8004 types and validation)
- **NOT** `@solana/kit` - has unreliable keypair API

**Type safety lessons learned:**
```typescript
// ❌ Bad - @solana/kit has broken .privateKey property
import { generateKeyPair } from '@solana/kit';
const keypair = await generateKeyPair();
const secretKey = Array.from(keypair.privateKey); // privateKey is undefined!

// ✅ Good - @solana/web3.js has stable API
import { Keypair } from '@solana/web3.js';
const keypair = Keypair.generate();
const secretKey = Array.from(keypair.secretKey); // secretKey exists reliably
```

**Build requirements:**
- Must compile cleanly with no warnings
- Use Biome for linting/formatting
- tsdown for bundling

### Testing & Validation

**Three-level testing approach:**

1. **Build validation**
   ```bash
   pnpm build  # Must complete with no warnings
   ```

2. **Fresh user flow simulation**
   - Test as if you've never used Solana before
   - Actually run: `init` → `publish` → `info`
   - Check error messages are actionable
   - **Why:** Fresh user path is the critical path (most users won't have existing setup)

3. **Code review simulation**
   - Spawn subagent to act as "5 senior Solana developers"
   - Focus on: edge cases, race conditions, error handling
   - **Real bugs caught this way:** Zod v4 breaking change, faucet race condition, schema drift

**Real example from testing:**
```
Problem: After faucet funding, balance check randomly failed (~30%)
Root cause: Balance check happened BEFORE transaction confirmed
Fix: Added 3-second confirmation wait
```

**Testing workflow:**
```bash
# 1. Build
pnpm build

# 2. Fresh user flow
npx . init
npx . publish --network devnet
npx . info <MINT> --network devnet

# 3. Verify in explorer
# Check Solscan for agent mint, verify metadata IPFS hash
```

---

## Working with Misha (@tenequm)

### Communication Style

**Direct and precise:**
- "Stop being lazy" = you're making assumptions instead of testing
- "Weak phrasing" = tighten the language, remove corporate speak
- "Link is stupid" = feature doesn't add value, remove it

**What triggers corrections:**
1. Incomplete analysis (didn't test edge cases)
2. Generic advice without project-specific context
3. Overclaiming ("200x cheaper" without L2 comparison)
4. Assumptions instead of verification
5. Framing SATI as "fixing" ERC-8004

**What gets approval:**
1. Testing with real user flow
2. Concrete examples from actual code
3. Acknowledging tradeoffs honestly
4. Direct language, no marketing speak
5. Standards-compliant implementations

### Decision-Making Patterns

**How choices get made:**
1. **Research first** - spawn subagent for ecosystem analysis, cost evaluation, competitive research
2. **Validate assumptions** - actually test the thing, don't theorize
3. **Standards compliance** - ERC-8004 conformance, x402 integration specs
4. **User experience priority** - 45min → 5min is worth the integrated faucet
5. **Simplify ruthlessly** - removed AgentWallet support (was competing path)

**Real decision examples:**

| Decision | Options Considered | Choice Made | Reasoning |
|----------|-------------------|-------------|-----------|
| Best practices distribution | Copy vs git submodule | Git submodule | Stay synced with upstream ERC-8004 |
| Validation approach | Custom Zod vs SDK types | SDK types | Eliminate drift |
| Command surface | Interactive vs flags-only | Flags-only | Agent-friendly automation |
| Faucet integration | External vs integrated | Integrated | Removed 67% time friction |

### Red Flags (What NOT to Do)

**Code:**
- ❌ Creating custom schemas when SDK types exist
- ❌ Not testing fresh user flow
- ❌ Assuming edge cases work without verification
- ❌ Using unreliable dependencies (@solana/kit had broken keypair API)

**Communication:**
- ❌ "We should probably..." (test it, don't theorize)
- ❌ "This might work..." (make it work, then report)
- ❌ Framing as "fixing" or "correcting" ERC-8004
- ❌ Overclaiming without data ("200x cheaper")
- ❌ Corporate speak ("leverage", "utilize", "bottleneck")

**Content/Documentation:**
- ❌ Weak closing lines in tweets
- ❌ Unnecessary links that distract from message
- ❌ Leading with product pitch instead of pain
- ❌ Generic advice ("best practices") without specifics

### Values (What Matters)

**Security:**
- Blind signatures prevent cherry-picked reviews
- Hot/cold wallet delegation (operate with hot, identity stays cold)
- Audit readiness (code reviews, verification reports)

**Standards compliance:**
- ERC-8004 conformance (use SDK types, canonical validator)
- x402 integration specs
- Proper TypeScript types

**Clean code:**
- Delete duplicate code paths (removed AgentWallet)
- Remove dead code (deleted interactive prompts when they broke)
- Type safety (compiler catches breaking changes)

**User experience:**
- Actionable error messages ("Run: npx create-sati-agent init")
- Fast onboarding (45min → 5min)
- Clear documentation with real examples

**Intellectual honesty:**
- "Cost isn't the story" when cheaper claim was weak
- Never frame as "fixing" ERC-8004 (it extends it)
- Correct memory when wrong ("DO NOT INTEGRATE" was recommendation, not actual outcome)

---

## Common Workflows

### Git Workflow

**Branch naming:**
- `feat/simplify-onboarding` (feature branches)
- `docs/credit-scoring-provider` (documentation)

**Commit messages:**
- `feat: add endpoint validation, cost breakdown, and post-registration guidance`
- `fix: resolve 3 critical blockers from code reviews`
- `refactor: merge setup into init - single command for initialization`

**Pull requests:**
- PR #1: feat/simplify-onboarding → main
- Include verification report in PR description
- Test fresh user flow before requesting review

**Git submodules:**
```bash
# Initial setup
git submodule add https://github.com/erc-8004/erc-8004-contracts docs/best-practices

# Update to latest
git submodule update --remote docs/best-practices
```

### Testing Workflow

**Before submitting changes:**

1. **Build check**
   ```bash
   pnpm build
   # Must complete with no warnings
   ```

2. **Fresh user simulation**
   ```bash
   # Create new test wallet (or use existing)
   npx . init
   npx . publish --network devnet
   npx . info <MINT> --network devnet
   npx . search <NAME> --network devnet
   ```

3. **Code review simulation**
   - Spawn subagent as "5 senior Solana developers"
   - Focus on: edge cases, race conditions, error handling
   - Document findings in `VERIFICATION-REPORT.md`

4. **Verify in explorer**
   - Check Solscan for agent mint
   - Verify metadata IPFS hash resolves
   - Confirm transaction signatures

### Subagent Usage Patterns

**When to spawn subagents:**

1. **Research tasks**
   - Ecosystem analysis (ERC-8004 implementations, competitors)
   - Tweet research (high-performing patterns)
   - Cost architecture evaluation

2. **Testing as different personas**
   - "Fresh user who's never used Solana"
   - "5 senior Solana developers doing code review"
   - "Hackathon participant under time pressure"

3. **Content creation**
   - Tweet drafts with research (spawn with brand guidelines context)
   - Documentation writing (spawn with spec context)

**Example subagent spawns from this session:**
- Twitter content research → analyzed high-performing tweets from similar projects
- Hackathon testing → simulated fresh user flow, rated 8/10
- Code review → identified 3 critical blockers before merge

**What to provide subagents:**
- Full context (brand guidelines, specification, prior decisions)
- Specific deliverable (markdown report, test results, code review)
- Validation criteria (what "good" looks like)

### Debugging Common Issues

**Issue:** "Cannot read properties of undefined (reading 'privateKey')"
- **Cause:** Using `@solana/kit` generateKeyPair (broken API)
- **Fix:** Switch to `@solana/web3.js` Keypair.generate()

**Issue:** Validation passes but protocol rejects
- **Cause:** Schema drift between custom validation and SDK
- **Fix:** Delete custom schema, use `validateERC8004RegistrationFile` from agent0-sdk

**Issue:** Balance check fails after faucet funding
- **Cause:** Race condition - check happens before transaction confirms
- **Fix:** Add 3-second confirmation wait after funding

**Issue:** Services not displaying in agent info
- **Cause:** Custom schema doesn't support new endpoint types
- **Fix:** Use SDK types directly (RegistrationFile, EndpointType)

---

## Key Resources

### Related Repositories

**Primary:**
- `cascade-protocol/sati` - SATI core (Solana program, SDK, specification)
- `erc-8004/erc-8004-contracts` - ERC-8004 reference implementation (git submodule)
- `cascade-protocol/create-sati-agent` - This repo

**Ecosystem:**
- `x402-protocol/x402` - Agent payment protocol
- `8004-solana` (MonteCrypto) - Competitor ERC-8004 implementation (Metaplex Core, Supabase)

**Development:**
- Location: `~/pj/create-sati-agent/` (always clone to `~/pj/`)
- Main branch: `feat/simplify-onboarding` (PR #1)

### Endpoints & Services

**SATI Faucet:**
- Endpoint: `https://sati.cascade.fyi/api/faucet`
- Rate limit: 1 airdrop per 5 minutes (devnet only)
- Amount: 0.01 SOL per airdrop
- Used in: `publish` command (lazy funding, 0.007 SOL threshold)

**SATI Program:**
- Program ID: `satiRkxEiwZ51cv8PRu8UMzuaqeaNU9jABo6oAFMsLe`
- Networks: devnet, mainnet
- SDK: `@cascade-fyi/sati-sdk`

**ERC-8004 Validator:**
- Package: `@cascade-fyi/agent0-sdk`
- Function: `validateERC8004RegistrationFile(data)`
- Always use this, never create custom schemas

### Documentation Locations

**In this repo:**
- `README.md` - User-facing quick start
- `docs/best-practices/` - ERC-8004 examples (git submodule)
- `VERIFICATION-REPORT.md` - Testing results
- `CHANGELOG.md` - Version history

**External:**
- SATI specification: `~/pj/sati/docs/specification.md`
- Brand guidelines: `~/pj/internal/docs/brand-guidelines-cascade-sati/`
- ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004

**Memory files:**
- `~/.openclaw/workspace/memory/2026-02-14.md` - This refactor session
- `~/.openclaw/workspace/memory/sati-reference.md` - SATI ecosystem context

### Solana Network Details

**Devnet:**
- RPC: Helius (via SATI SDK)
- Faucet: Integrated (0.01 SOL, 5-min rate limit)
- Explorer: https://solscan.io/?cluster=devnet

**Mainnet:**
- RPC: Helius (via SATI SDK)
- Faucet: Manual (user sends ~0.01 SOL)
- Explorer: https://solscan.io/

**Keypair location:** `~/.config/solana/id.json` (auto-created)
- **Security note:** Not secure for mainnet production use
- Recommended: Transfer ownership to hardware wallet after registration

---

## Lessons Learned (Session-Specific)

### From Feb 13-14 Refactor

**What worked:**
- Integrated faucet removed massive friction (67% time savings)
- SDK types eliminated schema drift bugs
- Fresh user testing caught bugs docs missed
- Code review subagents found critical blockers

**What didn't work:**
- Custom Zod schemas (drifted from SDK)
- Interactive prompts (broke automation)
- @solana/kit dependency (broken keypair API)
- Assuming edge cases work without testing

**Key insight:**
> "Fresh user path is the critical path - most users won't have existing setup"

**Before fix:** 6/10 rating - broken for new users
**After fix:** 8/10 rating - "would hack with again"

### From Code Review Process

**Three critical blockers found by ALL reviewers:**
1. Zod v4 breaking change (validation crashed)
2. Schema drift (custom schema diverged from spec)
3. Faucet race condition (30% failure rate)

**Root cause pattern:** Maintaining duplicate implementations
- Custom schema + SDK schema = drift
- Custom validator + canonical validator = breaking changes missed

**Best practice:** Single source of truth
- Import SDK types, don't recreate them
- Use canonical validators, don't write custom ones
- Less code to maintain, fewer bugs

### From Integration Decisions

**Torch Market evaluation:**
- Red flags: 27-day-old GitHub, v1→v3 in 5 days, no Rust source
- Outcome: Door open, exploring further (not rejected outright)
- Lesson: Surface risks and ask questions, don't declare verdicts

**Blind signature mechanics:**
- This is SATI's innovation, not something ERC-8004 "removed"
- Agent signs `data_hash` BEFORE knowing feedback sentiment
- Prevents cherry-picking reviews and Sybil attacks

---

## Brand Voice (When Writing Content)

**Rules from observed corrections:**

1. **Lead with pain, not product**
   - ❌ "SATI closes that gap on Solana"
   - ✅ "If there's no way to see whether your service actually delivers and gets used consistently"

2. **Be direct, not corporate**
   - ❌ "Leverage," "utilize," "bottleneck"
   - ✅ "Use," "check," "problem"

3. **Under 280 characters for tweets**
   - Remove links if they don't add value
   - Tighten every phrase
   - Sometimes just stating the problem is enough

4. **Builder-to-builder tone**
   - Talk about mechanisms, not buzzwords
   - Show real examples, not placeholders
   - "I built" not "we solved"

5. **Never frame as "fixing" ERC-8004**
   - Always: "extends," "builds on," "complements"
   - SATI is an implementation with innovations, not a correction

**Example correction from session:**
```diff
- "If nobody can verify delivery, you're paying for promises, not proof"
+ "If there's no way to see whether your service actually delivers and 
   gets used consistently, you're paying for promises, not proof"
```

Reason: "Nobody can verify" is vague. "No way to see whether" is concrete and specific.

---

## Appendix: Session Timeline

**Feb 13-14, 2026 - Major Refactor Session**

**Day 1 (Feb 13):**
- Read SATI specification (1485 lines)
- Removed AgentWallet support (~250 lines)
- Added Zod validation (later replaced with SDK types)
- Added setup command (later merged into init)
- Improved error messages

**Day 2 (Feb 14, early):**
- Fixed critical keypair generation bug
- Improved UX (endpoint validation, cost breakdown)
- Removed interactive prompts (agent-friendly)
- Added verbose reputation mode

**Day 2 (Feb 14, late - ~10:00-14:00 UTC):**
- Code review revealed 3 critical blockers
- Fixed validation crash (Zod v4 breaking change)
- Fixed schema drift (deleted custom schema, use SDK types)
- Fixed faucet race condition (added confirmation wait)
- Hackathon testing: 8/10 rating

**PR Status:** feat/simplify-onboarding → Ready to merge
**Next:** Publish to npm (suggest v1.0.0 - major improvements + critical fixes)

---

**This document evolves.** Add patterns as you discover them. Focus on observed behavior, not generic advice.
