// Request types

export interface RegisterRequest {
  network?: "devnet" | "mainnet";
  ownerAddress: string;
  name: string;
  description: string;
  image: string;
  services?: ServiceEndpoint[];
  x402Support?: boolean;
  active?: boolean;
  supportedTrust?: string[];
  externalUrl?: string;
}

export interface ServiceEndpoint {
  name: string;
  endpoint: string;
  version?: string;
  mcpTools?: string[];
  mcpPrompts?: string[];
  mcpResources?: string[];
  a2aSkills?: string[];
  skills?: string[];
  domains?: string[];
}

export interface FeedbackRequest {
  network?: "devnet" | "mainnet";
  agentMint: string;
  value: number;
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  reviewerAddress?: string;
  feedbackURI?: string;
  feedbackHash?: string;
}

// Response types

export interface RegisterResponse {
  success: boolean;
  mint: string;
  agentId: string;
  memberNumber: number;
  signature: string;
  uri: string;
  registrations: Array<{ agentId: string; agentRegistry: string }>;
}

export interface AgentInfo {
  mint: string;
  agentId: string;
  owner: string;
  name: string;
  description: string;
  image: string;
  uri: string;
  memberNumber: number;
  active: boolean;
  services: ServiceEndpoint[];
  supportedTrust: string[];
  x402Support: boolean;
  reputation?: ReputationSummary;
  registrations?: Array<{ agentId: string; agentRegistry: string }>;
}

export interface AgentListResponse {
  agents: AgentInfo[];
  count: number;
}

export interface ReputationSummary {
  count: number;
  summaryValue: number;
  summaryValueDecimals: number;
}

export interface FeedbackItem {
  clientAddress: string;
  feedbackIndex: number;
  value: number;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  endpoint: string;
  reviewer: string;
  outcome: number;
  isRevoked: boolean;
}

export interface FeedbackListResponse {
  feedbacks: FeedbackItem[];
  count: number;
}

export interface FeedbackSubmitResponse {
  success: boolean;
  txSignature: string;
  attestationAddress: string;
}
