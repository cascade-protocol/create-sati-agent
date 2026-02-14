import { buildCommand } from "@stricli/core";
import { intro, outro, spinner, text, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { createSdk } from "../lib/sdk.js";
import { loadKeypair } from "../lib/keypair.js";
import { truncateAddress } from "../lib/format.js";

interface TransferFlags {
  newOwner?: string;
  keypair?: string;
  network: "devnet" | "mainnet";
  json?: boolean;
  refundSol?: boolean;
}

export const transferCommand = buildCommand({
  docs: {
    brief: "Transfer agent ownership to a new wallet",
  },
  parameters: {
    flags: {
      newOwner: {
        kind: "parsed",
        parse: String,
        brief: "New owner's Solana address",
        optional: true,
      },
      keypair: {
        kind: "parsed",
        parse: String,
        brief: "Path to Solana keypair JSON (default: ~/.config/solana/id.json)",
        optional: true,
      },
      network: {
        kind: "enum",
        values: ["devnet", "mainnet"],
        brief: "Solana network",
        default: "mainnet",
      },
      json: {
        kind: "boolean",
        brief: "Output raw JSON",
        optional: true,
      },
      refundSol: {
        kind: "boolean",
        brief: "Send remaining SOL to new owner after transfer",
        optional: true,
      },
    },
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Agent mint address",
          parse: String,
          placeholder: "mint",
        },
      ],
    },
  },
  async func(this: void, flags: TransferFlags, mint: string) {
    const isJson = flags.json;

    if (!isJson) {
      intro(pc.cyan("SATI - Transfer Agent"));
    }

    let newOwner = flags.newOwner;

    if (!newOwner) {
      const result = await text({
        message: "New owner's Solana address:",
        validate: (v) => (v.length < 32 ? "Must be a valid Solana address" : undefined),
      });
      if (isCancel(result)) {
        cancel("Cancelled");
        process.exit(0);
      }
      newOwner = result;
    }

    const s = !isJson ? spinner() : null;
    // Validate agent mint address format
    if (mint.length < 32 || mint.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(mint)) {
      if (!isJson) {
        console.error(pc.red("Error: Invalid agent mint address format"));
        console.log();
        console.log(pc.dim(`Address provided: ${mint} (${mint.length} characters)`));
        console.log(pc.dim("Expected: 32-44 base58 characters"));
        console.log();
      } else {
        console.error(JSON.stringify({ error: "Invalid agent mint address format" }, null, 2));
      }
      process.exit(1);
    }

    // Validate new owner address format
    if (newOwner.length < 32 || newOwner.length > 44 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(newOwner)) {
      if (!isJson) {
        console.error(pc.red("Error: Invalid new owner address format"));
        console.log();
        console.log(pc.dim(`Address provided: ${newOwner} (${newOwner.length} characters)`));
        console.log(pc.dim("Expected: 32-44 base58 characters"));
        console.log();
      } else {
        console.error(JSON.stringify({ error: "Invalid new owner address format" }, null, 2));
      }
      process.exit(1);
    }

    s?.start("Loading keypair...");

    try {
      const signer = await loadKeypair(flags.keypair);
      const sdk = createSdk(flags.network, signer);
      const chain = SOLANA_CAIP2_CHAINS[flags.network];

      let agentId: string;
      try {
        agentId = formatSatiAgentId(mint, chain);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.toLowerCase().includes("base58") || errorMsg.toLowerCase().includes("address")) {
          if (!isJson) {
            console.error(pc.red("Error: Invalid agent mint address"));
            console.log();
          } else {
            console.error(JSON.stringify({ error: "Invalid agent mint address" }, null, 2));
          }
          process.exit(1);
        }
        throw error;
      }

      s?.message("Transferring agent...");

      const handle = await sdk.transferAgent(agentId, newOwner);

      // Note: --refund-sol feature disabled for now
      // Requires low-level transaction construction not exposed by sati-agent0-sdk
      // Users can manually transfer SOL after ownership transfer
      if (flags.refundSol) {
        s?.stop(pc.yellow("⚠️  --refund-sol not yet implemented"));
        console.log();
        console.log(pc.dim("To refund remaining SOL manually:"));
        console.log(
          pc.dim(`  solana transfer ${newOwner} ALL --keypair ${flags.keypair ?? "~/.config/solana/id.json"}`),
        );
        console.log();
        process.exit(1);
      }

      const refundTx: string | undefined = undefined;
      const refundedAmount = 0;

      if (isJson) {
        const result: Record<string, unknown> = {
          txHash: handle.hash,
          from: signer.address,
          to: newOwner,
          agentId,
        };
        if (refundTx) {
          result.refundTx = refundTx;
          result.refundedSol = refundedAmount;
        }
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      s?.stop(pc.green("Agent transferred!"));
      console.log();
      console.log(`  ${pc.dim("Tx:")}   ${handle.hash}`);
      console.log(`  ${pc.dim("From:")} ${truncateAddress(signer.address, 6)}`);
      console.log(`  ${pc.dim("To:")}   ${truncateAddress(newOwner, 6)}`);

      if (refundTx) {
        console.log();
        console.log(pc.green(`✓ Refunded ${refundedAmount.toFixed(4)} SOL to new owner`));
        console.log(`  ${pc.dim("Tx:")} ${refundTx}`);
      }

      console.log();
      outro(pc.dim("Ownership transferred on Solana"));
    } catch (error) {
      s?.stop(pc.red("Transfer failed"));
      throw error;
    }
  },
});
