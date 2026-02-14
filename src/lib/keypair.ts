import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import pc from "picocolors";
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";

const DEFAULT_KEYPAIR_PATH = "~/.config/solana/id.json";

export async function loadKeypair(keypairPath?: string): Promise<KeyPairSigner> {
  const resolved = expandHome(keypairPath ?? DEFAULT_KEYPAIR_PATH);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Keypair not found: ${resolved}\n\n` +
        `Run: ${pc.cyan("npx create-sati-agent init")}\n` +
        `This will create a keypair at ${DEFAULT_KEYPAIR_PATH}\n\n` +
        `Or generate manually: solana-keygen new`,
    );
  }
  const data = fs.readFileSync(resolved, "utf-8");
  const secretKey = Uint8Array.from(JSON.parse(data));
  return createKeyPairSignerFromBytes(secretKey);
}

function expandHome(p: string): string {
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}
