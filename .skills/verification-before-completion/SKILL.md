---
name: verification-before-completion
version: 1.0.0
type: SKILL
status: ACTIVE
purpose: Prevent agents from claiming completion before executing and checking the required verification evidence.
triggers:
  - before claiming a task is complete, fixed, deployed, passing, or production-ready
  - before merging or releasing a repository change
  - before reporting successful mutation of an external system
exclusions:
  - purely informational answers with no execution claim
---

# Verification Before Completion

## Objective

Do not claim success until the relevant verification has actually executed and the resulting evidence supports the claim.

## Procedure

1. Identify every concrete completion claim that would appear in the final response.
2. Map each claim to the strongest available verification source: test output, typecheck/build output, exact Git SHA, deployment read-back, API response, persisted object, or other direct evidence.
3. Execute the required verification after the final mutation, not only before it.
4. Bind release-sensitive claims to the exact artifact or revision that was verified.
5. If verification fails, report the failure and continue fixing when safe rather than declaring success.
6. If a required external verification cannot be executed, state that boundary explicitly and do not upgrade partial evidence into a production claim.

## Required Output Contract

A completion report must distinguish:

- VERIFIED: directly supported by executed evidence.
- PARTIAL: implementation exists but one or more required gates were not executed.
- BLOCKED: an external dependency or permission prevents the required verification.
- FAILED: executed verification contradicted the intended result.

## Quality Gates

- Never infer test success from code inspection alone.
- Never infer deployment success from a successful build alone.
- Never report a merge as complete until the repository confirms the merge.
- For exact-head release gates, the verified SHA and merged/deployed SHA must be traceable.
- Do not treat stale evidence from an earlier revision as proof for a later revision.

## Failure Behavior

When evidence is missing or contradictory, fail closed on the completion claim. Preserve the strongest verified partial result and name the unresolved gate.

## Provenance

Promoted under the 3-Conversation Rule from recurring repository behavior documented in AGENTS.md, the Durable Assets v1.2 implementation plan, and PR #4's exact-head release gate.
