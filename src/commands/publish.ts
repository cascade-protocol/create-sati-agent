import { buildCommand } from "@stricli/core";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { SOLANA_CAIP2_CHAINS, SATI_PROGRAM_ADDRESS } from "@cascade-fyi/sati-agent0-sdk";
import type { KeyPairSigner } from "@solana/kit";
import { createSdk } from "../lib/sdk.js";
import { loadKeypair } from "../lib/keypair.js";
import { formatRegistration } from "../lib/format.js";
import { findRegistrationFile, readRegistrationFile, writeRegistrationFile, REGISTRATION_FILE } from "../lib/config.js";
import { AgentRegistrationSchema } from "../lib/validation.js";

interface PublishFlags {
  keypair?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

const NETWORK_FOR_CHAIN = Object.fromEntries(
  Object.entries(SOLANA_CAIP2_CHAINS).map(([net, ch]) => [ch, net]),
) as Record<string, "devnet" | "mainnet" | "localnet">;

async function syncOtherNetworks(
  signer: KeyPairSigner,
  currentNetwork: "devnet" | "mainnet",
  data: Record<string, unknown>,
  services: Array<{ name: string; endpoint: string }> | undefined,
  active: boolean | undefined,
  supportedTrust: string[] | undefined,
  isJson: boolean | undefined,
  name: string,
  description: string,
  image: string | undefined,
) {
  const regs = data.registrations as Array<{ agentId: string; agentRegistry: string }> | undefined;
  if (!regs || regs.length < 2) return;

  const currentChain = SOLANA_CAIP2_CHAINS[currentNetwork];
  const otherRegs = regs.filter(
    (r) => typeof r.agentRegistry === "string" && !r.agentRegistry.startsWith(`${currentChain}:`),
  );
  if (otherRegs.length === 0) return;

  for (const reg of otherRegs) {
    const chainPrefix = reg.agentRegistry.split(":").slice(0, 2).join(":");
    const network = NETWORK_FOR_CHAIN[chainPrefix];
    if (!network || network === "localnet") continue;

    if (!isJson) {
      log.info(`Syncing ${network}...`);
    }

    try {
      const otherSdk = createSdk(network, signer);
      const agent = await otherSdk.loadAgent(reg.agentId);
      agent.updateInfo(name, description, image);
      agent.removeEndpoints();
      for (const svc of services ?? []) {
        const upper = svc.name.toUpperCase();
        if (upper === "MCP") await agent.setMCP(svc.endpoint);
        else if (upper === "A2A") await agent.setA2A(svc.endpoint);
      }
      if (active !== undefined) agent.setActive(active);
      if (supportedTrust) {
        agent.setTrust(
          supportedTrust.includes("reputation"),
          supportedTrust.includes("cryptoEconomic"),
          supportedTrust.includes("teeAttestation"),
        );
      }
      await agent.updateIPFS();
      if (!isJson) {
        log.success(`${network} synced`);
      }
    } catch (error) {
      if (!isJson) {
        log.warn(`Failed to sync ${network}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
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

    const rawData = readRegistrationFile(filePath);
    
    // Validate agent data
    const validationResult = AgentRegistrationSchema.safeParse(rawData);
    if (!validationResult.success) {
      if (!isJson) {
        log.error(`Invalid ${REGISTRATION_FILE}`);
        console.log();
        validationResult.error.issues.forEach((issue) => {
          const path = issue.path.length > 0 ? issue.path.join(".") : "root";
          console.log(`  ${pc.red("✗")} ${path}: ${issue.message}`);
        });
        console.log();
      }
      throw new Error("Validation failed");
    }
    
    const data = validationResult.data;
    const { name, description, image, active, supportedTrust, registrations } = data;
    const services = data.services ?? data.endpoints; // Support legacy 'endpoints' field

    // Find registration matching the target network
    const chain = SOLANA_CAIP2_CHAINS[flags.network];
    const existingReg = registrations?.find(
      (r) => typeof r.agentRegistry === "string" && r.agentRegistry.startsWith(`${chain}:`),
    );
    const isUpdate = !!existingReg;

    if (!isJson) {
      intro(pc.cyan(isUpdate ? "SATI - Update Agent" : "SATI - Publish Agent"));
    }

    // Load keypair
    let signer: KeyPairSigner;
    try {
      signer = await loadKeypair(flags.keypair);
    } catch (error) {
      if (!isJson) {
        log.error("No Solana keypair found");
        console.log();
        console.log(`  Run: ${pc.cyan("npx create-sati-agent setup")}`);
        console.log();
      }
      throw new Error("Keypair required");
    }

    {
      const s = !isJson ? spinner() : null;

      try {
        const sdk = createSdk(flags.network, signer);

        if (isUpdate) {
          // Update existing agent on this network
          const satiReg = existingReg;

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

          // Sync other networks
          await syncOtherNetworks(
            signer,
            flags.network,
            rawData,
            services,
            active,
            supportedTrust,
            isJson,
            name,
            description,
            image,
          );

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

          // Append registration for this network
          if (agentId) {
            const existing = registrations ?? [];
            existing.push({
              agentId,
              agentRegistry: `${chain}:${SATI_PROGRAM_ADDRESS}`,
            });
            const updatedData = { ...rawData, registrations: existing };
            writeRegistrationFile(filePath, updatedData);
          }

          if (isJson) {
            console.log(JSON.stringify({ hash: handle.hash, agentId }, null, 2));
            return;
          }

          s?.stop(pc.green("Agent registered!"));

          // Sync other networks (they need updated registrations array in IPFS)
          await syncOtherNetworks(
            signer,
            flags.network,
            data,
            services,
            active,
            supportedTrust,
            isJson,
            name,
            description,
            image,
          );

          console.log();
          console.log(formatRegistration({ hash: handle.hash, agentId }));
          console.log();
          outro(pc.dim("Your agent identity is now on Solana"));
        }
      } catch (error) {
        s?.stop(pc.red(isUpdate ? "Update failed" : "Registration failed"));
        throw error;
      }
    }
  },
});
