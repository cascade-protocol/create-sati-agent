import { buildCommand } from "@stricli/core";
import { intro, outro, spinner, log } from "@clack/prompts";
import pc from "picocolors";
import { SOLANA_CAIP2_CHAINS, SATI_PROGRAM_ADDRESS } from "@cascade-fyi/sati-agent0-sdk";
import { createSolanaRpc, address, type KeyPairSigner } from "@solana/kit";
import { createSdk } from "../lib/sdk.js";
import { loadKeypair } from "../lib/keypair.js";
import { formatRegistration } from "../lib/format.js";
import { findRegistrationFile, readRegistrationFile, writeRegistrationFile, REGISTRATION_FILE } from "../lib/config.js";
import { validateERC8004RegistrationFile } from "../lib/erc8004-validation.js";

const FAUCET_URL = "https://sati.cascade.fyi/api/faucet";
const MIN_BALANCE_SOL = 0.007;

async function checkEndpoint(url: string, name: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'create-sati-agent' }
    });
    clearTimeout(timeout);
    return res.ok || res.status === 404; // 404 is fine, means server exists
  } catch {
    return false;
  }
}

async function getBalance(signer: KeyPairSigner, network: "devnet" | "mainnet"): Promise<number> {
  const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com";
  const rpc = createSolanaRpc(rpcUrl);
  const addr = address(signer.address);
  const { value: balance } = await rpc.getBalance(addr, { commitment: "confirmed" }).send();
  return Number(balance) / 1_000_000_000;
}

interface PublishFlags {
  keypair?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
}

const NETWORK_FOR_CHAIN = Object.fromEntries(
  Object.entries(SOLANA_CAIP2_CHAINS).map(([net, ch]) => [ch, net]),
) as Record<string, "devnet" | "mainnet" | "localnet">;

async function ensureFunding(
  signer: KeyPairSigner,
  network: "devnet" | "mainnet",
  isJson: boolean | undefined,
): Promise<number> {
  let s = !isJson ? spinner() : null;
  s?.start("Checking balance...");

  const sol = await getBalance(signer, network);

  if (sol >= MIN_BALANCE_SOL) {
    s?.stop(pc.dim(`Balance: ${sol.toFixed(4)} SOL`));
    return sol;
  }

  // Insufficient balance
  if (network === "mainnet") {
    s?.stop(pc.red(`Insufficient balance: ${sol.toFixed(4)} SOL`));
    if (!isJson) {
      console.log();
      log.error(`Need at least ${MIN_BALANCE_SOL} SOL for registration`);
      console.log();
      console.log(pc.dim("Fund your wallet:"));
      console.log(pc.cyan(`  ${signer.address}`));
      console.log();
    }
    process.exit(1);
  }

  // Devnet - request from faucet
  s?.message("Requesting devnet SOL from faucet...");

  try {
    const res = await fetch(FAUCET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: signer.address, network: "devnet" }),
    });

    const result = (await res.json()) as { success?: boolean; error?: string; signature?: string };

    if (!res.ok || !result.success) {
      s?.stop(pc.red("Faucet request failed"));
      if (!isJson) {
        console.log();
        
        // Check if it's a rate limit error
        if (res.status === 429 || result.error?.toLowerCase().includes('rate limit')) {
          log.error("Faucet rate limit (1 request per 5 minutes)");
          console.log();
          console.log(pc.dim("Your wallet address:"));
          console.log(pc.cyan(`  ${signer.address}`));
          console.log();
          console.log(pc.dim("Funding options:"));
          console.log(pc.dim("  1. Wait 5 minutes and retry this command"));
          console.log(pc.dim("  2. Use public faucet: https://faucet.solana.com"));
          console.log(pc.dim("     (paste your wallet address above)"));
          console.log(pc.dim("  3. Use Solana CLI: solana airdrop 0.01 --url devnet"));
        } else {
          log.error(result.error || `HTTP ${res.status}`);
          console.log();
          console.log(pc.dim("Your wallet:"), pc.cyan(signer.address));
          console.log(pc.dim("Try public faucet: https://faucet.solana.com"));
        }
        console.log();
      }
      process.exit(1);
    }

    s?.stop(pc.dim(`Funded: +0.01 SOL (${result.signature?.slice(0, 8)}...)`));
    
    // Wait for transaction confirmation (devnet is usually fast, but not instant)
    if (!isJson) {
      s = spinner();
      s.start("Waiting for confirmation...");
    }
    await new Promise(resolve => setTimeout(resolve, 3000));
    s?.stop(pc.dim("Confirmed"));
    
    // Return new balance
    return await getBalance(signer, network);
  } catch (error) {
    s?.stop(pc.red("Faucet request failed"));
    if (!isJson) {
      console.log();
      log.error(error instanceof Error ? error.message : String(error));
      console.log();
      console.log(pc.dim("Try public faucet: https://faucet.solana.com"));
      console.log();
    }
    process.exit(1);
  }
}

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
      for (const svc of (services as any[]) ?? []) {
        const serviceName = svc.name;
        if (serviceName === "MCP") await agent.setMCP(svc.endpoint, svc.version);
        else if (serviceName === "A2A") await agent.setA2A(svc.endpoint, svc.version);
        else if (serviceName === "ENS") agent.setENS(svc.endpoint, svc.version);
        else if (serviceName === "agentWallet") agent.setWallet(svc.endpoint);
      }
      if (active !== undefined) agent.setActive(active);
      if (Array.isArray(supportedTrust) && supportedTrust.length > 0) {
        agent.setTrust(
          supportedTrust.includes("reputation"),
          supportedTrust.includes("crypto-economic"),
          supportedTrust.includes("tee-attestation"),
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
    
    // Validate ERC-8004 registration file format
    const validationErrors = validateERC8004RegistrationFile(rawData);
    if (validationErrors.length > 0) {
      if (!isJson) {
        log.error(`Invalid ${REGISTRATION_FILE}`);
        console.log();
        validationErrors.forEach((err) => {
          console.log(`  ${pc.red("✗")} ${err.field}: ${err.message}`);
        });
        console.log();
      }
      throw new Error("Validation failed");
    }
    
    const data = rawData as Record<string, unknown>;
    const { name, description, image, active, supportedTrust, registrations, services } = data;
    const x402Support = data.x402Support;

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
        console.log(`  Run: ${pc.cyan("npx create-sati-agent init")}`);
        console.log(`  This will create a keypair at ~/.config/solana/id.json`);
        console.log();
      }
      throw new Error("Keypair required");
    }

    // Validate endpoints before publishing (only HTTP services)
    if (!isJson && Array.isArray(services) && services.length > 0) {
      const s = spinner();
      s.start("Validating endpoints...");
      
      const warnings: string[] = [];
      for (const svc of services as any[]) {
        // Only validate HTTP endpoints (MCP, A2A)
        if (svc.name === "MCP" || svc.name === "A2A") {
          const reachable = await checkEndpoint(svc.endpoint, svc.name);
          if (!reachable) {
            warnings.push(`${svc.name}: ${svc.endpoint}`);
          }
        }
      }
      
      if (warnings.length > 0) {
        s.stop(pc.yellow("⚠ Some endpoints unreachable"));
        console.log();
        for (const w of warnings) {
          log.warn(w);
        }
        console.log();
        console.log(pc.dim("This is OK - endpoints will be retried later"));
        console.log();
      } else if (services.some((s: any) => s.name === "MCP" || s.name === "A2A")) {
        s.stop(pc.dim("✓ All endpoints reachable"));
      } else {
        s.stop(pc.dim("No HTTP endpoints to validate"));
      }
    }

    // Ensure wallet has sufficient balance (airdrop on devnet if needed)
    const balanceBefore = await ensureFunding(signer, flags.network, isJson);

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
          for (const svc of (services as any[]) ?? []) {
            const serviceName = svc.name;
            if (serviceName === "MCP") {
              s?.message("Fetching MCP capabilities...");
              await agent.setMCP(svc.endpoint, svc.version);
            } else if (serviceName === "A2A") {
              s?.message("Fetching A2A capabilities...");
              await agent.setA2A(svc.endpoint, svc.version);
            } else if (serviceName === "ENS") {
              agent.setENS(svc.endpoint, svc.version);
            } else if (serviceName === "agentWallet") {
              agent.setWallet(svc.endpoint);
            } else if (serviceName === "DID" || serviceName === "OASF") {
              // DID and OASF don't have dedicated SDK setters
              // They'll be stored in metadata/IPFS
              if (!isJson) {
                log.info(`${serviceName} service will be stored in IPFS metadata`);
              }
            }
          }

          if (active !== undefined) agent.setActive(active);
          if (Array.isArray(supportedTrust) && supportedTrust.length > 0) {
            agent.setTrust(
              supportedTrust.includes("reputation"),
              supportedTrust.includes("crypto-economic"),
              supportedTrust.includes("tee-attestation"),
            );
          }
          if (x402Support !== undefined) {
            // Store x402Support in metadata - SDK may handle this
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

          // Get final balance and calculate cost
          const balanceAfter = await getBalance(signer, flags.network);
          const cost = balanceBefore - balanceAfter;

          console.log();
          console.log(formatRegistration({ hash: handle.hash, agentId: satiReg.agentId }));
          console.log();
          
          // Cost breakdown
          if (cost > 0) {
            console.log(pc.dim(`Transaction cost: ${cost.toFixed(6)} SOL`));
            console.log(pc.dim(`Remaining balance: ${balanceAfter.toFixed(4)} SOL`));
            console.log();
          }

          outro(pc.dim("On-chain identity updated"));
        } else {
          // New registration
          s?.start("Creating agent...");
          const agent = sdk.createAgent(name as string, description as string, image as string);

          for (const svc of (services as any[]) ?? []) {
            const serviceName = svc.name;
            if (serviceName === "MCP") {
              s?.message("Fetching MCP capabilities...");
              await agent.setMCP(svc.endpoint, svc.version);
            } else if (serviceName === "A2A") {
              s?.message("Fetching A2A capabilities...");
              await agent.setA2A(svc.endpoint, svc.version);
            } else if (serviceName === "ENS") {
              agent.setENS(svc.endpoint, svc.version);
            } else if (serviceName === "agentWallet") {
              agent.setWallet(svc.endpoint);
            } else if (serviceName === "DID" || serviceName === "OASF") {
              // DID and OASF don't have dedicated SDK setters
              if (!isJson) {
                log.info(`${serviceName} service will be stored in IPFS metadata`);
              }
            }
          }

          if (active !== undefined) agent.setActive(active as boolean);
          if (Array.isArray(supportedTrust) && supportedTrust.length > 0) {
            agent.setTrust(
              supportedTrust.includes("reputation"),
              supportedTrust.includes("crypto-economic"),
              supportedTrust.includes("tee-attestation"),
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

          // Get final balance and calculate cost
          const balanceAfter = await getBalance(signer, flags.network);
          const cost = balanceBefore - balanceAfter;

          console.log();
          console.log(formatRegistration({ hash: handle.hash, agentId }));
          console.log();
          
          // Cost breakdown
          if (cost > 0) {
            console.log(pc.dim(`Transaction cost: ${cost.toFixed(6)} SOL`));
            console.log(pc.dim(`Remaining balance: ${balanceAfter.toFixed(4)} SOL`));
            console.log();
          }

          // Explorer link
          const network = flags.network === "devnet" ? "devnet" : "mainnet-beta";
          const agentAddress = agentId?.split(':').pop();
          if (agentAddress) {
            console.log(pc.dim("View on Solana Explorer:"));
            console.log(pc.cyan(`  https://explorer.solana.com/address/${agentAddress}?cluster=${network}`));
            console.log();
          }

          // Next steps
          console.log(pc.dim("Next steps:"));
          console.log(pc.dim("  • Update info:"), pc.cyan("npx create-sati-agent publish"));
          console.log(pc.dim("  • Check status:"), pc.cyan("npx create-sati-agent status"));
          console.log(pc.dim("  • Discover others:"), pc.cyan("npx create-sati-agent discover"));
          console.log();
          
          outro(pc.green("Your agent identity is now on Solana"));
        }
      } catch (error) {
        s?.stop(pc.red(isUpdate ? "Update failed" : "Registration failed"));

        // Better error messages
        const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        if (errorMsg.includes("insufficient") || errorMsg.includes("balance")) {
          if (!isJson) {
            console.log();
            log.error("Insufficient SOL for transaction");
            console.log();
            if (flags.network === "devnet") {
              console.log(`  The automatic faucet may have failed or your balance is too low`);
              console.log(`  Try: https://faucet.solana.com`);
            } else {
              console.log(`  Send ~0.01 SOL to your wallet`);
              console.log(`  Check balance: solana balance ~/.config/solana/id.json`);
            }
            console.log();
          }
          process.exit(1);
        }

        if (errorMsg.includes("blockhash") || errorMsg.includes("timeout")) {
          if (!isJson) {
            console.log();
            log.error("Transaction timed out (blockhash expired)");
            console.log();
            console.log(pc.dim("This is common on Solana - transactions must land within ~60 seconds"));
            console.log(pc.dim("Just retry the publish command:"));
            console.log(pc.cyan(`  npx create-sati-agent publish --network ${flags.network}`));
            console.log();
          }
          process.exit(1);
        }

        throw error;
      }
    }
  },
});
