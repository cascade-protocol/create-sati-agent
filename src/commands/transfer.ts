import { buildCommand } from "@stricli/core";
import { intro, outro, spinner, text, isCancel, cancel } from "@clack/prompts";
import pc from "picocolors";
import { formatSatiAgentId, SOLANA_CAIP2_CHAINS } from "@cascade-fyi/sati-agent0-sdk";
import { Connection, SystemProgram, Transaction, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
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
    s?.start("Loading keypair...");

    try {
      const signer = await loadKeypair(flags.keypair);
      const sdk = createSdk(flags.network, signer);
      const chain = SOLANA_CAIP2_CHAINS[flags.network];
      const agentId = formatSatiAgentId(mint, chain);

      s?.message("Transferring agent...");

      const handle = await sdk.transferAgent(agentId, newOwner);

      let refundTx: string | undefined;
      let refundedAmount = 0;

      // Refund SOL if requested
      if (flags.refundSol) {
        s?.message("Refunding remaining SOL...");

        const rpcUrl = flags.network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcUrl, "confirmed");
        const fromPubkey = new PublicKey(signer.address);
        const toPubkey = new PublicKey(newOwner);

        // Get current balance
        const balanceLamports = await connection.getBalance(fromPubkey);
        
        // Keep 0.001 SOL for rent + transaction fees
        const keepLamports = 1_000_000; // 0.001 SOL
        const refundLamports = balanceLamports - keepLamports;

        if (refundLamports > 0) {
          // Build transfer transaction
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey,
              toPubkey,
              lamports: refundLamports,
            })
          );

          // Convert KeyPairSigner to web3.js Keypair
          const keypairBytes = signer.keyPair;
          const web3Keypair = Keypair.fromSecretKey(keypairBytes);

          // Send and confirm
          refundTx = await connection.sendTransaction(transaction, [web3Keypair]);
          await connection.confirmTransaction(refundTx, "confirmed");
          refundedAmount = refundLamports / LAMPORTS_PER_SOL;
        }
      }

      if (isJson) {
        console.log(JSON.stringify({ 
          txHash: handle.hash, 
          from: signer.address, 
          to: newOwner, 
          agentId,
          ...(refundTx && { refundTx, refundedSol: refundedAmount })
        }, null, 2));
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
