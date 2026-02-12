import { SatiAgent0 } from "@cascade-fyi/sati-agent0-sdk";
import type { KeyPairSigner } from "@solana/kit";

export function createSdk(network: "devnet" | "mainnet", signer?: KeyPairSigner): SatiAgent0 {
  return new SatiAgent0({
    network,
    ...(signer && { signer }),
  });
}
