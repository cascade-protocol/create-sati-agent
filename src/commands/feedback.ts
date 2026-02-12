import { buildCommand, numberParser } from "@stricli/core";
import { intro, outro, spinner, text, select, isCancel, cancel, log } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";
import { loadKeypair } from "../lib/keypair.js";
import { loadAgentWalletConfig, awSubmitFeedback } from "../lib/agentwallet.js";

interface FeedbackFlags {
  agent?: string;
  value?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  keypair?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const feedbackCommand = buildCommand({
  docs: {
    brief: "Give feedback on an agent (recorded on-chain)",
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
  async func(flags: FeedbackFlags) {
    const isJson = flags.json;

    if (!isJson) {
      intro(pc.cyan("SATI - Give Feedback"));
    }

    let agentMint = flags.agent;
    let value = flags.value;
    let tag1 = flags.tag1;

    if (!agentMint) {
      const result = await text({
        message: "Agent mint address:",
        validate: (v) => (v.length < 32 ? "Must be a valid Solana address" : undefined),
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
          return Number.isNaN(n) ? "Must be a number" : undefined;
        },
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      value = Number(result);
    }

    // Try keypair first, then AgentWallet fallback
    const signer = await loadKeypair(flags.keypair).catch(() => null);

    if (signer) {
      const s = !isJson ? spinner() : null;
      s?.start("Submitting feedback on-chain...");

      const sdk = createSdk(flags.network, signer);
      const chain = SOLANA_CAIP2_CHAINS[flags.network];
      const agentId = formatSatiAgentId(agentMint, chain);

      try {
        const handle = await sdk.giveFeedback(agentId, value, tag1, flags.tag2, flags.endpoint);

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
      return;
    }

    // AgentWallet fallback
    const awConfig = loadAgentWalletConfig();
    if (!awConfig) {
      if (!isJson) {
        log.error("No signing method available");
        console.log();
        console.log(`  ${pc.bold("Option 1:")} Provide a Solana keypair`);
        console.log(`    create-sati-agent feedback --keypair ~/.config/solana/id.json`);
        console.log();
        console.log(`  ${pc.bold("Option 2:")} Set up AgentWallet`);
        console.log(`    ${pc.dim("See:")} https://agentwallet.mcpay.tech/skill.md`);
        console.log();
      }
      throw new Error("No keypair or AgentWallet config found");
    }

    if (!isJson) {
      log.info(`Using AgentWallet (${awConfig.username})`);
    }

    const s = !isJson ? spinner() : null;
    s?.start("Submitting feedback via API...");

    try {
      const result = await awSubmitFeedback(awConfig, {
        network: flags.network,
        agentMint,
        value,
        tag1,
        tag2: flags.tag2,
        endpoint: flags.endpoint,
      });

      if (isJson) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      s?.stop(pc.green("Feedback submitted!"));
      console.log();
      console.log(`  ${pc.dim("Tx:")}       ${result.txHash}`);
      console.log(`  ${pc.dim("Reviewer:")} ${awConfig.solanaAddress}`);
      console.log();
      outro(pc.dim("Feedback recorded on Solana"));
    } catch (error) {
      s?.stop(pc.red("Failed"));
      throw error;
    }
  },
});
