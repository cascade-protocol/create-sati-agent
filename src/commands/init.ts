import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import fs from "node:fs";
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

export const initCommand = buildCommand({
  docs: {
    brief: "Create agent-registration.json template",
  },
  parameters: {
    flags: {
      force: {
        kind: "boolean",
        brief: "Overwrite existing file",
        default: false,
      },
    },
    positional: { kind: "tuple", parameters: [] },
  },
  async func(flags) {
    const filePath = `${process.cwd()}/${REGISTRATION_FILE}`;

    // Check if file already exists
    if (fs.existsSync(filePath) && !flags.force) {
      console.log(pc.yellow(`⚠ ${REGISTRATION_FILE} already exists`));
      console.log();
      console.log(pc.dim(`Use --force to overwrite, or edit the existing file:`));
      console.log(pc.cyan(`  ${filePath}`));
      console.log();
      process.exit(1);
    }

    // Write template
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
    console.log(pc.dim("  • active: false to mark as inactive"));
    console.log();
    console.log(pc.dim("Edit:"));
    console.log(pc.cyan(`  ${filePath}`));
    console.log();
    console.log(pc.dim("Validate:"));
    console.log(pc.cyan("  npx create-sati-agent validate"));
    console.log();
    console.log(pc.dim("Publish:"));
    console.log(pc.cyan("  npx create-sati-agent publish --network devnet"));
    console.log();
  },
});
