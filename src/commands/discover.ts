import { buildCommand, numberParser } from "@stricli/core";
import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { SatiApiClient } from "../lib/api.js";
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
    if (flags.json) {
      const client = new SatiApiClient();
      const result = await client.listAgents({
        name: flags.name,
        owner: flags.owner,
        limit: flags.limit,
        network: flags.network,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    intro(pc.cyan("SATI - Discover Agents"));

    const s = spinner();
    s.start("Searching agents...");

    try {
      const client = new SatiApiClient();
      const result = await client.listAgents({
        name: flags.name,
        owner: flags.owner,
        limit: flags.limit,
        network: flags.network,
      });

      s.stop(`Found ${result.count} agent(s) on ${flags.network}`);
      console.log();
      console.log(formatAgentList(result.agents));
      console.log();
      outro(pc.dim("Use 'create-sati-agent info <mint>' for details"));
    } catch (error) {
      s.stop(pc.red("Failed"));
      throw error;
    }
  },
});
