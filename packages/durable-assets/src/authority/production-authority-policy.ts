import { createAuthorityPolicy } from "./authority-policy.js";

export const PRODUCTION_AUTHORITY_POLICY = createAuthorityPolicy({
  policyId: "durable-assets-production",
  revision: 1,
  createdAt: "2026-08-25T18:00:00.000Z",
  principals: [
    {
      principalId: "security-production",
      identities: ["durable-assets-security-prod"],
      authorities: [{ kind: "SECURITY", assetTypes: ["POLICY", "CONTRACT", "TEST", "EVALUATION"] }],
    },
    {
      principalId: "compliance-production",
      identities: ["durable-assets-compliance-prod"],
      authorities: [{ kind: "COMPLIANCE", assetTypes: ["POLICY", "CONTRACT", "DOCUMENTATION"] }],
    },
    {
      principalId: "operator-production",
      identities: ["durable-assets-operator-prod"],
      authorities: [{ kind: "OPERATOR", assetTypes: ["SKILL", "SOP", "SCHEMA", "DOCUMENTATION"] }],
    },
  ],
});
