import { buildCommand } from "@stricli/core";
import { intro, outro, text, confirm, isCancel, cancel, log } from "@clack/prompts";
import pc from "picocolors";
import { findRegistrationFile, writeRegistrationFile, REGISTRATION_FILE } from "../lib/config.js";

export const initCommand = buildCommand({
  docs: {
    brief: "Create agent-registration.json interactively",
  },
  parameters: {
    flags: {},
    positional: { kind: "tuple", parameters: [] },
  },
  async func() {
    intro(pc.cyan("Create Agent Registration"));

    // Check if file already exists
    const existing = findRegistrationFile();
    if (existing) {
      const overwrite = await confirm({
        message: `${REGISTRATION_FILE} already exists. Overwrite?`,
        initialValue: false,
      });

      if (isCancel(overwrite) || !overwrite) {
        cancel("Cancelled");
        process.exit(0);
      }
    }

    // Collect agent info
    const name = await text({
      message: "Agent name:",
      placeholder: "WeatherBot",
      validate: (v) => {
        if (v.length < 1) return "Name is required";
        if (v.length > 32) return "Name must be 32 characters or less";
      },
    });
    if (isCancel(name)) {
      cancel("Cancelled");
      process.exit(0);
    }

    const description = await text({
      message: "Description (what does your agent do?):",
      placeholder: "Provides weather forecasts and climate data",
      validate: (v) => {
        if (v.length < 10) return "Description must be at least 10 characters";
        if (v.length > 500) return "Description must be 500 characters or less";
      },
    });
    if (isCancel(description)) {
      cancel("Cancelled");
      process.exit(0);
    }

    const hasImage = await confirm({
      message: "Do you have an avatar image URL?",
      initialValue: false,
    });
    if (isCancel(hasImage)) {
      cancel("Cancelled");
      process.exit(0);
    }

    let image: string | undefined;
    if (hasImage) {
      const imageUrl = await text({
        message: "Image URL:",
        placeholder: "https://example.com/avatar.png",
        validate: (v) => {
          try {
            new URL(v);
            return undefined;
          } catch {
            return "Must be a valid URL";
          }
        },
      });
      if (isCancel(imageUrl)) {
        cancel("Cancelled");
        process.exit(0);
      }
      image = imageUrl;
    } else {
      image = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(name)}`;
      console.log();
      log.info(`Using generated avatar: ${pc.dim(image)}`);
    }

    // Services (simplified for now - just ask yes/no for MCP)
    const hasMcp = await confirm({
      message: "Do you have an MCP endpoint?",
      initialValue: false,
    });
    if (isCancel(hasMcp)) {
      cancel("Cancelled");
      process.exit(0);
    }

    const services: Array<{ name: string; endpoint: string }> = [];

    if (hasMcp) {
      const mcpUrl = await text({
        message: "MCP endpoint URL:",
        placeholder: "https://myagent.com/mcp",
        validate: (v) => {
          try {
            new URL(v);
            return undefined;
          } catch {
            return "Must be a valid URL";
          }
        },
      });
      if (isCancel(mcpUrl)) {
        cancel("Cancelled");
        process.exit(0);
      }
      services.push({ name: "MCP", endpoint: mcpUrl });
    }

    // Write file
    const data = {
      name,
      description,
      image,
      ...(services.length > 0 && { services }),
      active: true,
      supportedTrust: ["reputation"],
    };

    const filePath = `${process.cwd()}/${REGISTRATION_FILE}`;
    writeRegistrationFile(filePath, data);

    console.log();
    log.success(`Created ${REGISTRATION_FILE}`);
    console.log();
    console.log(pc.dim(JSON.stringify(data, null, 2)));
    console.log();
    outro(pc.green("Ready! Next: npx create-sati-agent publish --network devnet"));
  },
});
