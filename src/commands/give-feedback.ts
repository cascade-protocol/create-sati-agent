import { buildCommand, numberParser } from "@stricli/core";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import type { KeyPairSigner } from "@solana/kit";
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
    let signer: KeyPairSigner | undefined;
    try {
      signer = await loadKeypair(flags.keypair);
    } catch (_error) {
      if (!isJson) {
        log.error("No Solana keypair found");
        console.log();
        console.log(`  Run: ${pc.cyan("npx create-sati-agent init")}`);
        console.log();
      }
      throw new Error("Keypair required");
    }

    const s = !isJson ? spinner() : null;
    // Validate agent address format
    if (flags.agent.length < 32 || flags.agent.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(flags.agent)) {
      if (!isJson) {
        log.error("Invalid agent address format");
        console.log();
        console.log(pc.dim(`Address provided: ${flags.agent} (${flags.agent.length} characters)`));
        console.log(pc.dim("Expected: 32-44 base58 characters"));
        console.log();
      } else {
        console.error(JSON.stringify({ error: "Invalid agent address format" }, null, 2));
      }
      process.exit(1);
    }

    s?.start("Submitting feedback on-chain...");

    const sdk = createSdk(flags.network, signer);
    const chain = SOLANA_CAIP2_CHAINS[flags.network];

    let agentId: string;
    try {
      agentId = formatSatiAgentId(flags.agent, chain);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.toLowerCase().includes("base58") || errorMsg.toLowerCase().includes("address")) {
        if (!isJson) {
          log.error("Invalid agent address format");
          console.log();
          console.log(pc.dim(`Address: ${flags.agent}`));
          console.log();
        } else {
          console.error(JSON.stringify({ error: "Invalid agent address format" }, null, 2));
        }
        process.exit(1);
      }
      throw error;
    }

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
