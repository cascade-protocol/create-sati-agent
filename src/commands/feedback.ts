import { buildCommand, numberParser } from "@stricli/core";
import { intro, outro, spinner, text, select, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import { SatiApiClient } from "../lib/api.js";

interface FeedbackFlags {
  agent?: string;
  value?: number;
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  reviewer?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const feedbackCommand = buildCommand({
  docs: {
    brief: "Give feedback on an agent (free, recorded on-chain)",
  },
  parameters: {
    flags: {
      agent: {
        kind: "parsed",
        parse: String,
        brief: "Agent mint address to review",
        optional: true,
      },
      value: {
        kind: "parsed",
        parse: numberParser,
        brief: "Score value",
        optional: true,
      },
      valueDecimals: {
        kind: "parsed",
        parse: numberParser,
        brief: "Decimal places for value",
        optional: true,
      },
      tag1: {
        kind: "parsed",
        parse: String,
        brief: "Primary dimension (starred, reachable, uptime, etc.)",
        optional: true,
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
      reviewer: {
        kind: "parsed",
        parse: String,
        brief: "Your Solana address (for attribution)",
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
  async func(flags: FeedbackFlags) {
    const isJson = flags.json;

    if (!isJson) {
      intro(pc.cyan("SATI - Give Feedback"));
    }

    // Collect missing required fields interactively
    let agentMint = flags.agent;
    let value = flags.value;
    let tag1 = flags.tag1;

    if (!agentMint) {
      const result = await text({
        message: "Agent mint address:",
        validate: (v) =>
          v.length < 32 ? "Must be a valid Solana address" : undefined,
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      agentMint = result;
    }

    if (!tag1) {
      const result = await select({
        message: "Feedback category:",
        options: [
          { value: "starred", label: "Overall Rating (0-100)" },
          { value: "reachable", label: "Reachability (0 or 1)" },
          { value: "uptime", label: "Uptime %" },
          { value: "responseTime", label: "Response Time (ms)" },
          { value: "successRate", label: "Success Rate %" },
        ],
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      tag1 = result as string;
    }

    if (value === undefined) {
      const result = await text({
        message: "Value:",
        validate: (v) => {
          const n = Number(v);
          return isNaN(n) ? "Must be a number" : undefined;
        },
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      value = Number(result);
    }

    const s = !isJson ? spinner() : null;
    s?.start("Submitting feedback on-chain...");

    try {
      const client = new SatiApiClient();
      const result = await client.submitFeedback({
        agentMint,
        value,
        valueDecimals: flags.valueDecimals,
        tag1,
        tag2: flags.tag2,
        endpoint: flags.endpoint,
        reviewerAddress: flags.reviewer,
        network: flags.network,
      });

      if (isJson) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      s?.stop(pc.green("Feedback submitted!"));
      console.log();
      console.log(`  ${pc.dim("Tx:")}          ${result.txSignature}`);
      console.log(`  ${pc.dim("Attestation:")} ${result.attestationAddress}`);
      console.log();
      outro(pc.dim("Feedback recorded on Solana"));
    } catch (error) {
      s?.stop(pc.red("Failed"));
      throw error;
    }
  },
});
