import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import { findRegistrationFile, readRegistrationFile } from "../lib/config.js";
import { AgentRegistrationSchema } from "../lib/validation.js";

export const validateCommand = buildCommand({
  docs: {
    brief: "Validate agent-registration.json against schema",
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
      const result = AgentRegistrationSchema.safeParse(data);

      if (!result.success) {
        console.log(pc.red("✗ Validation failed:"));
        console.log();
        for (const error of result.error.errors) {
          console.log(pc.red(`  • ${error.path.join(".")}: ${error.message}`));
        }
        console.log();
        process.exit(1);
      }

      console.log(pc.green("✓ Valid agent registration"));
      console.log();
      console.log(pc.dim("Agent details:"));
      console.log(pc.dim(`  Name: ${result.data.name}`));
      console.log(pc.dim(`  Description: ${result.data.description.slice(0, 60)}...`));
      if (result.data.services?.length) {
        console.log(pc.dim(`  Services: ${result.data.services.length} endpoint(s)`));
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
