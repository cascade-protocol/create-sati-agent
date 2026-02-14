import { buildCommand } from "@stricli/core";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";

interface InfoFlags {
  network: "devnet" | "mainnet";
  json?: boolean;
  limit?: number;
}

export const infoCommand = buildCommand({
  docs: {
    brief: "Get detailed agent information with feedback",
  },
  parameters: {
    flags: {
      network: {
        kind: "enum",
        values: ["devnet", "mainnet"],
        brief: "Solana network",
        default: "mainnet",
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
          brief: "Agent mint address",
          parse: String,
          placeholder: "mint",
        },
      ],
    },
  },
  async func(this: void, flags: InfoFlags, mint: string) {
    const sdk = createSdk(flags.network);
    const chain = SOLANA_CAIP2_CHAINS[flags.network];
    const agentId = formatSatiAgentId(mint, chain);
    const limit = Math.min(Math.max(flags.limit ?? 10, 0), 1000);

    if (flags.json) {
      const agent = await sdk.getAgent(agentId);
      let feedbacks: unknown[] = [];
      try {
        feedbacks = await sdk.searchFeedback({ agentId }, { includeTxHash: false });
        feedbacks = feedbacks.slice(0, limit);
      } catch {
        // Feedback query failure is non-fatal
      }
      console.log(JSON.stringify({ agent, feedbacks }, null, 2));
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
      throw error;
    }
  },
});
