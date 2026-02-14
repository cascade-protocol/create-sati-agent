import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { REGISTRATION_FILE } from "../lib/config.js";

const TEMPLATE = {
  name: "MyAgent",
  description: "A helpful AI agent that does X, Y, and Z",
  image: "https://api.dicebear.com/9.x/bottts/svg?seed=MyAgent",
  services: [
    {
      name: "MCP",
      endpoint: "https://myagent.com/mcp",
    },
  ],
  active: true,
  x402Support: true,
  supportedTrust: ["reputation"],
};

const KEYPAIR_PATH = path.join(os.homedir(), ".config", "solana", "id.json");

export const initCommand = buildCommand({
  docs: {
    brief: "Initialize SATI agent (create keypair + template)",
  },
  parameters: {
    flags: {
      force: {
        kind: "boolean",
        brief: "Overwrite existing files",
        default: false,
      },
    },
    positional: { kind: "tuple", parameters: [] },
  },
  async func(flags) {
    // 1. Create keypair if missing
    const hasKeypair = fs.existsSync(KEYPAIR_PATH);
    let address = "";

    if (!hasKeypair) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
      const publicKeyBytes = publicKey.export({ type: "spki", format: "der" });
      const privateKeyBytes = privateKey.export({ type: "pkcs8", format: "der" });
      
      const seed = privateKeyBytes.subarray(16, 48);
      const pubKey = publicKeyBytes.subarray(12, 44);
      
      const fullKeypair = new Uint8Array(64);
      fullKeypair.set(seed, 0);
      fullKeypair.set(pubKey, 32);

      fs.mkdirSync(path.dirname(KEYPAIR_PATH), { recursive: true });
      fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(fullKeypair)), "utf-8");

      const signer = await createKeyPairSignerFromBytes(fullKeypair);
      address = signer.address;

      console.log(pc.green("✓ Created keypair"));
      console.log(pc.dim("  Path:"), KEYPAIR_PATH);
      console.log(pc.dim("  Address:"), address);
    } else {
      console.log(pc.dim("✓ Keypair exists:"), KEYPAIR_PATH);
    }

    console.log();

    // 2. Create template
    const filePath = `${process.cwd()}/${REGISTRATION_FILE}`;

    if (fs.existsSync(filePath) && !flags.force) {
      console.log(pc.yellow(`⚠ ${REGISTRATION_FILE} already exists`));
      console.log();
      console.log(pc.dim("Use --force to overwrite, or edit:"));
      console.log(pc.cyan(`  ${filePath}`));
      console.log();
      process.exit(1);
    }

    const content = JSON.stringify(TEMPLATE, null, 2);
    fs.writeFileSync(filePath, content, "utf-8");

    console.log(pc.green("✓ Created agent-registration.json"));
    console.log();
    console.log(pc.dim("Required fields:"));
    console.log(pc.dim("  • name: 1-32 characters"));
    console.log(pc.dim("  • description: 10-500 characters"));
    console.log(pc.dim("  • image: Valid URL (or use generated avatar)"));
    console.log();
    console.log(pc.dim("Optional fields:"));
    console.log(pc.dim("  • services: Array of {name, endpoint} objects"));
    console.log(pc.dim("  • x402Support: true if you implement x402"));
    console.log(pc.dim("  • supportedTrust: [\"reputation\", \"cryptoEconomic\", \"teeAttestation\"]"));
    console.log();
    console.log(pc.dim("Edit the file, then:"));
    console.log(pc.cyan("  npx create-sati-agent publish --network devnet"));
    console.log();
  },
});
