import { buildCommand } from "@stricli/core";
import {
  intro,
  outro,
  spinner,
  text,
  select,
  isCancel,
  cancel,
  log,
} from "@clack/prompts";
import pc from "picocolors";
import { SatiApiClient, PaymentRequiredError } from "../lib/api.js";
import { formatRegistration } from "../lib/format.js";
import type { ServiceEndpoint } from "../lib/types.js";

interface RegisterFlags {
  name?: string;
  description?: string;
  image?: string;
  owner?: string;
  mcpEndpoint?: string;
  a2aEndpoint?: string;
  network: "devnet" | "mainnet";
  paymentHeader?: string;
  json?: boolean;
}

export const registerCommand = buildCommand({
  docs: {
    brief: "Register a new AI agent on-chain ($0.30 USDC via x402)",
  },
  parameters: {
    flags: {
      name: {
        kind: "parsed",
        parse: String,
        brief: "Agent name (max 32 chars)",
        optional: true,
      },
      description: {
        kind: "parsed",
        parse: String,
        brief: "What the agent does",
        optional: true,
      },
      image: {
        kind: "parsed",
        parse: String,
        brief: "Avatar image URL",
        optional: true,
      },
      owner: {
        kind: "parsed",
        parse: String,
        brief: "Solana wallet address (NFT minted to this address)",
        optional: true,
      },
      mcpEndpoint: {
        kind: "parsed",
        parse: String,
        brief: "MCP server endpoint URL",
        optional: true,
      },
      a2aEndpoint: {
        kind: "parsed",
        parse: String,
        brief: "A2A endpoint URL",
        optional: true,
      },
      network: {
        kind: "enum",
        values: ["devnet", "mainnet"],
        brief: "Solana network",
        default: "mainnet",
      },
      paymentHeader: {
        kind: "parsed",
        parse: String,
        brief: "Pre-computed x402 payment header",
        optional: true,
      },
      json: {
        kind: "boolean",
        brief: "Output raw JSON",
        optional: true,
      },
    },
    positional: { kind: "tuple", parameters: [] },
  },
  async func(flags: RegisterFlags) {
    const isJson = flags.json;

    if (!isJson) {
      intro(pc.cyan("SATI - Register Agent"));
      log.info("Registration costs $0.30 USDC via x402 protocol");
    }

    // Collect missing required fields interactively
    let name = flags.name;
    let description = flags.description;
    let image = flags.image;
    let owner = flags.owner;

    if (!name) {
      const result = await text({
        message: "Agent name:",
        validate: (v) => {
          if (!v.trim()) return "Name is required";
          if (new TextEncoder().encode(v).length > 32)
            return "Max 32 bytes";
          return undefined;
        },
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      name = result;
    }

    if (!description) {
      const result = await text({
        message: "Description:",
        validate: (v) =>
          !v.trim() ? "Description is required" : undefined,
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      description = result;
    }

    if (!image) {
      const result = await text({
        message: "Avatar image URL:",
        validate: (v) => (!v.trim() ? "Image URL is required" : undefined),
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      image = result;
    }

    if (!owner) {
      const result = await text({
        message: "Solana wallet address (NFT owner):",
        validate: (v) =>
          v.length < 32 ? "Must be a valid Solana address" : undefined,
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      owner = result;
    }

    // Build services array
    const services: ServiceEndpoint[] = [];
    if (flags.mcpEndpoint) {
      services.push({
        name: "MCP",
        endpoint: flags.mcpEndpoint,
        version: "2025-06-18",
      });
    }
    if (flags.a2aEndpoint) {
      services.push({
        name: "A2A",
        endpoint: flags.a2aEndpoint,
      });
    }

    // If no services specified in flags, ask interactively
    if (!flags.mcpEndpoint && !flags.a2aEndpoint && !isJson) {
      const mcpResult = await text({
        message: "MCP endpoint (leave empty to skip):",
      });
      if (isCancel(mcpResult)) {
        cancel("Cancelled");
        process.exit(0);
      }
      if (mcpResult.trim()) {
        services.push({
          name: "MCP",
          endpoint: mcpResult.trim(),
          version: "2025-06-18",
        });
      }
    }

    const s = !isJson ? spinner() : null;
    s?.start("Registering agent on Solana...");

    try {
      const client = new SatiApiClient();
      const result = await client.register(
        {
          name,
          description,
          image,
          ownerAddress: owner,
          services: services.length > 0 ? services : undefined,
          active: true,
          supportedTrust: ["reputation"],
          network: flags.network,
        },
        flags.paymentHeader,
      );

      if (isJson) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      s?.stop(pc.green("Agent registered!"));
      console.log();
      console.log(formatRegistration(result));
      console.log();
      outro(pc.dim("Your agent identity is now on Solana"));
    } catch (error) {
      s?.stop(pc.red("Registration failed"));

      if (error instanceof PaymentRequiredError) {
        log.warn("Registration requires x402 payment ($0.30 USDC on Solana)");
        console.log();
        console.log(pc.bold("  How to pay:"));
        console.log();
        console.log(
          `  ${pc.dim("1.")} Set up AgentWallet (recommended for agents):`,
        );
        console.log(
          `     Set AGENT_WALLET_URL and AGENT_WALLET_USERNAME env vars`,
        );
        console.log(
          `     ${pc.dim("See:")} https://agentwallet.mcpay.tech/skill.md`,
        );
        console.log();
        console.log(
          `  ${pc.dim("2.")} Provide a pre-computed payment header:`,
        );
        console.log(
          `     create-sati-agent register --payment-header "<header>"`,
        );
        console.log();
        return;
      }

      throw error;
    }
  },
});
