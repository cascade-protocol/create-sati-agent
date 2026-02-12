import { buildCommand } from "@stricli/core";
import pc from "picocolors";
import { findRegistrationFile, readRegistrationFile, REGISTRATION_FILE } from "../lib/config.js";

export const statusCommand = buildCommand({
  docs: {
    brief: "Show agent status and setup instructions",
  },
  parameters: {
    flags: {},
    positional: { kind: "tuple", parameters: [] },
  },
  async func() {
    const filePath = findRegistrationFile();

    if (!filePath) {
      printInstructions();
      return;
    }

    // File exists - show status
    const data = readRegistrationFile(filePath);
    const name = data.name as string | undefined;
    const description = data.description as string | undefined;
    const registrations = data.registrations as Array<{ agentId: string; agentRegistry: string }> | undefined;
    const endpoints = (data.services ?? data.endpoints) as Array<{ name: string; endpoint: string }> | undefined;
    const active = data.active as boolean | undefined;

    const isRegistered = registrations && registrations.length > 0;
    const satiReg = registrations?.find(
      (r) => typeof r.agentRegistry === "string" && r.agentRegistry.startsWith("solana:"),
    );

    console.log();
    console.log(pc.bold("  SATI Agent Identity"));
    console.log();
    console.log(`  ${pc.dim("File:")}    ${filePath}`);
    console.log(`  ${pc.dim("Name:")}    ${name ?? pc.yellow("not set")}`);
    if (description) {
      const truncated = description.length > 80 ? `${description.slice(0, 77)}...` : description;
      console.log(`  ${pc.dim("About:")}   ${truncated}`);
    }
    console.log(
      `  ${pc.dim("Status:")}  ${isRegistered ? pc.green("registered on-chain") : pc.yellow("not published yet")}`,
    );
    if (satiReg) {
      console.log(`  ${pc.dim("Mint:")}    ${satiReg.agentId}`);
    }
    if (active !== undefined) {
      console.log(`  ${pc.dim("Active:")}  ${active ? pc.green("yes") : pc.dim("no")}`);
    }
    if (endpoints?.length) {
      console.log(`  ${pc.dim("Services:")}`);
      for (const ep of endpoints) {
        console.log(`    ${pc.cyan(ep.name)} ${pc.dim(ep.endpoint)}`);
      }
    }

    console.log();
    if (!isRegistered) {
      console.log(
        `  ${pc.dim("Next step:")} Run ${pc.cyan("create-sati-agent publish --network devnet")} to register on-chain`,
      );
    } else {
      console.log(
        `  ${pc.dim("To update:")} Edit ${REGISTRATION_FILE}, then run ${pc.cyan("create-sati-agent publish --network devnet")}`,
      );
    }
    console.log();
  },
});

function printInstructions() {
  console.log();
  console.log(pc.bold("  SATI - On-chain Identity for AI Agents"));
  console.log();
  console.log(`  No ${pc.cyan(REGISTRATION_FILE)} found in this project.`);
  console.log();
  console.log(pc.bold("  Quick Start"));
  console.log();
  console.log(`  1. Create ${pc.cyan(REGISTRATION_FILE)} in your project root:`);
  console.log();
  console.log(pc.dim("  {"));
  console.log(pc.dim('    "name": "MyAgent",'));
  console.log(pc.dim('    "description": "What your agent does",'));
  console.log(pc.dim('    "image": "https://example.com/avatar.png",'));
  console.log(pc.dim('    "services": ['));
  console.log(pc.dim('      { "name": "MCP", "endpoint": "https://your-mcp-server.com" },'));
  console.log(pc.dim('      { "name": "A2A", "endpoint": "https://your-a2a-server.com/.well-known/agent-card.json" }'));
  console.log(pc.dim("    ],"));
  console.log(pc.dim('    "active": true,'));
  console.log(pc.dim('    "supportedTrust": ["reputation"]'));
  console.log(pc.dim("  }"));
  console.log();
  console.log(`  2. Publish on-chain:`);
  console.log();
  console.log(`     ${pc.cyan("create-sati-agent publish --network devnet")}`);
  console.log();
  console.log(`  This uploads your registration to IPFS, mints an agent NFT on Solana,`);
  console.log(`  and writes the ${pc.cyan("registrations")} link back into your file.`);
  console.log();
  console.log(`  After publishing, commit ${pc.cyan(REGISTRATION_FILE)} to your repo.`);
  console.log(`  Other agents can discover your identity through GitHub search.`);
  console.log(`  Serve it at ${pc.cyan(".well-known/agent-registration.json")} for endpoint verification.`);
  console.log();
  console.log(pc.bold("  Other Commands"));
  console.log();
  console.log(`  ${pc.cyan("create-sati-agent discover")}          Search registered agents`);
  console.log(`  ${pc.cyan("create-sati-agent info <mint>")}       Get agent details`);
  console.log(`  ${pc.cyan("create-sati-agent reputation <mint>")} Check reputation score`);
  console.log(`  ${pc.cyan("create-sati-agent feedback")}          Give on-chain feedback`);
  console.log(`  ${pc.cyan("create-sati-agent transfer <mint>")}   Transfer agent ownership`);
  console.log();
}
