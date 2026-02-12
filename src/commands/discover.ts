import { buildCommand, numberParser } from "@stricli/core";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { createSdk } from "../lib/sdk.js";
import { formatAgentList } from "../lib/format.js";

interface DiscoverFlags {
  name?: string;
  owner?: string;
  limit?: number;
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const discoverCommand = buildCommand({
  docs: {
    brief: "Search and list registered agents",
  },
  parameters: {
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Filter agents by name",
        optional: true,
      },
      owner: {
        kind: "parsed",
        parse: String,
        brief: "Filter by owner wallet address",
        optional: true,
      },
      limit: {
        kind: "parsed",
        parse: numberParser,
        brief: "Max results (1-50)",
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
    positional: { kind: "tuple", parameters: [] },
  },
  async func(flags: DiscoverFlags) {
    const sdk = createSdk(flags.network);

    const filters = {
      ...(flags.name && { name: flags.name }),
      ...(flags.owner && { owners: [flags.owner] }),
    };
    const options = {
      ...(flags.limit && { limit: flags.limit }),
    };

    if (flags.json) {
      const agents = await sdk.searchAgents(filters, options);
      console.log(JSON.stringify(agents, null, 2));
      return;
    }

    intro(pc.cyan("SATI - Discover Agents"));

    const s = spinner();
    s.start("Searching agents...");

    try {
      const agents = await sdk.searchAgents(filters, options);

      s.stop(`Found ${agents.length} agent(s) on ${flags.network}`);
      console.log();
      console.log(formatAgentList(agents));
      console.log();
      outro(pc.dim("Use 'create-sati-agent info <mint>' for details"));
    } catch (error) {
      s.stop(pc.red("Failed"));
      throw error;
    }
  },
});
