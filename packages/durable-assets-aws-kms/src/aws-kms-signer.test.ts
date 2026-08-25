import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { AwsKmsEcdsaP256Signer } from "./aws-kms-signer.js";

const keyId = "arn:aws:kms:us-east-1:123456789012:key/test";

test("small payloads use RAW ECDSA_SHA_256 without private key export", async () => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const calls: unknown[] = [];
  const signer = new AwsKmsEcdsaP256Signer({
    keyId,
    publicKeyDer,
    sendSign: async command => { calls.push(command.input); return { Signature: new Uint8Array([1, 2, 3]) }; },
  });
  const payload = new TextEncoder().encode("payload");
  assert.deepEqual([...(await signer.sign(payload))], [1, 2, 3]);
  assert.deepEqual(calls, [{ KeyId: keyId, Message: payload, MessageType: "RAW", SigningAlgorithm: "ECDSA_SHA_256" }]);
  assert.equal("privateKey" in signer, false);
});

test("payloads above the AWS KMS raw limit use SHA-256 DIGEST signing", async () => {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const calls: Array<{ Message?: Uint8Array; MessageType?: string }> = [];
  const signer = new AwsKmsEcdsaP256Signer({
    keyId,
    publicKeyDer,
    sendSign: async command => { calls.push(command.input); return { Signature: new Uint8Array([9]) }; },
  });
  const payload = new Uint8Array(4097).fill(7);
  await signer.sign(payload);
  assert.equal(calls[0]?.MessageType, "DIGEST");
  assert.deepEqual(calls[0]?.Message, createHash("sha256").update(payload).digest());
});
