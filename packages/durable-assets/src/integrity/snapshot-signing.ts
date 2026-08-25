import { canonicalJson, sha256Canonical } from "./canonical-hash.js";
import type { CheckpointSigner, CheckpointVerifier } from "./checkpoint-signing.js";
import {
  RegistryProjectionSnapshotV1Schema,
  SignedRegistryProjectionSnapshotV1Schema,
  type RegistryProjectionSnapshotV1,
  type SignedRegistryProjectionSnapshotV1,
  type SignatureVerdict,
} from "../schemas/trust.v1.js";

function canonicalBytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(canonicalJson(value));
}

export async function signRegistryProjectionSnapshot(
  snapshot: RegistryProjectionSnapshotV1,
  signer: CheckpointSigner,
  signedAt: string,
): Promise<SignedRegistryProjectionSnapshotV1> {
  const validated = RegistryProjectionSnapshotV1Schema.parse(snapshot);
  const signature = await signer.sign(canonicalBytes(validated));
  return SignedRegistryProjectionSnapshotV1Schema.parse({
    schema: "SignedRegistryProjectionSnapshot/v1",
    snapshot: validated,
    signingAlgorithm: signer.algorithm,
    keyId: signer.keyId,
    publicKeyFingerprint: signer.publicKeyFingerprint,
    signedPayloadHash: sha256Canonical(validated),
    signature: Buffer.from(signature).toString("base64"),
    signedAt,
  });
}

export async function verifySignedRegistryProjectionSnapshot(
  signed: SignedRegistryProjectionSnapshotV1,
  verifier: CheckpointVerifier,
): Promise<SignatureVerdict> {
  const parsed = SignedRegistryProjectionSnapshotV1Schema.parse(signed);
  if (sha256Canonical(parsed.snapshot) !== parsed.signedPayloadHash) return "INVALID_SIGNATURE";
  return verifier.verify({
    algorithm: parsed.signingAlgorithm,
    keyId: parsed.keyId,
    publicKeyFingerprint: parsed.publicKeyFingerprint as `sha256:${string}`,
    payload: canonicalBytes(parsed.snapshot),
    signature: Buffer.from(parsed.signature, "base64"),
  });
}
