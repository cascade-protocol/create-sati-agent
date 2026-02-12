import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const AW_BASE_URL = "https://agentwallet.mcpay.tech";
const SATI_BASE_URL = "https://sati.cascade.fyi";

export interface AgentWalletConfig {
  username: string;
  apiToken: string;
  solanaAddress: string;
}

export function loadAgentWalletConfig(): AgentWalletConfig | null {
  const resolved = path.join(os.homedir(), ".agentwallet", "config.json");
  if (!fs.existsSync(resolved)) return null;

  try {
    const data = JSON.parse(fs.readFileSync(resolved, "utf-8"));
    if (!data.username || !data.apiToken || !data.solanaAddress) return null;
    return {
      username: data.username,
      apiToken: data.apiToken,
      solanaAddress: data.solanaAddress,
    };
  } catch {
    return null;
  }
}

export async function awRegisterAgent(
  config: AgentWalletConfig,
  data: {
    network: "devnet" | "mainnet";
    name: string;
    description: string;
    image: string;
    mcpEndpoint?: string;
    a2aEndpoint?: string;
  },
): Promise<{ hash: string; agentId?: string }> {
  const services: { name: string; endpoint: string; version?: string }[] = [];
  if (data.mcpEndpoint) {
    services.push({ name: "MCP", endpoint: data.mcpEndpoint, version: "2025-06-18" });
  }
  if (data.a2aEndpoint) {
    services.push({ name: "A2A", endpoint: data.a2aEndpoint });
  }

  const registerBody = {
    network: data.network,
    ownerAddress: config.solanaAddress,
    name: data.name,
    description: data.description,
    image: data.image,
    services: services.length > 0 ? services : undefined,
    active: true,
    supportedTrust: ["reputation"],
  };

  const proxyUrl = `${AW_BASE_URL}/api/wallets/${config.username}/actions/x402/fetch`;
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({
      url: `${SATI_BASE_URL}/api/register`,
      method: "POST",
      body: registerBody,
      preferredChain: "solana",
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error((body.error as string) ?? `AgentWallet request failed (${res.status})`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const response = json.response as Record<string, unknown> | undefined;
  const result = (response?.body ?? json) as Record<string, unknown>;
  return {
    hash: (result.signature as string) ?? "",
    agentId: result.agentId as string | undefined,
  };
}

export async function awSubmitFeedback(
  config: AgentWalletConfig,
  data: {
    network: "devnet" | "mainnet";
    agentMint: string;
    value: number;
    tag1?: string;
    tag2?: string;
    endpoint?: string;
  },
): Promise<{ txHash: string; attestationAddress: string }> {
  const res = await fetch(`${SATI_BASE_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      network: data.network,
      agentMint: data.agentMint,
      value: data.value,
      tag1: data.tag1,
      tag2: data.tag2,
      endpoint: data.endpoint,
      reviewerAddress: config.solanaAddress,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error((body.error as string) ?? `Feedback submission failed (${res.status})`);
  }

  const result = (await res.json()) as Record<string, unknown>;
  return {
    txHash: (result.txSignature as string) ?? "",
    attestationAddress: (result.attestationAddress as string) ?? "",
  };
}
