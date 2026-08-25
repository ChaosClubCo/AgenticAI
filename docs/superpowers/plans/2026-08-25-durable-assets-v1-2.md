# Durable Assets v1.2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add externally attestable checkpoints, verified snapshot replay, Git materialization verification, scoped authority policy, read-only provenance MCP tools, and Claude/Codex/Gemini adapter conformance.

**Architecture:** Keep immutable promotion events as canonical history and the reducer deterministic. Add trust, replay, Git, authorization, provenance, and adapter layers around the existing projection; provider/KMS integration remains behind signer/verifier interfaces.

**Tech Stack:** TypeScript strict mode, Zod 4, Node crypto/fs/child_process, MCP Server v2, node:test.

**Spec:** `docs/superpowers/specs/2026-08-25-durable-assets-v1-2-trust-replay-provenance-design.md`

## Global Constraints

- Fail closed on invalid signed snapshots unless `REPLAY_FROM_ZERO` is explicitly selected.
- Private signing keys never enter registry state, event state, or MCP payloads.
- Authority is identity + kind + asset-type scoped and deny-by-default.
- Git verification hashes exact committed bytes.
- Agent adapters consume ACTIVE assets only and cannot mutate lifecycle state.
- Existing v1/v1.1 wire contracts remain compatible except additive authority provenance fields on newly emitted privileged events.

---

### Task 1: Acceptance contracts and signing
**Files:** create `src/schemas/trust.v1.ts`, `src/integrity/checkpoint-signing.ts`, `src/durable-assets-v1-2.test.ts`.
**Produces:** signed checkpoint, snapshot, materialization verification, authority policy, conformance schemas plus Ed25519 signer/verifier.
- [ ] Write failing signing/contract tests.
- [ ] Run `npm run check` and confirm missing-module failures.
- [ ] Implement schemas and signing.
- [ ] Re-run checks.

### Task 2: Verified snapshot replay
**Files:** create `src/projection/verified-replay.ts`.
**Consumes:** signed checkpoint verifier and existing reducer/projection.
**Produces:** snapshot creation/verification and replay from cursor.
- [ ] Add equivalence, tamper, cursor, and fallback tests.
- [ ] Implement minimal replay path.
- [ ] Re-run checks.

### Task 3: Git materialization verification
**Files:** create `src/integrity/git-materialization-verifier.ts`.
**Produces:** `GitObjectReader`, safe Git CLI adapter, exact-byte receipt verifier.
- [ ] Add match/mismatch/path tests.
- [ ] Implement reader and verifier.
- [ ] Re-run checks.

### Task 4: Authority policy
**Files:** create `src/authority/authority-policy.ts`; modify `src/schemas/promotion-event.v1.ts`, `src/mcp/promotion-tools.ts`.
**Produces:** policy validation/evaluation and policy provenance on privileged events.
- [ ] Add allow/deny tests.
- [ ] Implement deny-by-default evaluator.
- [ ] Bind privileged events to principal/policy hash/revision.
- [ ] Re-run checks.

### Task 5: Provenance MCP capability split
**Files:** create `src/mcp/provenance-tools.ts`; modify `src/mcp/server.ts`.
**Produces:** lineage, checkpoint verification, receipt verification, active registry, projection status, policy reads without write dependencies.
- [ ] Add read-only handler tests.
- [ ] Implement provenance handlers and independent registration.
- [ ] Ensure mutation/authority tools remain capability-gated.
- [ ] Re-run checks.

### Task 6: Cross-agent adapters
**Files:** create `src/adapters/agent-adapters.ts`.
**Produces:** Claude/Codex/Gemini pure adapters and conformance manifest runner.
- [ ] Add shared fixture matrix.
- [ ] Implement ACTIVE-only canonical resolver.
- [ ] Verify identical normalized asset sets/projection hashes.
- [ ] Re-run checks.

### Task 7: Public exports and release gate
**Files:** modify `src/index.ts`, package metadata only if needed.
- [ ] Export v1.2 surfaces.
- [ ] Run `npm run check`.
- [ ] Verify v1.1 regression suite remains green.
- [ ] Open PR and require exact-head CI before merge.
