import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import { findRegistrationFile, readRegistrationFile } from "../lib/config.js";
import { validateERC8004RegistrationFile } from "../lib/erc8004-validation.js";

export const validateCommand = buildCommand({
  docs: {
    brief: "Validate agent-registration.json against ERC-8004 spec",
  },
  parameters: {
    flags: {},
    positional: { kind: "tuple", parameters: [] },
  },
  async func() {
    // Find registration file
    const filePath = findRegistrationFile();
    if (!filePath) {
      console.log(pc.red("✗ agent-registration.json not found"));
      console.log();
      console.log(pc.dim("Run: npx create-sati-agent init"));
      console.log();
      process.exit(1);
    }

    console.log(pc.cyan("Validating agent-registration.json..."));
    console.log();

    // Load and validate
    try {
      const data = readRegistrationFile(filePath);
      const errors = validateERC8004RegistrationFile(data);

      if (errors.length > 0) {
        console.log(pc.red("✗ Validation failed:"));
        console.log();
        for (const error of errors) {
          console.log(pc.red(`  • ${error.field}: ${error.message}`));
        }
        console.log();
        console.log(pc.dim("📖 ERC-8004 spec: https://eips.ethereum.org/EIPS/eip-8004"));
        console.log();
        process.exit(1);
      }

      // Type assertion for accessing properties safely
      const file = data as Record<string, unknown>;

      console.log(pc.green("✓ Valid ERC-8004 agent registration"));
      console.log();
      console.log(pc.dim("Agent details:"));
      console.log(pc.dim(`  Name: ${file.name}`));
      if (typeof file.description === 'string') {
        const desc = file.description.length > 60 ? file.description.slice(0, 60) + '...' : file.description;
        console.log(pc.dim(`  Description: ${desc}`));
      }
      if (Array.isArray(file.services) && file.services.length > 0) {
        console.log(pc.dim(`  Services: ${file.services.length} endpoint(s)`));
      }
      console.log();
      console.log(pc.dim("Ready to publish:"));
      console.log(pc.cyan("  npx create-sati-agent publish --network devnet"));
      console.log();
    } catch (error) {
      console.log(pc.red("✗ Failed to load file:"));
      console.log(pc.red(`  ${error instanceof Error ? error.message : String(error)}`));
      console.log();
      process.exit(1);
    }
  },
});
