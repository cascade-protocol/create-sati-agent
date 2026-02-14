import { buildApplication, buildRouteMap } from "@stricli/core";
import { initCommand } from "./commands/init.js";
import { publishCommand } from "./commands/publish.js";
import { searchCommand } from "./commands/search.js";
import { infoCommand } from "./commands/info.js";
import { giveFeedbackCommand } from "./commands/give-feedback.js";
import { transferCommand } from "./commands/transfer.js";

const routes = buildRouteMap({
  routes: {
    init: initCommand,
    publish: publishCommand,
    search: searchCommand,
    info: infoCommand,
    "give-feedback": giveFeedbackCommand,
    transfer: transferCommand,
  },
  aliases: {
    register: "publish",
    discover: "search",
    feedback: "give-feedback",
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
