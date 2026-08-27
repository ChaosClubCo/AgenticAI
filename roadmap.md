# AgenticAI Roadmap

Status: **Active planning document**  
Last baseline review: **2026-08-27**  
Baseline source revision used for this roadmap: `b0704c962307fa72240d69d2a0cf964187e62a57`

## Mission

Build a trustworthy agent-governance and provenance system in which reusable AI assets can be promoted through an explicit lifecycle, verified against exact source material, distributed consistently to multiple agent runtimes, and supported by evidence that distinguishes deterministic tests from real production execution.

The roadmap is dependency-driven. Dates are intentionally secondary to verification gates.

## Current state

### Implemented and repository-verified

- Durable Asset lifecycle and reducer semantics.
- Three-session promotion rule with explicit higher-authority bypasses.
- Canonical `verification-before-completion@1.0.0` Skill committed under `.skills/`.
- Required Skill test categories and activation gate.
- Deterministic registry projection and hashing.
- Materialization receipts tied to Git objects/committed bytes.
- Signed checkpoint and signed snapshot contracts.
- Verification-key registry with trusted/revoked semantics.
- Provider-neutral AWS KMS ECDSA P-256 signing adapter.
- Read-only provenance MCP implementation.
- Claude/Codex/Gemini ACTIVE-only registry adapters.
- Deterministic multi-agent distribution conformance.
- Behavioral conformance evaluator and sandbox fixture.
- Live Anthropic, OpenAI/Codex, and Gemini provider runners.
- Per-provider disposable sandbox isolation.
- Provider identity binding and normalized evidence hashing.
- `LiveAgentBehaviorConformanceReceipt/v1` persistence and CI artifact preservation.
- Pull-request secret isolation: credentialed provider execution is restricted to trusted `main` push execution.
- Default live provider models in code, with environment overrides.

### Verified but not equivalent to production proof

The deterministic acceptance transaction proves the software path through promotion, testing, activation, materialization, signing, replay, and consistent adapter resolution. Test/local signing evidence is not proof of production KMS custody.

The live-provider CI path has also executed on trusted `main`, but the last verified run had no provider API keys configured. Its three provider outcomes were therefore `UNAVAILABLE / INCONCLUSIVE` rather than real model executions.

### Known operational blockers

1. `ANTHROPIC_API_KEY` is not configured in GitHub Actions.
2. `OPENAI_API_KEY` is not configured in GitHub Actions.
3. `GEMINI_API_KEY` is not configured in GitHub Actions.
4. No authenticated AWS/KMS control-plane path has yet provisioned the real production signing key.
5. The read-only provenance MCP has not yet been verified as deployed to a production host.
6. The repository's `main` branch was unprotected at the baseline review. Provider/signing secrets should not be introduced until trusted revision controls are strengthened or an approval-gated environment owns credential access.

## Priority model

- **P0**: required before production trust evidence can be accepted.
- **P1**: required for reliable production operation and repeatability.
- **P2**: scale, usability, maintainability, or integration improvements after the trust path is proven.

---

# Phase 0 — Protect the trust boundary

Priority: **P0**

## Objective

Ensure code that can access provider or signing credentials cannot be changed and executed without an appropriate review/approval boundary.

## Entry conditions

- Live provider runners exist.
- Credentialed CI is restricted to trusted push execution.
- Provider keys are not yet configured.

## Deliverables

- Protect `main` with a GitHub ruleset or branch protection policy.
- Require the applicable Durable Assets checks before merge.
- Prevent direct unreviewed modification of credential-consuming workflow/runner code.
- Prefer a protected GitHub Environment for credentialed live conformance.
- Require environment approval before high-value credentials are exposed if the organization/workflow model supports it.
- Document who may modify provider credential configuration.
- Add a safe manual execution path (`workflow_dispatch` or equivalent trusted control) for live conformance so a code change is not required merely to rerun evidence.

## Exit gate

A contributor cannot cause arbitrary PR code to receive provider keys, and the trusted live-conformance revision is review-gated before credential access.

## Evidence required

- ruleset/branch-protection configuration snapshot or API evidence;
- required-check configuration;
- protected-environment configuration where used;
- one uncredentialed PR run showing provider secrets are absent;
- one trusted execution showing the credential path is available without exposing secret values.

## Non-goals

- Do not place provider keys in repository files.
- Do not expose secret values in receipts or logs.

---

# Phase 1 — First real three-provider behavioral proof

Priority: **P0**

## Objective

Execute the same ACTIVE Skill and task independently through Anthropic, OpenAI/Codex, and Gemini, then derive three deterministic behavioral verdicts from normalized evidence.

## Entry conditions

- Phase 0 trust boundary is complete.
- `verification-before-completion@1.0.0` remains ACTIVE.
- Live provider runners pass deterministic contract tests.

## Deliverables

Configure only secret values:

- `ANTHROPIC_API_KEY`;
- `OPENAI_API_KEY`;
- `GEMINI_API_KEY`.

Default models are code-defined unless explicitly overridden:

- Anthropic: `claude-sonnet-5`;
- OpenAI/Codex: `gpt-5.3-codex`;
- Gemini: `gemini-3.7-flash`.

Run the same disposable fixture through all three provider runners.

Capture per provider:

- adapter/provider identity;
- model identity;
- exact Skill version;
- projection hash;
- task hash;
- normalized action sequence;
- verification result;
- claim/report ordering;
- evidence hash;
- deterministic verdict.

## Exit gate

All conditions must hold:

- Claude status = `EXECUTED`;
- Codex status = `EXECUTED`;
- Gemini status = `EXECUTED`;
- all three use the intended Skill/task/projection identity;
- all three behavioral verdicts = `PASS`;
- `allProvidersExecuted = true`;
- `behaviorallyConformant = true`.

## Evidence required

Preserve the first genuine `LiveAgentBehaviorConformanceReceipt/v1` with:

- exact Git SHA;
- receipt ID;
- workflow run ID;
- model IDs;
- inline normalized evidence;
- evidence hashes;
- artifact ID;
- artifact digest.

## Failure behavior

- missing credential -> `UNAVAILABLE / INCONCLUSIVE`;
- provider/API failure -> `ERROR / INCONCLUSIVE` and failed live job;
- Skill violation -> `FAIL` and failed live job;
- provider/evidence identity mismatch -> provider error; evidence is not accepted;
- mixed Skill/projection/task identity -> conformance must not pass.

---

# Phase 2 — Real production signing root

Priority: **P0**

## Objective

Replace deterministic/test signing evidence with a real externally held production signing root.

## Entry conditions

- Provider behavioral proof from Phase 1 is preserved.
- AWS account and authorized KMS control-plane access are available.

## Deliverables

Provision an asymmetric AWS KMS key:

- Key usage: `SIGN_VERIFY`;
- Key spec: `ECC_NIST_P256`;
- signing algorithm: `ECDSA_SHA_256`.

Create a dedicated signing principal with the minimum permissions required for the signing workflow, including only the necessary `kms:Sign` and `kms:GetPublicKey` access.

Retrieve the public key, derive its fingerprint, and add the public key to `VerificationKeyRegistry/v1` as `TRUSTED`.

Keep signing credentials completely outside the read-only provenance service.

Execute a real production signing transaction for a canonical registry checkpoint/snapshot.

## Exit gate

- real KMS `Sign` succeeds;
- the signature verifies offline using the published trusted public key;
- key fingerprint matches the verification registry;
- no private signing credential is present in the provenance runtime;
- tampered payload verification fails;
- unknown/revoked key verification fails closed.

## Evidence required

- KMS key ARN/id reference (non-secret metadata only);
- public-key fingerprint;
- verification-key registry hash;
- signed checkpoint/snapshot IDs;
- canonical payload hashes;
- offline verification results;
- exact source SHA.

## Rotation requirement

Future key rotation must preserve prior public keys and mark retired keys `REVOKED` rather than deleting history.

---

# Phase 3 — Deploy read-only provenance MCP

Priority: **P0**

## Objective

Expose production provenance/verification to agents without exposing mutation or signing authority.

## Entry conditions

- production verification-key registry exists;
- a deployable hosting target is available;
- production data/storage behavior is defined.

## Deliverables

Deploy `packages/durable-assets` read-only provenance service.

Runtime must expose only the intended read/verification capability, including applicable tools for:

- ACTIVE registry/projection inspection;
- lineage/status inspection;
- authority-policy inspection;
- checkpoint-chain verification;
- signed-checkpoint verification;
- materialization verification when Git object access is configured.

Runtime must not receive:

- KMS signing credentials;
- durable-asset mutation authority;
- event append authority;
- promotion authority;
- SECURITY/COMPLIANCE/OPERATOR service identities capable of mutation.

## Exit gate

Live runtime evidence confirms:

- `/health` responds successfully;
- mode is read-only;
- mutation credentials = false;
- signing credentials = false;
- trusted/revoked key counts are correct;
- MCP initialization succeeds;
- no mutation tools are discoverable;
- expected verification tools function against production evidence.

## Evidence required

- deployment/runtime identifier;
- published URL;
- exact source SHA;
- runtime/source binding;
- health response;
- MCP tool inventory;
- verification smoke-test receipt.

---

# Phase 4 — First Production Trust Receipt

Priority: **P0**

## Objective

Bind source, canonical asset state, real KMS signatures, live multi-provider behavioral proof, and the deployed provenance runtime into one auditable production trust statement.

## Entry conditions

- Phase 1: three providers `EXECUTED` and `PASS`.
- Phase 2: real KMS production signature verified.
- Phase 3: read-only provenance MCP deployed and verified.

## Deliverables

Create a versioned production trust receipt that references, rather than duplicates, immutable subordinate evidence.

Minimum fields/links should cover:

- receipt schema/version;
- exact repository SHA;
- registry revision/projection hash;
- ACTIVE Skill IDs/versions relevant to the run;
- materialization receipt(s);
- verification-key registry hash;
- KMS key fingerprint/key ID;
- signed checkpoint/snapshot references;
- live multi-provider conformance receipt;
- deployment/runtime binding;
- provenance health/tool verification;
- creation timestamp;
- overall verdict and reason codes.

## Exit gate

The trust receipt can be independently verified without access to any private signing key or provider credential.

Any mismatch in source SHA, payload hash, signature, registry projection, provider identity, or deployment binding must invalidate or downgrade the receipt.

## Evidence required

The production trust receipt itself plus all immutable referenced evidence.

---

# Phase 5 — Operational reliability and evidence retention

Priority: **P1**

## Objective

Turn a successful first production proof into a repeatable operational process.

## Deliverables

- persistent evidence retention strategy beyond short-lived CI artifacts;
- documented backup/restore behavior for immutable receipt stores;
- signing-key rotation runbook;
- verification-key revocation runbook;
- provider-key rotation procedure;
- provider API/model upgrade policy;
- receipt schema migration policy;
- alerting for failed verification/signing/provider runs;
- audit trail for production authority policy changes;
- reproducible runtime/source binding;
- periodic conformance schedule;
- incident procedure for invalid/tampered evidence.

## Exit gate

A second independent production conformance/trust run can be executed from documented procedures and produces equivalent assurance without relying on undocumented operator knowledge.

---

# Phase 6 — Durable Asset expansion

Priority: **P1**

## Objective

Prove that the system generalizes beyond a single self-referential Skill.

## Candidate asset classes

Promote real repeated artifacts from:

- SKILL;
- POLICY;
- SOP;
- SCHEMA/CONTRACT;
- TEST/EVALUATION;
- DOCUMENTATION.

## Deliverables

For each selected real asset:

- occurrence/promotion evidence;
- explicit authority;
- required tests;
- lifecycle transition evidence;
- canonical materialization;
- supersession/version behavior;
- agent resolution evidence;
- production signing/verification where the authority level warrants it.

## Exit gate

At least three materially different asset classes complete the governed lifecycle without provider-specific forks or manual registry ambiguity.

---

# Phase 7 — Product and UI integration

Priority: **P2**

## Objective

Make trust/provenance state useful to operators of the Intelligence Manifest application without weakening the underlying control plane.

## Candidate deliverables

- read-only Durable Asset inventory surface;
- lifecycle/status visualization;
- provenance/lineage view;
- signed-checkpoint status;
- live-provider conformance status;
- production trust receipt viewer;
- explicit distinction between synthetic/test and production evidence;
- links from UI state to canonical receipts and source revisions.

## Constraints

The UI must not become an alternate authority source. It displays canonical state; it does not invent lifecycle or trust state independently.

---

# Phase 8 — Scale and interoperability

Priority: **P2**

## Objective

Support additional agents/providers and larger asset inventories without changing the trust semantics.

## Candidate work

- additional agent adapters;
- provider/model capability negotiation;
- batch conformance runs;
- receipt indexing/search;
- signed registry snapshot distribution;
- external verifier SDK/CLI;
- policy-controlled MCP federation;
- performance budgets for large event/projection histories;
- deterministic snapshot compaction;
- multi-repository provenance bindings where genuinely required.

## Exit gate

Scale improvements preserve deterministic hashes, authority boundaries, receipt verification, and fail-closed behavior.

---

# Cross-cutting release gates

These rules apply to every phase.

## Source integrity

- work is bound to an exact Git SHA;
- working source is clean at release/certification time;
- generated state is reproducible;
- materialized bytes can be verified against the referenced Git object when required.

## Verification

- typecheck/tests/build checks relevant to changed packages pass;
- new failure behavior has regression coverage;
- deterministic tests are not mislabeled live evidence;
- live execution is not inferred from adapter mocks.

## Security

- least privilege;
- fail closed on unknown/revoked/mismatched identity;
- provider/signing credentials are never persisted in receipts;
- pull-request code does not receive production credentials by default;
- signing and provenance verification remain separate capabilities.

## Documentation

- README reflects subsystem maturity without overstating certification;
- architecture documentation matches trust boundaries;
- roadmap status changes only after evidence exists;
- deprecated external models/APIs are removed from operational guidance;
- immutable receipts are never rewritten as living documents.

## Evidence

A phase is not complete merely because its code exists. The specified exit gate and evidence must exist for the exact revision being promoted.

---

# Immediate critical path

```text
P0  protect main / credentialed execution boundary
    ↓
P0  configure ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY
    ↓
P0  trusted three-provider execution
    ↓
P0  require 3/3 EXECUTED + 3/3 PASS
    ↓
P0  preserve first genuine LiveAgentBehaviorConformanceReceipt/v1
    ↓
P0  provision real AWS KMS signing key
    ↓
P0  publish trusted public verification key
    ↓
P0  generate + verify first real KMS checkpoint/snapshot
    ↓
P0  deploy read-only provenance MCP
    ↓
P0  bind runtime ↔ exact source ↔ signed registry state
    ↓
P0  issue first Production Trust Receipt
    ↓
P1  operationalize rotation, retention, incident recovery, recurring conformance
```

## Current release position

**Implemented trust/conformance software is materially ahead of operational production proof.**

The next milestone is not another abstraction layer. It is closing the real authority boundaries: protected credential execution, three genuine provider calls, externally held KMS signing, deployed read-only provenance, and one independently verifiable production trust receipt.