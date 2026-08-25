import { sha256Canonical } from "../integrity/canonical-hash.js";
import type { DurableAssetType } from "../schemas/common.v1.js";
import type { PromotionAuthorityKind } from "../schemas/integrity.v1.js";
import { AuthorityPolicyV1Schema, type AuthorityPolicyV1 } from "../schemas/trust.v1.js";
export type AuthorityPolicyInput = Omit<AuthorityPolicyV1, "schema" | "policyHash">;
export function createAuthorityPolicy(input: AuthorityPolicyInput): AuthorityPolicyV1 { const base = { schema: "AuthorityPolicy/v1" as const, ...input }; return AuthorityPolicyV1Schema.parse({ ...base, policyHash: sha256Canonical(base) }); }
export function verifyAuthorityPolicy(policy: AuthorityPolicyV1): boolean { const parsed = AuthorityPolicyV1Schema.parse(policy); const { policyHash, ...base } = parsed; return sha256Canonical(base) === policyHash; }
export function evaluateAuthority(policy: AuthorityPolicyV1, identity: string, authorityKind: PromotionAuthorityKind, assetType: DurableAssetType) { if (!verifyAuthorityPolicy(policy)) throw new Error("Invalid authority policy hash."); const principal = policy.principals.find(p => p.identities.includes(identity)); const grant = principal?.authorities.find(a => a.kind === authorityKind); const allowed = Boolean(grant?.assetTypes.includes(assetType)); return { verdict: allowed ? "ALLOW" as const : "DENY" as const, principalId: allowed ? principal!.principalId : null, authorityKind, assetType, policyRevision: policy.revision, policyHash: policy.policyHash, reasonCode: allowed ? "IDENTITY_KIND_TYPE_ALLOWED" : "NO_MATCHING_GRANT" }; }
