import { buildCommand } from "@stricli/core";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { SatiApiClient } from "../lib/api.js";
import { formatReputation, truncateAddress } from "../lib/format.js";

interface ReputationFlags {
  tag1?: string;
  tag2?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const reputationCommand = buildCommand({
  docs: {
    brief: "Get reputation summary for an agent",
  },
  parameters: {
    flags: {
      tag1: {
        kind: "parsed",
        parse: String,
        brief: "Filter by primary tag (starred, reachable, uptime, etc.)",
        optional: true,
      },
      tag2: {
        kind: "parsed",
        parse: String,
        brief: "Filter by secondary tag",
        optional: true,
      },
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
  async func(this: void, flags: ReputationFlags, mint: string) {
    if (flags.json) {
      const client = new SatiApiClient();
      const rep = await client.getReputation(mint, {
        tag1: flags.tag1,
        tag2: flags.tag2,
        network: flags.network,
      });
      console.log(JSON.stringify(rep, null, 2));
      return;
    }

    intro(pc.cyan("SATI - Reputation"));

    const s = spinner();
    s.start("Fetching reputation...");

    try {
      const client = new SatiApiClient();
      const rep = await client.getReputation(mint, {
        tag1: flags.tag1,
        tag2: flags.tag2,
        network: flags.network,
      });

      s.stop("Reputation loaded");
      console.log();
      console.log(`  ${pc.dim("Agent:")} ${truncateAddress(mint, 6)}`);
      console.log(`  ${pc.dim("Score:")} ${formatReputation(rep)}`);
      if (flags.tag1) {
        console.log(`  ${pc.dim("Tag:")}   ${flags.tag1}`);
      }
      console.log();
      outro(pc.dim(`Network: ${flags.network}`));
    } catch (error) {
      s.stop(pc.red("Failed"));
      throw error;
    }
  },
});
