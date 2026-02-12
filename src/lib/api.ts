import type {
  RegisterRequest,
  RegisterResponse,
  AgentInfo,
  AgentListResponse,
  FeedbackRequest,
  FeedbackSubmitResponse,
  FeedbackListResponse,
  ReputationSummary,
} from "./types.js";

const DEFAULT_BASE_URL = "https://sati.cascade.fyi";

export class PaymentRequiredError extends Error {
  constructor(
    public readonly paymentHeaders: Record<string, string>,
    public readonly body: string,
  ) {
    super("Payment required ($0.30 USDC)");
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class SatiApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.SATI_API_URL ?? DEFAULT_BASE_URL;
  }

  // POST /api/register (x402 paywalled)
  async register(data: RegisterRequest, paymentHeader?: string): Promise<RegisterResponse> {
    const url = `${this.baseUrl}/api/register`;

    // Path 1: AgentWallet proxy
    const awUrl = process.env.AGENT_WALLET_URL;
    const awUsername = process.env.AGENT_WALLET_USERNAME;

    if (awUrl && awUsername) {
      const proxyUrl = `${awUrl}/api/wallets/${awUsername}/actions/x402/fetch`;
      const res = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          method: "POST",
          body: data,
          preferredChain: "solana",
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        throw new ApiError(res.status, (body.error as string) ?? "AgentWallet proxy request failed");
      }

      const json = (await res.json()) as Record<string, unknown>;
      const response = json.response as Record<string, unknown> | undefined;
      return (response?.body ?? json) as RegisterResponse;
    }

    // Path 2: Direct request with optional payment header
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (paymentHeader) {
      headers["X-PAYMENT"] = paymentHeader;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (res.status === 402) {
      const paymentHeaders: Record<string, string> = {};
      for (const [key, value] of res.headers.entries()) {
        paymentHeaders[key] = value;
      }
      throw new PaymentRequiredError(paymentHeaders, await res.text());
    }

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(res.status, (body.error as string) ?? `Request failed (${res.status})`);
    }

    return res.json() as Promise<RegisterResponse>;
  }

  // GET /api/agents
  async listAgents(opts?: {
    name?: string;
    owner?: string;
    limit?: number;
    network?: string;
  }): Promise<AgentListResponse> {
    const params = new URLSearchParams();
    params.set("network", opts?.network ?? "mainnet");
    if (opts?.name) params.set("name", opts.name);
    if (opts?.owner) params.set("owner", opts.owner);
    if (opts?.limit) params.set("limit", String(opts.limit));

    const res = await fetch(`${this.baseUrl}/api/agents?${params}`);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(res.status, (body.error as string) ?? "Failed to list agents");
    }

    return res.json() as Promise<AgentListResponse>;
  }

  // GET /api/agents/:mint
  async getAgent(mint: string, network = "mainnet"): Promise<AgentInfo> {
    const res = await fetch(`${this.baseUrl}/api/agents/${mint}?network=${network}`);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(res.status, (body.error as string) ?? "Failed to load agent");
    }

    return res.json() as Promise<AgentInfo>;
  }

  // POST /api/feedback
  async submitFeedback(data: FeedbackRequest): Promise<FeedbackSubmitResponse> {
    const res = await fetch(`${this.baseUrl}/api/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(res.status, (body.error as string) ?? "Failed to submit feedback");
    }

    return res.json() as Promise<FeedbackSubmitResponse>;
  }

  // GET /api/feedback/:mint
  async listFeedback(
    mint: string,
    opts?: {
      clientAddress?: string;
      tag1?: string;
      tag2?: string;
      network?: string;
    },
  ): Promise<FeedbackListResponse> {
    const params = new URLSearchParams();
    params.set("network", opts?.network ?? "mainnet");
    if (opts?.clientAddress) params.set("clientAddress", opts.clientAddress);
    if (opts?.tag1) params.set("tag1", opts.tag1);
    if (opts?.tag2) params.set("tag2", opts.tag2);

    const res = await fetch(`${this.baseUrl}/api/feedback/${mint}?${params}`);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(res.status, (body.error as string) ?? "Failed to list feedback");
    }

    return res.json() as Promise<FeedbackListResponse>;
  }

  // GET /api/reputation/:mint
  async getReputation(
    mint: string,
    opts?: {
      tag1?: string;
      tag2?: string;
      network?: string;
    },
  ): Promise<ReputationSummary> {
    const params = new URLSearchParams();
    params.set("network", opts?.network ?? "mainnet");
    if (opts?.tag1) params.set("tag1", opts.tag1);
    if (opts?.tag2) params.set("tag2", opts.tag2);

    const res = await fetch(`${this.baseUrl}/api/reputation/${mint}?${params}`);

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      throw new ApiError(res.status, (body.error as string) ?? "Failed to get reputation");
    }

    return res.json() as Promise<ReputationSummary>;
  }
}
