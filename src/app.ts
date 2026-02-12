import { buildApplication, buildRouteMap } from "@stricli/core";
import { registerCommand } from "./commands/register.js";
import { discoverCommand } from "./commands/discover.js";
import { infoCommand } from "./commands/info.js";
import { feedbackCommand } from "./commands/feedback.js";
import { reputationCommand } from "./commands/reputation.js";

const routes = buildRouteMap({
  routes: {
    register: registerCommand,
    discover: discoverCommand,
    info: infoCommand,
    feedback: feedbackCommand,
    reputation: reputationCommand,
  },
  docs: {
    brief: "On-chain identity for AI agents on Solana",
  },
});

export const app = buildApplication(routes, {
  name: "create-sati-agent",
  versionInfo: {
    currentVersion: "0.1.0",
  },
  scanner: {
    caseStyle: "allow-kebab-for-camel",
  },
});
