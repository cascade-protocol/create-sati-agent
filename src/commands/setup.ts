import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createKeyPairSignerFromBytes } from "@solana/kit";

const KEYPAIR_PATH = path.join(os.homedir(), ".config", "solana", "id.json");

export const setupCommand = buildCommand({
  docs: {
    brief: "Create Solana keypair at ~/.config/solana/id.json",
  },
  parameters: {
    flags: {
      force: {
        kind: "boolean",
        brief: "Overwrite existing keypair",
        default: false,
      },
    },
    positional: { kind: "tuple", parameters: [] },
  },
  async func(flags) {
    // Check if keypair already exists
    if (fs.existsSync(KEYPAIR_PATH)) {
      if (!flags.force) {
        console.log(pc.yellow("⚠ Keypair already exists"));
        console.log();
        console.log(pc.dim("Path:"), KEYPAIR_PATH);
        console.log();
        console.log(pc.dim("Use --force to overwrite"));
        console.log();
        process.exit(1);
      }
    }

    // Generate Ed25519 keypair
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    
    // Export to raw format
    const publicKeyBytes = publicKey.export({ type: "spki", format: "der" });
    const privateKeyBytes = privateKey.export({ type: "pkcs8", format: "der" });
    
    // Extract actual key bytes from DER format
    // PKCS#8 private key: seed is at bytes 16-48
    // SPKI public key: key is at bytes 12-44
    const seed = privateKeyBytes.subarray(16, 48);
    const pubKey = publicKeyBytes.subarray(12, 44);
    
    // Solana keypair format: 64 bytes = [32-byte seed, 32-byte public key]
    const fullKeypair = new Uint8Array(64);
    fullKeypair.set(seed, 0);
    fullKeypair.set(pubKey, 32);
    const secretKey = Array.from(fullKeypair);

    // Create directory if needed
    fs.mkdirSync(path.dirname(KEYPAIR_PATH), { recursive: true });
    fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(secretKey), "utf-8");

    // Create signer to get address
    const signer = await createKeyPairSignerFromBytes(fullKeypair);

    console.log(pc.green("✓ Keypair created"));
    console.log();
    console.log(pc.dim("Path:"), KEYPAIR_PATH);
    console.log(pc.dim("Address:"), signer.address);
    console.log();
    console.log(pc.dim("Next steps:"));
    console.log(pc.cyan("  npx create-sati-agent init"));
    console.log(pc.dim("  # Edit agent-registration.json"));
    console.log(pc.cyan("  npx create-sati-agent publish --network devnet"));
    console.log();
  },
});
