import { createHash, createPublicKey, verify as verifySignature } from "node:crypto";
import { GetPublicKeyCommand, KMSClient, SignCommand, type SignCommandOutput } from "@aws-sdk/client-kms";

export type SigningAlgorithm = "ECDSA_P256_SHA256";
export type SignatureVerdict = "TRUSTED" | "INVALID_SIGNATURE" | "UNKNOWN_KEY" | "REVOKED_KEY" | "ALGORITHM_NOT_ALLOWED" | "FINGERPRINT_MISMATCH";
export interface CheckpointVerifierLike {
  verify(input: { algorithm: SigningAlgorithm; keyId: string; publicKeyFingerprint: `sha256:${string}`; payload: Uint8Array; signature: Uint8Array }): Promise<SignatureVerdict>;
}
export interface CheckpointSignerLike {
  readonly algorithm: SigningAlgorithm;
  readonly keyId: string;
  readonly publicKeyFingerprint: `sha256:${string}`;
  readonly verifier: CheckpointVerifierLike;
  sign(payload: Uint8Array): Promise<Uint8Array>;
}

export interface AwsKmsSignerOptions {
  sendSign?: (command: SignCommand) => Promise<Pick<SignCommandOutput, "Signature">>;
  client?: unknown;
  keyId: string;
  publicKeyDer: Uint8Array;
}

type SignSender = (command: SignCommand) => Promise<Pick<SignCommandOutput, "Signature">>;
const KMS_RAW_MESSAGE_LIMIT_BYTES = 4096;

function resolveSignSender(options: AwsKmsSignerOptions): SignSender {
  if (options.sendSign) return options.sendSign;
  if (!options.client || typeof options.client !== "object" || !("send" in options.client)) {
    throw new Error("AWS KMS signer requires sendSign or a client with send().");
  }
  const send = (options.client as { send?: unknown }).send;
  if (typeof send !== "function") throw new Error("AWS KMS signer client.send must be a function.");
  return command => (send as SignSender).call(options.client, command);
}

export class AwsKmsEcdsaP256Signer implements CheckpointSignerLike {
  readonly algorithm = "ECDSA_P256_SHA256" as const;
  readonly keyId: string;
  readonly publicKeyFingerprint: `sha256:${string}`;
  readonly verifier: CheckpointVerifierLike;
  private readonly sendSign: SignSender;

  constructor(options: AwsKmsSignerOptions) {
    this.sendSign = resolveSignSender(options);
    this.keyId = options.keyId;
    this.publicKeyFingerprint = `sha256:${createHash("sha256").update(options.publicKeyDer).digest("hex")}`;
    const publicKey = createPublicKey({ key: Buffer.from(options.publicKeyDer), type: "spki", format: "der" });
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
    const useDigest = payload.byteLength > KMS_RAW_MESSAGE_LIMIT_BYTES;
    const message = useDigest ? createHash("sha256").update(payload).digest() : payload;
    const response = await this.sendSign(new SignCommand({
      KeyId: this.keyId,
      Message: message,
      MessageType: useDigest ? "DIGEST" : "RAW",
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
