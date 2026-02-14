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
  description:
    "A helpful AI agent that does X, Y, and Z. Explain what your agent does, how it works, and what problems it solves.",
  image: "https://api.dicebear.com/9.x/bottts/svg?seed=MyAgent",
  properties: {
    files: [
      {
        uri: "https://api.dicebear.com/9.x/bottts/svg?seed=MyAgent",
        type: "image/svg+xml",
      },
    ],
    category: "image",
  },
  services: [
    {
      name: "MCP",
      endpoint: "https://myagent.com/mcp",
      version: "2025-06-18",
      mcpTools: [],
    },
  ],
  supportedTrust: ["reputation"],
  active: false,
  x402Support: false,
  registrations: [],
};

const KEYPAIR_PATH = path.join(os.homedir(), ".config", "solana", "id.json");

interface InitFlags {
  force: boolean;
}

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
  async func(flags: InitFlags) {
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
      // Issue #1: Create keypair with owner-only permissions (0o600)
      fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(fullKeypair)), {
        mode: 0o600,
        encoding: "utf-8",
      });

      const signer = await createKeyPairSignerFromBytes(fullKeypair);
      address = signer.address;

      console.log(pc.green("✓ Created new Solana keypair"));
      console.log(pc.dim("  Location:"), KEYPAIR_PATH);
      console.log(pc.dim("  Address:"), address);
      console.log();
      console.log(pc.yellow("⚠️  Keep this keypair file safe - it controls your agent"));
    } else {
      // Issue #9: Warn about reusing existing keypair
      if (!flags.force) {
        console.log(pc.yellow(`⚠️  Keypair already exists at ${KEYPAIR_PATH}`));
        console.log();
        console.log(pc.dim("Using existing keypair. To create a new one:"));
        console.log(pc.cyan("  npx create-sati-agent init --force"));
        console.log();
      } else {
        console.log(pc.dim("✓ Using existing keypair:"), KEYPAIR_PATH);
      }
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
    console.log(pc.dim("Edit the file with your agent details:"));
    console.log(pc.cyan(`  ${filePath}`));
    console.log();
    console.log(pc.dim("📖 Template with comprehensive comments & examples:"));
    console.log(pc.cyan("   node_modules/create-sati-agent/dist/templates/agent-registration.jsonc"));
    console.log();
    console.log(pc.dim("📚 Documentation & guides:"));
    console.log(pc.cyan("   • Best Practices: https://github.com/erc-8004/best-practices"));
    console.log(
      pc.cyan("   • Registration Guide: https://github.com/erc-8004/best-practices/blob/main/Registration.md"),
    );
    console.log(pc.cyan("   • OASF Skills/Domains: https://schema.oasf.outshift.com/0.8.0"));
    console.log();
    console.log(pc.dim("💡 Tip: The template file has detailed comments for every field,"));
    console.log(pc.dim("   including service-specific options (mcpTools, a2aSkills, OASF)"));
    console.log();
    console.log(pc.dim("Next steps:"));
    console.log(pc.dim("  1. Edit agent-registration.json with your agent details"));
    console.log(pc.dim("  2. Validate before publishing (optional):"));
    console.log(pc.cyan("     npx create-sati-agent publish --dry-run --network devnet"));
    console.log(pc.dim("  3. Publish to devnet:"));
    console.log(pc.cyan("     npx create-sati-agent publish --network devnet"));
    console.log();
  },
});
