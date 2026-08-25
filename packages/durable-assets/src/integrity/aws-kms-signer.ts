import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { GetPublicKeyCommand, SignCommand } from "@aws-sdk/client-kms";
import type { CheckpointSigner, CheckpointVerifier } from "./checkpoint-signing.js";

interface KmsClientLike {
  send(command: GetPublicKeyCommand | SignCommand): Promise<{ PublicKey?: Uint8Array; Signature?: Uint8Array }>;
}

export interface AwsKmsSignerOptions {
  client: KmsClientLike;
  keyId: string;
  publicKeyDer: Uint8Array;
}

export class AwsKmsEcdsaP256Signer implements CheckpointSigner {
  readonly algorithm = "ECDSA_P256_SHA256" as const;
  readonly keyId: string;
  readonly publicKeyFingerprint: `sha256:${string}`;
  readonly verifier: CheckpointVerifier;
  private readonly client: KmsClientLike;
  private readonly publicKeyDer: Uint8Array;

  constructor(options: AwsKmsSignerOptions) {
    this.client = options.client;
    this.keyId = options.keyId;
    this.publicKeyDer = options.publicKeyDer;
    this.publicKeyFingerprint = `sha256:${createHash("sha256").update(this.publicKeyDer).digest("hex")}`;
    const publicKey = createPublicKey({ key: Buffer.from(this.publicKeyDer), type: "spki", format: "der" });
    this.verifier = {
      verify: async input => {
        if (input.algorithm !== this.algorithm) return "ALGORITHM_NOT_ALLOWED";
        if (input.keyId !== this.keyId) return "UNKNOWN_KEY";
        if (input.publicKeyFingerprint !== this.publicKeyFingerprint) return "FINGERPRINT_MISMATCH";
        return verifySignature("sha256", input.payload, publicKey, input.signature) ? "TRUSTED" : "INVALID_SIGNATURE";
      },
    };
  }

  async sign(payload: Uint8Array): Promise<Uint8Array> {
    const response = await this.client.send(new SignCommand({
      KeyId: this.keyId,
      Message: payload,
      MessageType: "RAW",
      SigningAlgorithm: "ECDSA_SHA_256",
    }));
    if (!response.Signature?.length) throw new Error(`AWS KMS returned no signature for key ${this.keyId}.`);
    return response.Signature;
  }
}

export async function createAwsKmsEcdsaP256Signer(input: { client: KmsClientLike; keyId: string }): Promise<AwsKmsEcdsaP256Signer> {
  const response = await input.client.send(new GetPublicKeyCommand({ KeyId: input.keyId }));
  if (!response.PublicKey?.length) throw new Error(`AWS KMS returned no public key for ${input.keyId}.`);
  return new AwsKmsEcdsaP256Signer({ client: input.client, keyId: input.keyId, publicKeyDer: response.PublicKey });
}
