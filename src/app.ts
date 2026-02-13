import { buildApplication, buildRouteMap } from "@stricli/core";
import { setupCommand } from "./commands/setup.js";
import { publishCommand } from "./commands/publish.js";
import { statusCommand } from "./commands/status.js";
import { discoverCommand } from "./commands/discover.js";
import { infoCommand } from "./commands/info.js";
import { feedbackCommand } from "./commands/feedback.js";
import { reputationCommand } from "./commands/reputation.js";
import { transferCommand } from "./commands/transfer.js";

const routes = buildRouteMap({
  routes: {
    setup: setupCommand,
    publish: publishCommand,
    status: statusCommand,
    discover: discoverCommand,
    info: infoCommand,
    feedback: feedbackCommand,
    reputation: reputationCommand,
    transfer: transferCommand,
  },
  defaultCommand: "status",
  aliases: {
    register: "publish",
  },
  docs: {
    brief: "On-chain identity for AI agents on Solana",
  },
});

export const app = buildApplication(routes, {
  name: "create-sati-agent",
  versionInfo: {
    currentVersion: "0.2.1",
  },
  scanner: {
    caseStyle: "allow-kebab-for-camel",
  },
});
