import { z } from "zod";

export const AgentRegistrationSchema = z.object({
  name: z.string().min(1, "Name is required").max(32, "Name must be 32 characters or less"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be 500 characters or less"),
  image: z.string().url("Image must be a valid URL").optional(),
  services: z
    .array(
      z.object({
        name: z.string().min(1, "Service name is required"),
        endpoint: z.string().url("Service endpoint must be a valid URL"),
      }),
    )
    .optional(),
  endpoints: z
    .array(
      z.object({
        name: z.string().min(1, "Endpoint name is required"),
        endpoint: z.string().url("Endpoint must be a valid URL"),
      }),
    )
    .optional(), // Legacy field name - still accepted
  active: z.boolean().default(true),
  x402Support: z.boolean().optional(),
  supportedTrust: z
    .array(z.enum(["reputation", "cryptoEconomic", "teeAttestation"], "Supported trust types are: reputation, cryptoEconomic, teeAttestation"))
    .optional(),
  registrations: z
    .array(
      z.object({
        agentId: z.string(),
        agentRegistry: z.string(),
      }),
    )
    .optional(),
});

export type AgentRegistration = z.infer<typeof AgentRegistrationSchema>;
