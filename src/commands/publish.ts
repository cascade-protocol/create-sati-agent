import { buildCommand } from "@stricli/core";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { SOLANA_CAIP2_CHAINS, SATI_PROGRAM_ADDRESS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";
import { loadKeypair } from "../lib/keypair.js";
import { loadAgentWalletConfig, awRegisterAgent } from "../lib/agentwallet.js";
import { formatRegistration } from "../lib/format.js";
import { findRegistrationFile, readRegistrationFile, writeRegistrationFile, REGISTRATION_FILE } from "../lib/config.js";

interface PublishFlags {
  keypair?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

export const publishCommand = buildCommand({
  docs: {
    brief: "Publish agent identity on-chain (register or update)",
  },
  parameters: {
    flags: {
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
  async func(flags: PublishFlags) {
    const isJson = flags.json;
    const filePath = findRegistrationFile();

    if (!filePath) {
      if (!isJson) {
        log.error(`No ${REGISTRATION_FILE} found. Run ${pc.cyan("create-sati-agent")} for setup instructions.`);
      }
      throw new Error(`${REGISTRATION_FILE} not found`);
    }

    const data = readRegistrationFile(filePath);
    const name = data.name as string | undefined;
    const description = data.description as string | undefined;
    const image = data.image as string | undefined;
    const services = (data.services ?? data.endpoints) as Array<{ name: string; endpoint: string }> | undefined;
    const active = data.active as boolean | undefined;
    const supportedTrust = data.supportedTrust as string[] | undefined;
    const registrations = data.registrations as Array<{ agentId: string; agentRegistry: string }> | undefined;

    if (!name || !description) {
      throw new Error(`${REGISTRATION_FILE} must have "name" and "description" fields`);
    }

    const isUpdate = registrations && registrations.length > 0;

    if (!isJson) {
      intro(pc.cyan(isUpdate ? "SATI - Update Agent" : "SATI - Publish Agent"));
    }

    // Try keypair first, then AgentWallet fallback
    const signer = await loadKeypair(flags.keypair).catch(() => null);

    if (signer) {
      const s = !isJson ? spinner() : null;

      try {
        const sdk = createSdk(flags.network, signer);

        if (isUpdate) {
          // Update existing agent
          const satiReg = registrations.find(
            (r) => typeof r.agentRegistry === "string" && r.agentRegistry.startsWith("solana:"),
          );
          if (!satiReg) {
            throw new Error("No Solana registration found in registrations array");
          }

          s?.start("Loading agent...");
          const agent = await sdk.loadAgent(satiReg.agentId);

          // Apply changes from file
          agent.updateInfo(name, description, image);

          // Reset endpoints and re-add from file
          agent.removeEndpoints();
          for (const svc of services ?? []) {
            const upper = svc.name.toUpperCase();
            if (upper === "MCP") {
              s?.message("Fetching MCP capabilities...");
              await agent.setMCP(svc.endpoint);
            } else if (upper === "A2A") {
              s?.message("Fetching A2A capabilities...");
              await agent.setA2A(svc.endpoint);
            }
          }

          if (active !== undefined) agent.setActive(active);
          if (supportedTrust) {
            agent.setTrust(
              supportedTrust.includes("reputation"),
              supportedTrust.includes("cryptoEconomic"),
              supportedTrust.includes("teeAttestation"),
            );
          }

          s?.message("Updating on-chain...");
          const handle = await agent.updateIPFS();

          if (isJson) {
            console.log(JSON.stringify({ hash: handle.hash, agentId: satiReg.agentId }, null, 2));
            return;
          }

          s?.stop(pc.green("Agent updated!"));
          console.log();
          console.log(formatRegistration({ hash: handle.hash, agentId: satiReg.agentId }));
          console.log();
          outro(pc.dim("On-chain identity updated"));
        } else {
          // New registration
          s?.start("Creating agent...");
          const agent = sdk.createAgent(name, description, image);

          for (const svc of services ?? []) {
            const upper = svc.name.toUpperCase();
            if (upper === "MCP") {
              s?.message("Fetching MCP capabilities...");
              await agent.setMCP(svc.endpoint);
            } else if (upper === "A2A") {
              s?.message("Fetching A2A capabilities...");
              await agent.setA2A(svc.endpoint);
            }
          }

          if (active !== undefined) agent.setActive(active);
          if (supportedTrust) {
            agent.setTrust(
              supportedTrust.includes("reputation"),
              supportedTrust.includes("cryptoEconomic"),
              supportedTrust.includes("teeAttestation"),
            );
          }

          s?.message("Registering on-chain...");
          const handle = await agent.registerIPFS();
          const agentId = agent.agentId;

          // Write registrations back into the file
          if (agentId) {
            const chain = SOLANA_CAIP2_CHAINS[flags.network];
            data.registrations = [
              {
                agentId,
                agentRegistry: `${chain}:${SATI_PROGRAM_ADDRESS}`,
              },
            ];
            writeRegistrationFile(filePath, data);
          }

          if (isJson) {
            console.log(JSON.stringify({ hash: handle.hash, agentId }, null, 2));
            return;
          }

          s?.stop(pc.green("Agent registered!"));
          console.log();
          console.log(formatRegistration({ hash: handle.hash, agentId }));
          console.log();
          outro(pc.dim("Your agent identity is now on Solana"));
        }
      } catch (error) {
        s?.stop(pc.red(isUpdate ? "Update failed" : "Registration failed"));
        throw error;
      }
      return;
    }

    // AgentWallet fallback (new registrations only)
    if (isUpdate) {
      if (!isJson) {
        log.error("Updating requires a Solana keypair (AgentWallet does not support updates)");
        console.log();
        console.log(`  ${pc.cyan("create-sati-agent publish --keypair ~/.config/solana/id.json --network devnet")}`);
        console.log();
      }
      throw new Error("AgentWallet does not support agent updates - provide a keypair");
    }

    const awConfig = loadAgentWalletConfig();
    if (!awConfig) {
      if (!isJson) {
        log.error("No signing method available");
        console.log();
        console.log(`  ${pc.bold("Option 1:")} Provide a Solana keypair`);
        console.log(`    create-sati-agent publish --keypair ~/.config/solana/id.json`);
        console.log();
        console.log(`  ${pc.bold("Option 2:")} Set up AgentWallet`);
        console.log(`    ${pc.dim("See:")} https://agentwallet.mcpay.tech/skill.md`);
        console.log();
      }
      throw new Error("No keypair or AgentWallet config found");
    }

    if (!isJson) {
      log.info(`Using AgentWallet (${awConfig.username}) - $0.30 USDC via x402`);
    }

    const s = !isJson ? spinner() : null;
    s?.start("Registering via AgentWallet...");

    try {
      const mcpSvc = services?.find((ep) => ep.name.toUpperCase() === "MCP");
      const a2aSvc = services?.find((ep) => ep.name.toUpperCase() === "A2A");

      const result = await awRegisterAgent(awConfig, {
        network: flags.network,
        name,
        description,
        image: image ?? "",
        mcpEndpoint: mcpSvc?.endpoint,
        a2aEndpoint: a2aSvc?.endpoint,
      });

      // Write registrations back if we got an agentId
      if (result.agentId) {
        const chain = SOLANA_CAIP2_CHAINS[flags.network];
        data.registrations = [
          {
            agentId: result.agentId,
            agentRegistry: `${chain}:${SATI_PROGRAM_ADDRESS}`,
          },
        ];
        writeRegistrationFile(filePath, data);
      }

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
      throw error;
    }
  },
});
