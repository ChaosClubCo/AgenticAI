import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { GetPublicKeyCommand, KMSClient, SignCommand } from "@aws-sdk/client-kms";
import type { CheckpointSigner, CheckpointVerifier } from "./checkpoint-signing.js";

export interface AwsKmsSignerOptions {
  sendSign?: (command: SignCommand) => Promise<{ Signature?: Uint8Array }>;
  client?: unknown;
  keyId: string;
  publicKeyDer: Uint8Array;
}

type SignSender = (command: SignCommand) => Promise<{ Signature?: Uint8Array }>;

function resolveSignSender(options: AwsKmsSignerOptions): SignSender {
  if (options.sendSign) return options.sendSign;
  if (!options.client || typeof options.client !== "object" || !("send" in options.client)) {
    throw new Error("AWS KMS signer requires sendSign or a client with send().");
  }
  const send = (options.client as { send?: unknown }).send;
  if (typeof send !== "function") throw new Error("AWS KMS signer client.send must be a function.");
  return command => (send as SignSender).call(options.client, command);
}

export class AwsKmsEcdsaP256Signer implements CheckpointSigner {
  readonly algorithm = "ECDSA_P256_SHA256" as const;
  readonly keyId: string;
  readonly publicKeyFingerprint: `sha256:${string}`;
  readonly verifier: CheckpointVerifier;
  private readonly sendSign: SignSender;
  private readonly publicKeyDer: Uint8Array;

  constructor(options: AwsKmsSignerOptions) {
    this.sendSign = resolveSignSender(options);
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
    const response = await this.sendSign(new SignCommand({
      KeyId: this.keyId,
      Message: payload,
      MessageType: "RAW",
      SigningAlgorithm: "ECDSA_SHA_256",
    }));
    if (!response.Signature?.length) throw new Error(`AWS KMS returned no signature for key ${this.keyId}.`);
    return response.Signature;
  }
}

export async function createAwsKmsEcdsaP256Signer(input: { client: KMSClient; keyId: string }): Promise<AwsKmsEcdsaP256Signer> {
  const response = await input.client.send(new GetPublicKeyCommand({ KeyId: input.keyId }));
  if (!response.PublicKey?.length) throw new Error(`AWS KMS returned no public key for ${input.keyId}.`);
  return new AwsKmsEcdsaP256Signer({
    sendSign: command => input.client.send(command),
    keyId: input.keyId,
    publicKeyDer: response.PublicKey,
  });
}
