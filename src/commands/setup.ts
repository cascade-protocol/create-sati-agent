import { buildCommand } from "@stricli/core";
import { intro, outro, confirm, spinner, log, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generateKeyPair, createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";
import { address } from "@solana/addresses";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

interface SetupFlags {
  network: "devnet" | "mainnet";
}

const FAUCET_URL = "https://sati.cascade.fyi/api/faucet";
const KEYPAIR_PATH = path.join(os.homedir(), ".config", "solana", "id.json");

export const setupCommand = buildCommand({
  docs: {
    brief: "Set up Solana wallet for SATI",
  },
  parameters: {
    flags: {
      network: {
        kind: "enum",
        values: ["devnet", "mainnet"],
        brief: "Target network",
        default: "devnet",
      },
    },
    positional: { kind: "tuple", parameters: [] },
  },
  async func(flags: SetupFlags) {
    intro(pc.cyan("SATI Wallet Setup"));

    // Check if keypair already exists
    const hasKeypair = fs.existsSync(KEYPAIR_PATH);

    if (hasKeypair) {
      const useExisting = await confirm({
        message: `Keypair found at ${KEYPAIR_PATH}. Use it?`,
        initialValue: true,
      });

      if (isCancel(useExisting)) {
        cancel("Cancelled");
        process.exit(0);
      }

      if (!useExisting) {
        const confirmed = await confirm({
          message: "This will REPLACE your existing keypair. Continue?",
          initialValue: false,
        });

        if (isCancel(confirmed) || !confirmed) {
          cancel("Cancelled");
          process.exit(0);
        }
      } else {
        // Load and check existing keypair
        const data = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
        const keypair = await createKeyPairSignerFromBytes(new Uint8Array(data));

        await checkAndFund(keypair, flags.network);
        return;
      }
    }

    // Generate new keypair
    const s = spinner();
    s.start("Generating keypair...");

    const keypair = await generateKeyPair();
    const secretKey = Array.from(keypair.privateKey);

    // Create directory if needed
    fs.mkdirSync(path.dirname(KEYPAIR_PATH), { recursive: true });
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(secretKey), "utf-8");

    s.stop(pc.green("Keypair created!"));
    console.log();
    console.log(`  ${pc.dim("Path:")}    ${KEYPAIR_PATH}`);
    console.log(`  ${pc.dim("Address:")} ${keypair.address}`);
    console.log();

    await checkAndFund(keypair, flags.network);
  },
});

async function checkAndFund(keypair: KeyPairSigner, network: "devnet" | "mainnet") {
  const rpcUrl = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com";

  const connection = new Connection(rpcUrl, "confirmed");

  const s = spinner();
  s.start("Checking balance...");

  const publicKey = address(keypair.address);
  const balance = await connection.getBalance(publicKey);
  const sol = balance / LAMPORTS_PER_SOL;

  s.stop(`Balance: ${sol.toFixed(4)} SOL`);

  if (network === "devnet") {
    if (sol >= 0.005) {
      console.log();
      console.log(pc.green("✓ Wallet is funded and ready!"));
      console.log();
      outro(pc.dim("Next: npx create-sati-agent init"));
      return;
    }

    // Request from SATI faucet
    const s2 = spinner();
    s2.start("Requesting devnet SOL from SATI faucet...");

    try {
      const res = await fetch(FAUCET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: keypair.address, network: "devnet" }),
      });

      const result = (await res.json()) as { success?: boolean; error?: string; signature?: string };

      if (!res.ok || !result.success) {
        s2.stop(pc.red("Faucet request failed"));
        console.log();
        log.error(result.error || `HTTP ${res.status}`);
        console.log();
        console.log(pc.dim("Try public faucet: https://faucet.solana.com"));
        console.log();
        process.exit(1);
      }

      s2.stop(pc.green("Funded: 0.01 SOL"));
      console.log();
      console.log(`  ${pc.dim("Signature:")} ${result.signature}`);
      console.log();
      outro(pc.green("Ready! Next: npx create-sati-agent init"));
    } catch (error) {
      s2.stop(pc.red("Faucet request failed"));
      console.log();
      log.error(error instanceof Error ? error.message : String(error));
      console.log();
      console.log(pc.dim("Try public faucet: https://faucet.solana.com"));
      console.log();
      process.exit(1);
    }
  } else {
    // Mainnet - show funding instructions
    if (sol >= 0.005) {
      console.log();
      console.log(pc.green("✓ Wallet is funded and ready!"));
      console.log();
      outro(pc.dim("Next: npx create-sati-agent init"));
      return;
    }

    console.log();
    log.warn("Mainnet wallet needs funding");
    console.log();
    console.log(`  ${pc.bold("Send ~0.01 SOL to:")}`);
    console.log(`  ${pc.cyan(keypair.address)}`);
    console.log();
    console.log(`  ${pc.dim("Get SOL:")}`);
    console.log(`    • Buy on exchange (Coinbase, Binance)`);
    console.log(`    • Bridge from Ethereum (Portal Bridge)`);
    console.log();

    const waiting = await confirm({
      message: "Continue when funded?",
    });

    if (isCancel(waiting) || !waiting) {
      cancel("Cancelled");
      process.exit(0);
    }

    // Re-check balance
    await checkAndFund(keypair, network);
  }
}
