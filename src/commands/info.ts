import { buildCommand } from "@stricli/core";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";
import { findRegistrationFile, readRegistrationFile } from "../lib/config.js";
import type { RegistrationFile } from "../lib/types.js";

interface InfoFlags {
  network?: "devnet" | "mainnet";
  json?: boolean;
  limit?: number;
}

export const infoCommand = buildCommand({
  docs: {
    brief: "Get detailed agent information with feedback (reads from agent-registration.json if no mint provided)",
  },
  parameters: {
    flags: {
      network: {
        kind: "enum",
        values: ["devnet", "mainnet"],
        brief: "Solana network (optional when using registration file)",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output raw JSON",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: Number,
        brief: "Number of feedback entries to show (default 10, max 1000)",
        optional: true,
      },
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Agent mint address (optional if agent-registration.json exists)",
          parse: String,
          placeholder: "mint",
          optional: true,
        },
      ],
    },
  },
  async func(this: void, flags: InfoFlags, mint?: string) {
    const limit = Math.min(Math.max(flags.limit ?? 10, 0), 1000);

    // Mode 1: Explicit mint provided - use that directly
    if (mint) {
      if (!flags.network) {
        console.error(pc.red("Error: --network flag required when specifying a mint address"));
        console.log();
        console.log("Usage:");
        console.log(pc.cyan("  npx create-sati-agent info <mint> --network devnet"));
        process.exit(1);
      }

      // Support both full CAIP-2 format (solana:....:mint) and just the mint address
      let mintAddress = mint;
      if (mint.includes(":")) {
        // Extract mint from full CAIP-2 format
        const parts = mint.split(":");
        mintAddress = parts[parts.length - 1];
        if (!flags.network) {
          console.log(pc.dim("ℹ  Detected full agent ID format, extracting mint address"));
        }
      }

      // Validate mint address format (Solana addresses are 32-44 base58 characters)
      if (mintAddress.length < 32 || mintAddress.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(mintAddress)) {
        console.error(pc.red("Error: Invalid Solana address format"));
        console.log();
        console.log(pc.dim("Solana addresses are 32-44 characters using base58 encoding"));
        console.log(pc.dim("Valid characters: 1-9, A-Z, a-z (excluding 0, O, I, l)"));
        console.log();
        console.log("Examples:");
        console.log(pc.cyan("  npx create-sati-agent info AK2iXnJR... --network devnet"));
        console.log(
          pc.cyan("  npx create-sati-agent info solana:EtWT...:AK2iXnJR... --network devnet") +
            pc.dim(" (full format)"),
        );
        process.exit(1);
      }

      const sdk = createSdk(flags.network);
      const chain = SOLANA_CAIP2_CHAINS[flags.network];

      let agentId: string;
      try {
        agentId = formatSatiAgentId(mintAddress, chain);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.toLowerCase().includes("base58") || errorMsg.toLowerCase().includes("address")) {
          console.error(pc.red("Error: Invalid Solana address format"));
          console.log();
          console.log(pc.dim(`Address provided: ${mintAddress} (${mintAddress.length} characters)`));
          console.log(pc.dim("Expected: 32-44 base58 characters"));
          console.log();
          process.exit(1);
        }
        throw error;
      }

      if (flags.json) {
        try {
          const agent = await sdk.getAgent(agentId);
          let feedbacks: unknown[] = [];
          try {
            feedbacks = await sdk.searchFeedback({ agentId }, { includeTxHash: false });
            feedbacks = feedbacks.slice(0, limit);
          } catch {
            // Feedback query failure is non-fatal
          }
          console.log(JSON.stringify({ agent, feedbacks }, null, 2));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (errorMsg.toLowerCase().includes("base58") || errorMsg.toLowerCase().includes("address")) {
            console.error(
              JSON.stringify(
                {
                  error: "Invalid Solana address format",
                  address: mintAddress,
                  length: mintAddress.length,
                  expected: "32-44 base58 characters",
                },
                null,
                2,
              ),
            );
            process.exit(1);
          }
          throw error;
        }
        return;
      }

      intro(pc.cyan("SATI - Agent Info"));

      const s = spinner();
      s.start("Loading agent...");

      try {
        const agent = await sdk.getAgent(agentId);

        if (!agent) {
          s.stop(pc.red("Agent not found"));
          return;
        }

        s.stop("Agent loaded");
        console.log();
        console.log(pc.bold("Complete On-Chain Registration:"));
        console.log();
        console.log(JSON.stringify(agent, null, 2));
        console.log();

        // Fetch feedback
        s.start(`Fetching feedback (limit ${limit})...`);
        try {
          const feedbacks = await sdk.searchFeedback({ agentId }, { includeTxHash: false });
          const limited = feedbacks.slice(0, limit);
          s.stop(`Feedback loaded (${limited.length} entries)`);

          if (limited.length > 0) {
            console.log(pc.bold("Recent Feedback:"));
            console.log();
            console.log(JSON.stringify(limited, null, 2));
            console.log();
          } else {
            console.log(pc.dim("No feedback yet"));
            console.log();
          }
        } catch (_error) {
          s.stop(pc.yellow("Feedback unavailable"));
          console.log(pc.dim("(Feedback query failed - schema may not be deployed on this network)"));
          console.log();
        }

        outro(pc.dim(`Network: ${flags.network}`));
      } catch (error) {
        s.stop(pc.red("Failed"));

        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.toLowerCase().includes("base58") || errorMsg.toLowerCase().includes("address")) {
          console.log();
          log.error("Invalid Solana address format");
          console.log();
          console.log(pc.dim(`Address provided: ${mintAddress} (${mintAddress.length} characters)`));
          console.log(pc.dim("Expected: 32-44 base58 characters"));
          console.log();
          process.exit(1);
        }

        throw error;
      }
      return;
    }

    // Mode 2: No mint provided - load from agent-registration.json
    const filePath = findRegistrationFile();
    if (!filePath) {
      console.error(pc.red("Error: No agent-registration.json found in current directory"));
      console.log();
      console.log("Usage:");
      console.log(
        pc.cyan("  npx create-sati-agent info              ") + pc.dim("# reads from agent-registration.json"),
      );
      console.log(pc.cyan("  npx create-sati-agent info <mint> --network devnet"));
      process.exit(1);
    }

    const rawData = readRegistrationFile(filePath);
    const data = rawData as unknown as RegistrationFile;

    if (!data.registrations || data.registrations.length === 0) {
      console.error(pc.yellow("No registrations found in agent-registration.json"));
      console.log();
      console.log(pc.dim("Run publish first:"));
      console.log(pc.cyan("  npx create-sati-agent publish --network devnet"));
      process.exit(1);
    }

    // Filter by network if specified
    let regsToShow = data.registrations;
    if (flags.network) {
      const chain = SOLANA_CAIP2_CHAINS[flags.network];
      regsToShow = data.registrations.filter((r) => r.agentRegistry.startsWith(`${chain}:`));

      if (regsToShow.length === 0) {
        console.error(pc.yellow(`No registrations found for network: ${flags.network}`));
        console.log();
        console.log("Available networks in file:");
        for (const reg of data.registrations) {
          const network = reg.agentRegistry.includes("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") ? "mainnet" : "devnet";
          console.log(pc.dim(`  - ${network}: ${reg.agentId}`));
        }
        process.exit(1);
      }
    }

    if (!flags.json) {
      intro(pc.cyan("SATI - Agent Info (from agent-registration.json)"));
      console.log();
    }

    // Show info for each registration
    const results = [];
    for (const reg of regsToShow) {
      const network = reg.agentRegistry.includes("5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp") ? "mainnet" : "devnet";
      const chain = SOLANA_CAIP2_CHAINS[network as "devnet" | "mainnet"];
      const sdk = createSdk(network as "devnet" | "mainnet");
      const agentId = formatSatiAgentId(reg.agentId, chain);

      if (!flags.json) {
        console.log(pc.bold(`${pc.cyan(network.toUpperCase())}: ${reg.agentId}`));
        console.log();
      }

      const s = flags.json ? null : spinner();
      s?.start("Loading agent...");

      try {
        const agent = await sdk.getAgent(agentId);

        if (!agent) {
          s?.stop(pc.red("Agent not found"));
          if (!flags.json) {
            console.log();
          }
          continue;
        }

        s?.stop("Agent loaded");

        if (flags.json) {
          let feedbacks: unknown[] = [];
          try {
            feedbacks = await sdk.searchFeedback({ agentId }, { includeTxHash: false });
            feedbacks = feedbacks.slice(0, limit);
          } catch {
            // Feedback query failure is non-fatal
          }
          results.push({ network, agent, feedbacks });
        } else {
          console.log();
          console.log(JSON.stringify(agent, null, 2));
          console.log();

          // Fetch feedback
          s?.start(`Fetching feedback (limit ${limit})...`);
          try {
            const feedbacks = await sdk.searchFeedback({ agentId }, { includeTxHash: false });
            const limited = feedbacks.slice(0, limit);
            s?.stop(`Feedback loaded (${limited.length} entries)`);

            if (limited.length > 0) {
              console.log(pc.bold("Recent Feedback:"));
              console.log();
              console.log(JSON.stringify(limited, null, 2));
              console.log();
            } else {
              console.log(pc.dim("No feedback yet"));
              console.log();
            }
          } catch (_error) {
            s?.stop(pc.yellow("Feedback unavailable"));
            console.log(pc.dim("(Feedback query failed - schema may not be deployed on this network)"));
            console.log();
          }

          console.log(pc.dim("─".repeat(60)));
          console.log();
        }
      } catch (error) {
        s?.stop(pc.red("Failed to load agent"));
        if (!flags.json) {
          log.error(String(error));
          console.log();
        }
      }
    }

    if (flags.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      outro(pc.dim(`Loaded ${results.length || regsToShow.length} agent(s)`));
    }
  },
});
