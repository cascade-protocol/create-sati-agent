import pc from "picocolors";
import type { AgentInfo, ReputationSummary, FeedbackItem } from "./types.js";

export function truncateAddress(addr: string, len = 4): string {
  if (addr.length <= len * 2 + 3) return addr;
  return `${addr.slice(0, len)}...${addr.slice(-len)}`;
}

export function formatAgent(agent: AgentInfo): string {
  const lines: string[] = [];

  lines.push(`${pc.bold(agent.name)} ${pc.dim(`#${agent.memberNumber}`)}`);
  lines.push(`  ${pc.dim("Mint:")}    ${pc.cyan(agent.mint)}`);
  lines.push(`  ${pc.dim("Owner:")}   ${agent.owner}`);
  lines.push(`  ${pc.dim("Status:")}  ${agent.active ? pc.green("active") : pc.red("inactive")}`);

  if (agent.description) {
    lines.push(`  ${pc.dim("About:")}   ${agent.description}`);
  }

  if (agent.services?.length) {
    const serviceNames = agent.services.map((s) => s.name).join(", ");
    lines.push(`  ${pc.dim("Services:")} ${serviceNames}`);
    for (const svc of agent.services) {
      lines.push(
        `    ${pc.dim("-")} ${svc.name}: ${pc.blue(svc.endpoint)}${svc.version ? pc.dim(` v${svc.version}`) : ""}`,
      );
    }
  }

  if (agent.reputation) {
    lines.push("");
    lines.push(`  ${pc.dim("Reputation:")}`);
    lines.push(`    ${formatReputation(agent.reputation)}`);
  }

  if (agent.uri) {
    lines.push(`  ${pc.dim("URI:")}    ${agent.uri}`);
  }

  return lines.join("\n");
}

export function formatAgentList(agents: AgentInfo[]): string {
  if (agents.length === 0) return pc.dim("  No agents found");

  const lines: string[] = [];

  for (const [i, agent] of agents.entries()) {
    const num = pc.dim(`${String(i + 1).padStart(3)}.`);
    const name = pc.bold(agent.name);
    const mint = pc.cyan(truncateAddress(agent.mint, 6));
    const owner = truncateAddress(agent.owner, 4);
    const services = agent.services?.length ? agent.services.map((s) => s.name).join(", ") : pc.dim("none");

    lines.push(`${num} ${name}`);
    lines.push(`     ${pc.dim("Mint:")} ${mint}  ${pc.dim("Owner:")} ${owner}  ${pc.dim("Services:")} ${services}`);
    if (agent.description) {
      const desc = agent.description.length > 80 ? `${agent.description.slice(0, 77)}...` : agent.description;
      lines.push(`     ${pc.dim(desc)}`);
    }
  }

  return lines.join("\n");
}

export function formatReputation(rep: ReputationSummary): string {
  if (rep.count === 0) return pc.dim("No feedback yet");
  return `${pc.bold(String(rep.summaryValue))}/100 from ${rep.count} review${rep.count === 1 ? "" : "s"}`;
}

export function formatFeedbackList(items: FeedbackItem[]): string {
  if (items.length === 0) return pc.dim("  No feedback found");

  const lines: string[] = [];

  for (const fb of items) {
    const tag = fb.tag1 ? pc.yellow(fb.tag1) : pc.dim("untagged");
    const value = pc.bold(String(fb.value));
    const reviewer = fb.reviewer ? truncateAddress(fb.reviewer, 4) : pc.dim("anonymous");

    lines.push(`  ${tag} ${value}  ${pc.dim("by")} ${reviewer}`);
  }

  return lines.join("\n");
}

export function formatRegistration(result: {
  mint: string;
  agentId: string;
  memberNumber: number;
  signature: string;
  uri: string;
}): string {
  const lines: string[] = [];
  lines.push(`  ${pc.dim("Mint:")}     ${pc.green(result.mint)}`);
  lines.push(`  ${pc.dim("Agent ID:")} ${result.agentId}`);
  lines.push(`  ${pc.dim("Member:")}   #${result.memberNumber}`);
  lines.push(`  ${pc.dim("IPFS:")}     ${result.uri}`);
  lines.push(`  ${pc.dim("Tx:")}       ${result.signature}`);
  return lines.join("\n");
}
