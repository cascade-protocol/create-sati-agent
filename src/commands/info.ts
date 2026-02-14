import { buildCommand } from "@stricli/core";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";
import { formatAgent } from "../lib/format.js";

interface InfoFlags {
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const infoCommand = buildCommand({
  docs: {
    brief: "Get detailed agent information and reputation",
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

    if (flags.json) {
      const agent = await sdk.getAgent(agentId);
      console.log(JSON.stringify(agent, null, 2));
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
      outro(pc.dim(`Network: ${flags.network}`));
    } catch (error) {
      s.stop(pc.red("Failed"));
      throw error;
    }
  },
});
