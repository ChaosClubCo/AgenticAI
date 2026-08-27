# Documentation Standards

Status: **Canonical repository guidance**  
Scope: `ChaosClubCo/AgenticAI`  
Applies to: humans, automation, Claude, Codex, Gemini, and other agents that create or modify repository documentation

## Purpose

Documentation in this repository is part of the control plane, not decoration. It must let a reviewer determine what exists, what is authoritative, what has been verified, what remains planned, and which evidence supports each important claim.

The repository contains both an Intelligence Manifest application and a Durable Assets trust/conformance subsystem. Documentation must preserve that distinction rather than collapsing separate maturity states into one vague project status.

## Core principles

### 1. One canonical source per fact

Each durable fact should have one primary owner. Other documents may summarize it and link to the canonical source, but should not fork the same contract in several places.

Preferred authority order:

1. Executable schemas, tests, and source code for machine-enforced behavior.
2. Repository policies such as `AGENTS.md` for contributor/agent rules.
3. Architecture and design specifications for intended structure and invariants.
4. Runbooks and operational documentation for procedures.
5. `roadmap.md` for planned work and release gates.
6. `README.md` for orientation and navigation.

When these disagree, fix the drift instead of choosing whichever sentence is most convenient.

### 2. Separate current state from future state

Use explicit labels:

- **Implemented**: source exists.
- **Verified**: required checks or evidence have passed for the referenced revision.
- **Deployed**: an identified runtime is serving the referenced revision.
- **Certified**: the project's defined release/trust gate has passed.
- **Planned**: approved but not implemented.
- **Blocked**: work cannot proceed without a named dependency.
- **Inconclusive**: an attempted validation could not produce a meaningful verdict.

Never use "production-ready", "secure", "complete", or similar umbrella claims unless the repository defines the gate and the evidence satisfies it.

### 3. Evidence before claims

For security, release, attestation, compatibility, and conformance statements, record enough evidence to reproduce or independently inspect the conclusion.

Good evidence includes:

- exact Git commit SHA;
- workflow run ID;
- job names and conclusions;
- artifact ID and digest;
- receipt ID and schema version;
- materialization/path hash;
- provider/model identifier;
- deployment/version identifier;
- timestamp when time materially affects the claim.

Do not substitute screenshots, prose, or a model's self-report for machine-verifiable evidence when stronger evidence exists.

### 4. Pin mutable external assumptions

Provider APIs, models, SDKs, platform behavior, and security guidance change. When documentation depends on them:

- name the provider and API surface;
- include the relevant model/API identifier when operationally important;
- avoid claims like "latest" unless the document is intentionally freshness-sensitive;
- prefer a support-status statement over an eternal-looking recommendation;
- update repository guidance when a model or API is retired.

Never commit API keys, tokens, private key material, raw secret values, or secret-bearing logs to documentation.

### 5. Document boundaries, not just components

Architecture documentation should explain who is allowed to do what.

For trust-sensitive systems, always identify:

- authority boundary;
- mutation boundary;
- signing boundary;
- verification boundary;
- credential boundary;
- persistence boundary;
- agent/provider boundary;
- failure and fail-closed behavior.

A list of modules without authority relationships is an inventory, not architecture documentation.

## Required document types

### README.md

Purpose: repository orientation.

Keep it concise and current. It should contain:

- what the repository is;
- major subsystems;
- current maturity summary;
- high-level architecture;
- local development entry points;
- links to canonical deeper documentation;
- warnings about important operational boundaries.

Do not turn the README into a changelog, detailed API reference, or exhaustive design document.

### Architecture / design specifications

Use architecture documents for decisions that affect multiple components, public contracts, persistence, security boundaries, or execution topology.

A design document should cover, as applicable:

1. problem and goals;
2. non-goals;
3. architecture and component responsibilities;
4. data/control flow;
5. authority and security boundaries;
6. schemas/contracts;
7. persistence and integrity;
8. error/failure semantics;
9. testing strategy;
10. deployment/operations;
11. migration/backward compatibility;
12. acceptance criteria.

Design docs describe an intended architecture. They do not prove implementation or deployment.

### ADRs

Use an Architecture Decision Record when a durable choice has meaningful alternatives and future maintainers need to know why it was selected.

Minimum ADR fields:

- title;
- date;
- status (`proposed`, `accepted`, `superseded`, `deprecated`);
- context;
- decision;
- alternatives considered;
- consequences;
- superseding/superseded references when applicable.

Do not create an ADR for ordinary implementation trivia.

### Runbooks

Runbooks are executable operational procedures. Write them so a qualified operator can follow them without reconstructing tribal knowledge.

Required structure:

1. purpose and scope;
2. prerequisites and required authority;
3. safety/rollback conditions;
4. numbered procedure;
5. verification steps;
6. expected evidence/artifacts;
7. failure paths;
8. escalation or recovery path.

Never place secret values in a runbook. Refer to the secret name and approved secret store.

### Security documentation

Security documentation should distinguish:

- threat or abuse case;
- security property/invariant;
- enforcing control;
- verification method;
- remaining risk;
- ownership and remediation status.

Avoid "secure by design" as a standalone claim. Describe the actual controls.

### API and contract documentation

Machine-readable schemas are authoritative when present. Human documentation should explain semantics that the schema alone cannot express.

For every public or persisted contract, document:

- schema/version identifier;
- compatibility policy;
- required/optional fields;
- invariants;
- error semantics;
- producer(s) and consumer(s);
- persistence/retention expectations;
- version migration or supersession behavior.

### Release and trust evidence

Release/trust records are append-only historical evidence, not living prose.

A receipt or release evidence document should be bound to a specific immutable revision. It should never be silently edited to represent a newer build.

Prefer versioned schemas such as:

- `DurableAssetPromotionReceipt/v1`;
- `AgentBehaviorConformanceReceipt/v1`;
- `LiveAgentBehaviorConformanceReceipt/v1`;
- `RuntimeSourceBinding/v1`;
- project-specific release receipts.

When a later run supersedes prior evidence, create a new receipt and link the relationship.

### roadmap.md

`roadmap.md` is the canonical planning surface for repository-level milestones.

Each roadmap phase should include:

- objective;
- entry conditions;
- deliverables;
- exit gate;
- evidence required;
- blockers/dependencies;
- explicit non-goals when scope could expand.

Avoid calendar promises unless there is a real delivery commitment. Prefer dependency order and verification gates to decorative quarters.

## Writing standards

### Write for verification

Prefer:

> PR #7 merged at `<sha>`. The trusted `main` workflow executed the credentialed provider job, but all provider credentials were absent, so the receipt recorded three `UNAVAILABLE / INCONCLUSIVE` outcomes.

Avoid:

> Multi-provider conformance is basically complete.

The first statement separates implementation from runtime proof and can be audited.

### Use precise verbs

Use:

- creates;
- validates;
- rejects;
- signs;
- verifies;
- persists;
- emits;
- resolves;
- deploys;
- blocks.

Avoid vague verbs such as "handles", "supports", or "manages" unless the surrounding text explains exactly what behavior is meant.

### Avoid duplicate terminology

Use one term for each concept. For Durable Assets, prefer the canonical lifecycle terms:

`CANDIDATE -> PROMOTED -> TESTED -> VERIFIED -> ACTIVE -> DEPRECATED`

Do not invent synonyms such as "approved-live", "published", or "certified asset" unless a separate state genuinely exists in the implementation.

### Explain failure semantics

Important workflows must document what happens when they fail.

Examples:

- missing provider credential -> `UNAVAILABLE / INCONCLUSIVE`;
- provider/API error -> `ERROR / INCONCLUSIVE`;
- behavior violates the Skill -> `FAIL`;
- wrong Skill/projection/task identity -> `INVALID_RUN` or provider identity error according to the contract;
- unknown/revoked signing key -> verification failure;
- unavailable deployment evidence -> deployment remains unverified.

### Distinguish examples from evidence

Label examples as examples. Synthetic fixtures are not production receipts. Test keys are not production KMS custody. Mock provider responses are not live provider behavior.

This distinction is mandatory in trust, security, and release documentation.

## Diagrams

Use diagrams when they clarify authority, data flow, state transitions, or dependencies.

Good diagram subjects:

- lifecycle state machine;
- trust/signing flow;
- provider conformance flow;
- deployment topology;
- authority boundaries;
- request/response sequence.

A diagram must match the text and current implementation. If updating one side changes the meaning, update the other in the same pull request.

Prefer text-based diagrams (Mermaid or fenced ASCII) when they are easy to review in Git. Avoid embedding screenshots of architecture diagrams as the only canonical representation.

## Links and references

Use repository-relative links for repository files.

Examples:

- `[Roadmap](../roadmap.md)` from `docs/`;
- `[Documentation standards](docs/DOCUMENTATION_STANDARDS.md)` from the root README;
- `[Durable Assets v1.2 design](docs/superpowers/specs/2026-08-25-durable-assets-v1-2-trust-replay-provenance-design.md)`.

Before merging documentation changes:

1. verify each referenced repository path exists;
2. remove links to generated artifacts that are not committed;
3. identify links that intentionally point to CI artifacts or external provider documentation;
4. avoid embedding expiring authenticated download URLs.

## Secrets and sensitive information

Never commit:

- API keys;
- access tokens;
- OAuth secrets;
- KMS private key material;
- passwords;
- signing credentials;
- secret-bearing environment dumps;
- raw customer/private data;
- temporary authenticated download URLs.

Documentation may name required secret variables, for example:

- `ANTHROPIC_API_KEY`;
- `OPENAI_API_KEY`;
- `GEMINI_API_KEY`.

It must not contain their values.

For CI, credentials should be available only to trusted revisions or approval-gated environments. Pull-request code must not automatically receive high-value provider or signing secrets.

## Documentation and agents

Agent-generated documentation is held to the same standard as human-authored documentation.

An agent must not:

- mark its own output verified without running the stated verification;
- convert a planned feature into an implemented claim;
- infer secret configuration from a successful infrastructure job;
- report live-provider behavior from mocks;
- rewrite immutable historical receipt evidence;
- silently replace canonical terminology;
- manufacture citations, SHAs, artifact IDs, or deployment identifiers.

When an agent cannot inspect a required boundary, it must state the limitation.

## Versioning and deprecation

When a contract or operational procedure changes materially:

1. determine whether the existing version remains compatible;
2. create a new schema/version when compatibility would otherwise be ambiguous;
3. identify migration behavior;
4. preserve prior receipts and evidence;
5. mark superseded documentation clearly;
6. update navigation to prefer the current version.

Do not erase history to make the repository look cleaner.

## Documentation review gate

A documentation change is ready to merge only when the reviewer can answer **yes** to the applicable checks below.

### Accuracy

- Does every implementation/status claim match the repository?
- Are exact versions/SHA references intentionally historical or current?
- Are planned items labeled planned?
- Are deployment/certification claims backed by evidence?

### Security

- Are secrets represented only by variable names, never values?
- Does documentation preserve credential/authority separation?
- Are examples clearly synthetic where appropriate?

### Navigation

- Do internal repository links resolve?
- Is there one obvious canonical document for each major topic?
- Does the README point to deeper sources instead of duplicating them?

### Maintainability

- Is the document concise enough to keep current?
- Are mutable external facts minimized or clearly time-scoped?
- Are ownership and update triggers obvious?
- Does the document avoid duplicating machine-enforced contracts?

### Evidence

- Are success claims backed by fresh verification where required?
- Are CI/artifact/receipt references immutable enough for their purpose?
- Does the text distinguish deterministic tests, live execution, deployment, and production certification?

## Update triggers

Review affected documentation whenever any of the following changes:

- lifecycle or schema semantics;
- authority policy;
- signing or verification algorithm;
- provider API/model contract;
- CI trust boundary;
- persistence format;
- deployment topology;
- public MCP tools;
- release/certification gate;
- committed Skill state;
- security-sensitive dependency or platform assumption.

Documentation that materially affects operation or assurance should change in the same pull request as the behavior whenever practical.

## Current repository-specific guidance

At the time this standard was introduced, the repository includes:

- the Intelligence Manifest React application;
- `packages/durable-assets/`;
- `packages/durable-assets-aws-kms/`;
- a committed `verification-before-completion` Skill under `.skills/`;
- deterministic and live-provider conformance contracts;
- a read-only provenance MCP implementation;
- trusted-main provider credential isolation in GitHub Actions.

This paragraph is orientation, not a permanent release receipt. Use `roadmap.md`, workflow evidence, receipts, and exact repository state for current status.