import { buildCommand, numberParser } from "@stricli/core";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";
import { loadKeypair } from "../lib/keypair.js";

interface GiveFeedbackFlags {
  agent: string;
  value: number;
  tag1: string;
  tag2?: string;
  endpoint?: string;
  keypair?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const giveFeedbackCommand = buildCommand({
  docs: {
    brief: "Give feedback on an agent (recorded on-chain)",
  },
  parameters: {
    flags: {
      agent: {
        kind: "parsed",
        parse: String,
        brief: "Agent mint address to review (required)",
      },
      value: {
        kind: "parsed",
        parse: numberParser,
        brief: "Score value (required)",
      },
      tag1: {
        kind: "parsed",
        parse: String,
        brief: "Primary dimension: starred, reachable, uptime, etc. (required)",
      },
      tag2: {
        kind: "parsed",
        parse: String,
        brief: "Secondary dimension",
        optional: true,
      },
      endpoint: {
        kind: "parsed",
        parse: String,
        brief: "Specific service endpoint being reviewed",
        optional: true,
      },
      keypair: {
        kind: "parsed",
        parse: String,
        brief: "Path to Solana keypair JSON (default: ~/.config/solana/id.json)",
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
  async func(flags: GiveFeedbackFlags) {
    const isJson = flags.json;

    if (!isJson) {
      intro(pc.cyan("SATI - Give Feedback"));
    }

    // Load keypair
    let signer;
    try {
      signer = await loadKeypair(flags.keypair);
    } catch (error) {
      if (!isJson) {
        log.error("No Solana keypair found");
        console.log();
        console.log(`  Run: ${pc.cyan("npx create-sati-agent init")}`);
        console.log();
      }
      throw new Error("Keypair required");
    }

    const s = !isJson ? spinner() : null;
    s?.start("Submitting feedback on-chain...");

    const sdk = createSdk(flags.network, signer);
    const chain = SOLANA_CAIP2_CHAINS[flags.network];
    const agentId = formatSatiAgentId(flags.agent, chain);

    try {
      const handle = await sdk.giveFeedback(agentId, flags.value, flags.tag1, flags.tag2, flags.endpoint);

      if (isJson) {
        console.log(JSON.stringify({ txHash: handle.hash, agentId, reviewer: signer.address }, null, 2));
        return;
      }

      s?.stop(pc.green("Feedback submitted!"));
      console.log();
      console.log(`  ${pc.dim("Tx:")}       ${handle.hash}`);
      console.log(`  ${pc.dim("Reviewer:")} ${signer.address}`);
      console.log();
      outro(pc.dim("Feedback recorded on Solana"));
    } catch (error) {
      s?.stop(pc.red("Failed"));
      throw error;
    }
  },
});
