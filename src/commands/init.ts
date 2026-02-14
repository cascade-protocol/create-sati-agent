import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { REGISTRATION_FILE } from "../lib/config.js";

const TEMPLATE = {
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  name: "MyAgent",
  description: "A helpful AI agent that does X, Y, and Z. Explain what your agent does, how it works, and what problems it solves.",
  image: "https://api.dicebear.com/9.x/bottts/svg?seed=MyAgent",
  services: [
    {
      name: "MCP",
      endpoint: "https://myagent.com/mcp",
      version: "2025-06-18",
      mcpTools: []
    }
  ],
  supportedTrust: ["reputation"],
  active: true,
  x402Support: true
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
    console.log(pc.dim("  • type: ERC-8004 spec URL (don't change)"));
    console.log(pc.dim("  • name: Clear, memorable agent name"));
    console.log(pc.dim("  • description: What your agent does, how it works, what problems it solves"));
    console.log(pc.dim("  • image: High-quality PNG/SVG/WebP URL"));
    console.log();
    console.log(pc.dim("Service types (add to services array):"));
    console.log(pc.dim("  • MCP - Model Context Protocol (mcpTools array)"));
    console.log(pc.dim("  • A2A - Agent-to-Agent protocol (a2aSkills array)"));
    console.log(pc.dim("  • OASF - Skills & domains taxonomy (skills, domains arrays)"));
    console.log(pc.dim("  • ENS - Ethereum Name Service"));
    console.log(pc.dim("  • DID - Decentralized Identifier"));
    console.log(pc.dim("  • agentWallet - Payment address (eip155:chainId:address)"));
    console.log();
    console.log(pc.dim("Trust models: reputation, crypto-economic, tee-attestation"));
    console.log();
    console.log(pc.dim("Next steps:"));
    console.log(pc.dim("  1. Edit agent-registration.json with your agent details"));
    console.log(pc.dim("  2. Run validation (optional):"));
    console.log(pc.cyan("     npx create-sati-agent validate"));
    console.log(pc.dim("  3. Publish to devnet:"));
    console.log(pc.cyan("     npx create-sati-agent publish --network devnet"));
    console.log();
  },
});
