/**
 * ERC-8004 Registration File Validation
 * Spec: https://eips.ethereum.org/EIPS/eip-8004
 * Best Practices: https://github.com/erc-8004/best-practices
 */

export interface ValidationError {
  field: string;
  message: string;
}

const KNOWN_SERVICE_TYPES = ["MCP", "A2A", "OASF", "ENS", "DID", "agentWallet"];
const VALID_TRUST_MODELS = ["reputation", "crypto-economic", "tee-attestation"];

const ERC8004_SPEC_URL = "https://eips.ethereum.org/EIPS/eip-8004#registration-v1";

/**
 * Validate ERC-8004 registration file format.
 * Returns array of validation errors (empty if valid).
 */
export function validateERC8004RegistrationFile(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof data !== "object" || data === null) {
    return [{ field: "root", message: "Must be an object" }];
  }

  const file = data as Record<string, unknown>;

  // Required: type field
  if (file.type !== ERC8004_SPEC_URL) {
    errors.push({
      field: "type",
      message: `Must be "${ERC8004_SPEC_URL}"`,
    });
  }

  // Required: name
  if (typeof file.name !== "string" || file.name.length === 0) {
    errors.push({ field: "name", message: "Required, must be a non-empty string" });
  } else if (file.name.length > 32) {
    errors.push({ field: "name", message: "Should be 32 characters or less (recommended)" });
  }

  // Required: description
  if (typeof file.description !== "string" || file.description.length === 0) {
    errors.push({ field: "description", message: "Required, must be a non-empty string" });
  } else if (file.description.length < 10) {
    errors.push({ field: "description", message: "Should be at least 10 characters (explain what your agent does)" });
  }

  // Required: image
  if (typeof file.image !== "string" || file.image.length === 0) {
    errors.push({ field: "image", message: "Required, must be a URL" });
  } else {
    try {
      new URL(file.image);
    } catch {
      errors.push({ field: "image", message: "Must be a valid URL" });
    }
  }

  // Optional: properties (Metaplex/Solana NFT standard - recommended for wallet display)
  if (file.properties !== undefined) {
    if (typeof file.properties !== "object" || file.properties === null) {
      errors.push({ field: "properties", message: "Must be an object" });
    } else {
      const props = file.properties as Record<string, unknown>;
      
      if (props.files !== undefined) {
        if (!Array.isArray(props.files)) {
          errors.push({ field: "properties.files", message: "Must be an array" });
        } else {
          props.files.forEach((f, i) => {
            if (typeof f !== "object" || f === null) {
              errors.push({ field: `properties.files[${i}]`, message: "Must be an object" });
              return;
            }
            const fileObj = f as Record<string, unknown>;
            if (typeof fileObj.uri !== "string") {
              errors.push({ field: `properties.files[${i}].uri`, message: "Required, must be a URL" });
            }
            if (typeof fileObj.type !== "string") {
              errors.push({ field: `properties.files[${i}].type`, message: "Required, must be a MIME type" });
            }
          });
        }
      }
    }
  }

  // Optional: services array
  if (file.services !== undefined) {
    if (!Array.isArray(file.services)) {
      errors.push({ field: "services", message: "Must be an array" });
    } else {
      file.services.forEach((svc, i) => {
        if (typeof svc !== "object" || svc === null) {
          errors.push({ field: `services[${i}]`, message: "Must be an object" });
          return;
        }

        const service = svc as Record<string, unknown>;

        // Required: name
        if (typeof service.name !== "string") {
          errors.push({ field: `services[${i}].name`, message: "Required, must be a string" });
        }
        // Note: ERC-8004 allows custom service types, so we don't restrict to known types

        // Required: endpoint
        if (typeof service.endpoint !== "string" || service.endpoint.length === 0) {
          errors.push({ field: `services[${i}].endpoint`, message: "Required, must be a non-empty string" });
        }

        // For MCP and A2A, endpoint should be a URL
        if (service.name === "MCP" || service.name === "A2A") {
          try {
            new URL(service.endpoint as string);
          } catch {
            errors.push({ field: `services[${i}].endpoint`, message: "Must be a valid URL for MCP/A2A" });
          }
        }

        // Validate service-specific fields
        if (service.name === "MCP" && service.mcpTools !== undefined) {
          if (!Array.isArray(service.mcpTools)) {
            errors.push({ field: `services[${i}].mcpTools`, message: "Must be an array of strings" });
          }
        }

        if (service.name === "A2A" && service.a2aSkills !== undefined) {
          if (!Array.isArray(service.a2aSkills)) {
            errors.push({ field: `services[${i}].a2aSkills`, message: "Must be an array of strings" });
          }
        }

        if (service.name === "OASF") {
          if (service.skills !== undefined && !Array.isArray(service.skills)) {
            errors.push({ field: `services[${i}].skills`, message: "Must be an array of strings" });
          }
          if (service.domains !== undefined && !Array.isArray(service.domains)) {
            errors.push({ field: `services[${i}].domains`, message: "Must be an array of strings" });
          }
        }
      });
    }
  }

  // Optional: supportedTrust array
  if (file.supportedTrust !== undefined) {
    if (!Array.isArray(file.supportedTrust)) {
      errors.push({ field: "supportedTrust", message: "Must be an array" });
    } else {
      file.supportedTrust.forEach((tm, i) => {
        if (typeof tm !== "string") {
          errors.push({ field: `supportedTrust[${i}]`, message: "Must be a string" });
        } else if (!VALID_TRUST_MODELS.includes(tm)) {
          errors.push({
            field: `supportedTrust[${i}]`,
            message: `Must be one of: ${VALID_TRUST_MODELS.join(", ")}`,
          });
        }
      });
    }
  }

  // Optional: registrations array
  if (file.registrations !== undefined) {
    if (!Array.isArray(file.registrations)) {
      errors.push({ field: "registrations", message: "Must be an array" });
    } else {
      file.registrations.forEach((reg, i) => {
        if (typeof reg !== "object" || reg === null) {
          errors.push({ field: `registrations[${i}]`, message: "Must be an object" });
          return;
        }

        const registration = reg as Record<string, unknown>;

        if (registration.agentId === undefined) {
          errors.push({ field: `registrations[${i}].agentId`, message: "Required" });
        }

        if (typeof registration.agentRegistry !== "string") {
          errors.push({ field: `registrations[${i}].agentRegistry`, message: "Required, must be a string (CAIP-10 format)" });
        }
      });
    }
  }

  // Optional boolean flags
  if (file.active !== undefined && typeof file.active !== "boolean") {
    errors.push({ field: "active", message: "Must be a boolean" });
  }

  if (file.x402Support !== undefined && typeof file.x402Support !== "boolean") {
    errors.push({ field: "x402Support", message: "Must be a boolean (note: capital S)" });
  }

  return errors;
}

/**
 * Type guard for ERC-8004 registration file.
 * Throws error with validation details if invalid.
 */
export function assertERC8004RegistrationFile(data: unknown): asserts data is Record<string, unknown> {
  const errors = validateERC8004RegistrationFile(data);
  if (errors.length > 0) {
    const message = errors.map((e) => `  ${e.field}: ${e.message}`).join("\n");
    throw new Error(`Invalid ERC-8004 registration file:\n${message}`);
  }
}
