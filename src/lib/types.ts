/**
 * TypeScript interfaces for ERC-8004 registration file structure
 */

export interface ServiceDefinition {
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

export interface Registration {
  agentId: string;
  agentRegistry: string;
}

export interface RegistrationFile {
  type: string;
  name: string;
  description: string;
  image: string;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
  };
  services?: ServiceDefinition[];
  supportedTrust?: string[];
  active?: boolean;
  x402Support?: boolean;
  registrations?: Registration[];
}
