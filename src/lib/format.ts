import pc from "picocolors";
import type { AgentSummary, Feedback } from "@cascade-fyi/sati-agent0-sdk";

export function truncateAddress(addr: string, len = 4): string {
  if (addr.length <= len * 2 + 3) return addr;
  return `${addr.slice(0, len)}...${addr.slice(-len)}`;
}

export function formatAgent(agent: AgentSummary): string {
  const lines: string[] = [];

  lines.push(pc.bold(agent.name));
  lines.push(`  ${pc.dim("Agent ID:")} ${pc.cyan(agent.agentId)}`);
  lines.push(`  ${pc.dim("Owner:")}    ${agent.owners[0] ?? "unknown"}`);
  lines.push(`  ${pc.dim("Status:")}   ${agent.active ? pc.green("active") : pc.red("inactive")}`);

  if (agent.description) {
    lines.push(`  ${pc.dim("About:")}    ${agent.description}`);
  }

  if (agent.mcp) {
    lines.push(`  ${pc.dim("MCP:")}      ${pc.blue(agent.mcp)}`);
  }
  if (agent.a2a) {
    lines.push(`  ${pc.dim("A2A:")}      ${pc.blue(agent.a2a)}`);
  }
  if (agent.web) {
    lines.push(`  ${pc.dim("Web:")}      ${pc.blue(agent.web)}`);
  }

  if (agent.feedbackCount !== undefined && agent.feedbackCount > 0) {
    lines.push("");
    lines.push(`  ${pc.dim("Reputation:")}`);
    lines.push(`    ${formatReputation({ count: agent.feedbackCount, averageValue: agent.averageValue ?? 0 })}`);
  }

  if (agent.agentURI) {
    lines.push(`  ${pc.dim("URI:")}      ${agent.agentURI}`);
  }

  return lines.join("\n");
}

export function formatAgentList(agents: AgentSummary[]): string {
  if (agents.length === 0) return pc.dim("  No agents found");

  const lines: string[] = [];

  for (const [i, agent] of agents.entries()) {
    const num = pc.dim(`${String(i + 1).padStart(3)}.`);
    const name = pc.bold(agent.name);
    const owner = agent.owners[0] ? truncateAddress(agent.owners[0], 4) : pc.dim("unknown");

    const endpoints: string[] = [];
    if (agent.mcp) endpoints.push("MCP");
    if (agent.a2a) endpoints.push("A2A");
    if (agent.web) endpoints.push("Web");
    const services = endpoints.length > 0 ? endpoints.join(", ") : pc.dim("none");

    lines.push(`${num} ${name}`);
    lines.push(`     ${pc.dim("Owner:")} ${owner}  ${pc.dim("Services:")} ${services}`);
    if (agent.description) {
      const desc = agent.description.length > 80 ? `${agent.description.slice(0, 77)}...` : agent.description;
      lines.push(`     ${pc.dim(desc)}`);
    }
  }

  return lines.join("\n");
}

export function formatReputation(rep: { count: number; averageValue: number }): string {
  if (rep.count === 0) return pc.dim("No feedback yet");
  return `${pc.bold(String(Math.round(rep.averageValue)))}/100 from ${rep.count} review${rep.count === 1 ? "" : "s"}`;
}

export function formatFeedbackList(items: Feedback[]): string {
  if (items.length === 0) return pc.dim("  No feedback found");

  const lines: string[] = [];

  for (const fb of items) {
    const tag = fb.tags[0] ? pc.yellow(fb.tags[0]) : pc.dim("untagged");
    const value = fb.value !== undefined ? pc.bold(String(fb.value)) : pc.dim("--");
    const reviewer = fb.reviewer ? truncateAddress(fb.reviewer, 4) : pc.dim("anonymous");
    
    // Format timestamp if available
    let timestamp = "";
    if (fb.timestamp) {
      const date = new Date(fb.timestamp * 1000);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        timestamp = pc.dim("today");
      } else if (diffDays === 1) {
        timestamp = pc.dim("yesterday");
      } else if (diffDays < 7) {
        timestamp = pc.dim(`${diffDays}d ago`);
      } else {
        timestamp = pc.dim(date.toLocaleDateString());
      }
    }

    const tagInfo = fb.tags.length > 1 ? pc.dim(` (${fb.tags.slice(1).join(", ")})`) : "";
    lines.push(`  ${tag}${tagInfo} ${value}  ${pc.dim("by")} ${reviewer}  ${timestamp}`);
  }

  return lines.join("\n");
}

export function formatRegistration(result: { hash: string; agentId?: string }): string {
  const lines: string[] = [];
  if (result.agentId) {
    lines.push(`  ${pc.dim("Agent ID:")} ${pc.green(result.agentId)}`);
  }
  lines.push(`  ${pc.dim("Tx:")}       ${result.hash}`);
  return lines.join("\n");
}
