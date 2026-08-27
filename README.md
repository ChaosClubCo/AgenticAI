# AgenticAI

AgenticAI is an AI-governance and provenance repository containing two related but distinct systems:

1. **Intelligence Manifest Registry** — a React application for inventory, lineage, rule/conflict analysis, dependency visualization, and attestation-oriented governance workflows.
2. **Durable Assets** — a trust/control-plane subsystem for promoting reusable AI assets, verifying exact source material, signing registry state, and testing whether multiple agent runtimes resolve and follow the same canonical instructions.

The repository intentionally separates **implemented**, **verified**, **deployed**, and **certified** states. Code existing in `main` is not, by itself, a production trust claim.

## Current maturity

### Intelligence Manifest application

Implemented capabilities include:

- inventory management for agentic systems;
- training-source and business-rule lineage;
- Gemini-powered synthesis/conflict-oriented workflows;
- D3 dependency visualization;
- attestation-oriented SHA-256 state hashing;
- audit/history surfaces;
- CI/CD-oriented integration UI.

Repository guidance currently targets `gemini-3.7-flash` for high-velocity logic checks. Provider/model guidance is treated as mutable operational configuration and must be reviewed when vendor support changes.

### Durable Assets

Implemented and repository-tested capabilities include:

- lifecycle: `CANDIDATE -> PROMOTED -> TESTED -> VERIFIED -> ACTIVE -> DEPRECATED`;
- three-session promotion rule plus explicit authority bypasses;
- committed `verification-before-completion@1.0.0` Skill;
- deterministic projection and registry hashing;
- Git materialization verification;
- signed checkpoints and signed snapshots;
- trusted/revoked verification-key registry;
- provider-neutral AWS KMS ECDSA P-256 adapter;
- read-only provenance MCP implementation;
- ACTIVE-only Claude/Codex/Gemini distribution adapters;
- deterministic multi-agent conformance;
- live Anthropic/OpenAI/Gemini behavioral runners;
- normalized action evidence and `LiveAgentBehaviorConformanceReceipt/v1` persistence;
- CI separation between uncredentialed pull-request checks and credentialed trusted-main execution.

### Not yet production-certified

The current repository does **not** claim the complete production trust chain has been proven.

Remaining P0 operational gates include:

- protect the trusted credential-execution boundary;
- configure Anthropic/OpenAI/Gemini provider secrets;
- obtain 3/3 real provider `EXECUTED` + `PASS` behavioral verdicts;
- provision and exercise a real externally held AWS KMS signing key;
- deploy and verify the read-only provenance MCP;
- bind exact source, signed registry state, live provider evidence, and runtime identity into the first production trust receipt.

See [`roadmap.md`](roadmap.md) for the evidence-gated sequence.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/` | Intelligence Manifest React application |
| `packages/durable-assets/` | Durable Asset lifecycle, integrity, provenance MCP, conformance, and receipts |
| `packages/durable-assets-aws-kms/` | Provider-specific AWS KMS signing adapter |
| `.skills/verification-before-completion/` | First committed real promoted Skill |
| `docs/superpowers/specs/` | Architecture/design specifications |
| `docs/DOCUMENTATION_STANDARDS.md` | Canonical documentation and evidence-writing rules |
| `roadmap.md` | Dependency- and evidence-gated repository roadmap |
| `AGENTS.md` | Repository-specific contributor/agent operating rules |

## Durable Asset flow

```text
Repeated useful behavior
        ↓
CANDIDATE
        ↓
PROMOTED
        ↓
TESTED
        ↓
VERIFIED
        ↓
ACTIVE
        ↓
materialized source
        ↓
Git/object verification
        ↓
signed checkpoint / snapshot
        ↓
agent distribution + behavioral conformance
        ↓
provenance verification
```

Agents do not get to declare their own work authoritative. Promotion, verification, signing, and behavioral verdicts remain separate boundaries.

## Behavioral conformance

The live-provider harness sends the same Skill-bound task through isolated provider runners for:

- Anthropic / Claude;
- OpenAI / Codex;
- Google / Gemini.

Each provider produces normalized evidence such as:

```text
MUTATION
→ VERIFICATION
→ COMPLETION_CLAIM or FAILURE_REPORT
```

A deterministic evaluator, not the provider model, determines `PASS`, `FAIL`, `INCONCLUSIVE`, or invalid/error semantics.

Default model identifiers are currently code-defined, with environment overrides available:

- Anthropic: `claude-sonnet-5`;
- OpenAI/Codex: `gpt-5.3-codex`;
- Gemini: `gemini-3.7-flash`.

Provider API keys are secret configuration and must never be committed to the repository or copied into receipts.

## Provenance and signing boundaries

The read-only provenance service is designed to contain verification capability without mutation/signing authority.

Intended read-only runtime capabilities:

- inspect canonical ACTIVE registry/projection state;
- inspect lineage and authority policy;
- verify checkpoint chains and signed checkpoints;
- verify materialization receipts when exact Git object access is configured.

The provenance runtime must not receive:

- KMS private/signing credentials;
- asset mutation authority;
- event append authority;
- promotion authority;
- privileged SECURITY/COMPLIANCE/OPERATOR mutation identities.

## Development

### Intelligence Manifest application

```bash
npm install
npm run dev
```

Use the root `package.json` scripts for the application-specific lint/build/test commands available on the current revision.

### Durable Assets core

```bash
cd packages/durable-assets
npm install --ignore-scripts --no-audit --no-fund
npm run check
```

`npm run check` runs typechecking, tests, and the package build.

### AWS KMS adapter

```bash
cd packages/durable-assets-aws-kms
npm install --ignore-scripts --no-audit --no-fund
npm run check
```

Deterministic CI tests do not constitute proof of live AWS KMS custody. Production KMS evidence requires a real externally held signing key and offline public-key verification.

## Required provider secrets for live conformance

The trusted live-provider workflow expects these secret names when real provider execution is enabled:

```text
ANTHROPIC_API_KEY
OPENAI_API_KEY
GEMINI_API_KEY
```

Secret **values must never appear in documentation, source files, fixtures, logs, or receipts**.

## Documentation

Start here:

- [Documentation standards](docs/DOCUMENTATION_STANDARDS.md)
- [Roadmap](roadmap.md)
- [Durable Assets v1.2 trust/replay/provenance design](docs/superpowers/specs/2026-08-25-durable-assets-v1-2-trust-replay-provenance-design.md)
- [Repository agent instructions](AGENTS.md)
- [Promoted verification-before-completion Skill](.skills/verification-before-completion/)

Documentation rules require one canonical source per fact, explicit maturity labels, secret hygiene, exact evidence for release/security claims, and a hard distinction between deterministic fixtures and live production evidence.

## Security and evidence principles

- Evidence before claims.
- Least privilege and fail-closed verification.
- Exact Git/source binding for release and trust evidence.
- Separate signing authority from read-only provenance verification.
- Do not expose production/provider secrets to arbitrary pull-request code.
- Preserve immutable receipts instead of rewriting historical evidence.
- Treat provider APIs/models as mutable dependencies that require periodic support review.

## Planning

The immediate critical path is:

```text
protect trusted credential boundary
→ configure three provider secrets
→ 3/3 live provider PASS
→ real AWS KMS signing
→ deploy read-only provenance MCP
→ bind runtime + source + signed registry + live behavior
→ issue first production trust receipt
```

See [`roadmap.md`](roadmap.md) for entry conditions, deliverables, exit gates, evidence requirements, and blockers for every phase.
