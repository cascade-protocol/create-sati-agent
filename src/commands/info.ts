import { buildCommand } from "@stricli/core";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { SatiApiClient } from "../lib/api.js";
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
    if (flags.json) {
      const client = new SatiApiClient();
      const agent = await client.getAgent(mint, flags.network);
      console.log(JSON.stringify(agent, null, 2));
      return;
    }

    intro(pc.cyan("SATI - Agent Info"));

    const s = spinner();
    s.start("Loading agent...");

    try {
      const client = new SatiApiClient();
      const agent = await client.getAgent(mint, flags.network);

      s.stop("Agent loaded");
      console.log();
      console.log(formatAgent(agent));
      console.log();
      outro(pc.dim(`Network: ${flags.network}`));
    } catch (error) {
      s.stop(pc.red("Failed"));
      throw error;
    }
  },
});
