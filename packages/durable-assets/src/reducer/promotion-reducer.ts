import type { DurableAssetLifecycle } from "../schemas/common.v1.js";
import type { PromotionAuthorityKind } from "../schemas/integrity.v1.js";
import type { DurableAssetPromotionReceiptV1 } from "../schemas/promotion-receipt.v1.js";
import type { PromotionEventV1 } from "../schemas/promotion-event.v1.js";
import type {
  DurableAssetCandidateV1,
  DurableAssetRegistryEntryV1,
  DurableAssetRegistryV1,
} from "../schemas/registry.v1.js";

export const PROMOTION_POLICY = Object.freeze({
  minimumDistinctSessions: 3,
  existingAssetMergeThreshold: 0.92,
});

export const LIFECYCLE_TRANSITIONS: Readonly<Record<DurableAssetLifecycle, readonly DurableAssetLifecycle[]>> = Object.freeze({
  CANDIDATE: ["PROMOTED"],
  PROMOTED: ["TESTED"],
  TESTED: ["VERIFIED"],
  VERIFIED: ["ACTIVE"],
  ACTIVE: ["DEPRECATED"],
  DEPRECATED: [],
});

export interface PromotionReducerResult {
  state: DurableAssetRegistryV1;
  receipt?: DurableAssetPromotionReceiptV1;
  replayed: boolean;
}

export function createEmptyRegistry(now: string): DurableAssetRegistryV1 {
  return {
    schema: "DurableAssetRegistry/v1",
    revision: 0,
    processedEventIds: [],
    candidates: {},
    assets: {},
    updatedAt: now,
  };
}

export function reducePromotionEvent(
  state: DurableAssetRegistryV1,
  event: PromotionEventV1,
): PromotionReducerResult {
  if (state.processedEventIds.includes(event.eventId)) return { state, replayed: true };

  const next = applyEvent(state, event);
  const finalized: DurableAssetRegistryV1 = {
    ...next.state,
    revision: state.revision + 1,
    processedEventIds: [...state.processedEventIds, event.eventId],
    updatedAt: event.occurredAt,
  };
  return { state: finalized, replayed: false, ...(next.receipt ? { receipt: next.receipt } : {}) };
}

function applyEvent(
  state: DurableAssetRegistryV1,
  event: PromotionEventV1,
): Omit<PromotionReducerResult, "replayed"> {
  switch (event.type) {
    case "PATTERN_OBSERVED": return observePattern(state, event);
    case "PROMOTION_CLASSIFIED": return classifyPattern(state, event);
    case "EXISTING_ASSET_MATCHED": return matchExistingAsset(state, event);
    case "ASSET_PROMOTED": return promoteAsset(state, event);
    case "SECURITY_PROMOTION_AUTHORIZED": return authorizePromotion(state, event, "SECURITY");
    case "COMPLIANCE_PROMOTION_AUTHORIZED": return authorizePromotion(state, event, "COMPLIANCE");
    case "OPERATOR_PROMOTION_AUTHORIZED": return authorizePromotion(state, event, "OPERATOR");
    case "ASSET_MERGED": return mergeAsset(state, event);
    case "ASSET_VERSION_SUPERSEDED": return supersedeAsset(state, event);
    case "ASSET_TEST_RECORDED": return recordAssetTest(state, event);
    case "LIFECYCLE_TRANSITION_REQUESTED": return transitionAsset(state, event);
  }
}

function observePattern(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "PATTERN_OBSERVED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const existing = state.candidates[event.patternId];
  const evidenceRefs = dedupeEvidence([...(existing?.evidenceRefs ?? []), event.evidence]);
  const candidate: DurableAssetCandidateV1 = {
    patternId: event.patternId,
    semanticFingerprint: event.semanticFingerprint,
    evidenceRefs,
    occurrenceCount: evidenceRefs.length,
    distinctSessionCount: new Set(evidenceRefs.map((item) => item.sessionId)).size,
    firstSeenAt: existing?.firstSeenAt ?? event.occurredAt,
    lastSeenAt: event.occurredAt,
    proposedAssetType: event.proposedAssetType ?? existing?.proposedAssetType ?? null,
    existingAssetMatches: existing?.existingAssetMatches ?? [],
    temporaryContext: event.temporaryContext,
    reusable: event.reusable,
    mergedIntoAssetId: existing?.mergedIntoAssetId ?? null,
  };
  const nextState = withCandidate(state, candidate);
  const receipt = buildThresholdReceipt(candidate, event);
  return receipt ? { state: nextState, receipt } : { state: nextState };
}

function classifyPattern(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "PROMOTION_CLASSIFIED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const candidate = requireCandidate(state, event.patternId);
  return { state: withCandidate(state, { ...candidate, proposedAssetType: event.proposedAssetType, lastSeenAt: event.occurredAt }) };
}

function matchExistingAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "EXISTING_ASSET_MATCHED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  if (!state.assets[event.assetId]) throw new Error(`Cannot match missing asset: ${event.assetId}`);
  const candidate = requireCandidate(state, event.patternId);
  const matches = [
    ...candidate.existingAssetMatches.filter((item) => item.assetId !== event.assetId),
    { assetId: event.assetId, similarity: event.similarity },
  ].sort((a, b) => b.similarity - a.similarity);
  return { state: withCandidate(state, { ...candidate, existingAssetMatches: matches, lastSeenAt: event.occurredAt }) };
}

function promoteAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "ASSET_PROMOTED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  if (state.assets[event.assetId]) throw new Error(`Asset already exists: ${event.assetId}`);
  const candidate = requireCandidate(state, event.patternId);
  if (candidate.distinctSessionCount < PROMOTION_POLICY.minimumDistinctSessions) {
    throw new Error("Promotion requires three distinct sessions or a higher-authority promotion event.");
  }
  if (!candidate.reusable || candidate.temporaryContext) throw new Error("Non-reusable or temporary candidates cannot be promoted.");

  return { state: withAsset(state, createEntry({
    assetId: event.assetId,
    patternId: event.patternId,
    type: event.assetType,
    version: event.version,
    canonicalPath: event.canonicalPath,
    semanticFingerprint: candidate.semanticFingerprint,
    description: event.description,
    evidenceRefs: candidate.evidenceRefs,
    occurredAt: event.occurredAt,
    promotionAuthority: null,
  })) };
}

function authorizePromotion(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: `${PromotionAuthorityKind}_PROMOTION_AUTHORIZED` }>,
  kind: PromotionAuthorityKind,
): Omit<PromotionReducerResult, "replayed"> {
  if (state.assets[event.assetId]) throw new Error(`Asset already exists: ${event.assetId}`);
  const entry = createEntry({
    assetId: event.assetId,
    patternId: event.patternId,
    type: event.assetType,
    version: event.version,
    canonicalPath: event.canonicalPath,
    semanticFingerprint: event.semanticFingerprint,
    description: event.description,
    evidenceRefs: event.evidenceRefs,
    occurredAt: event.occurredAt,
    promotionAuthority: { kind, authorityRef: event.authorityRef, actorId: event.actorId },
  });
  return { state: withAsset(state, entry) };
}

function mergeAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "ASSET_MERGED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const target = requireAsset(state, event.targetAssetId);
  if (target.lifecycle === "DEPRECATED") throw new Error(`Cannot merge into deprecated asset: ${target.assetId}`);
  const candidate = requireCandidate(state, event.patternId);
  if (candidate.mergedIntoAssetId && candidate.mergedIntoAssetId !== target.assetId) {
    throw new Error(`Candidate ${candidate.patternId} is already merged into ${candidate.mergedIntoAssetId}.`);
  }

  const updatedTarget: DurableAssetRegistryEntryV1 = {
    ...target,
    evidenceRefs: dedupeEvidence([...target.evidenceRefs, ...candidate.evidenceRefs]),
    mergedPatternIds: uniqueSorted([...target.mergedPatternIds, candidate.patternId]),
    updatedAt: event.occurredAt,
  };
  return {
    state: {
      ...state,
      assets: { ...state.assets, [target.assetId]: updatedTarget },
      candidates: {
        ...state.candidates,
        [candidate.patternId]: { ...candidate, mergedIntoAssetId: target.assetId, lastSeenAt: event.occurredAt },
      },
    },
  };
}

function supersedeAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "ASSET_VERSION_SUPERSEDED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const previous = requireAsset(state, event.previousAssetId);
  if (previous.lifecycle === "DEPRECATED") throw new Error(`Cannot supersede deprecated asset: ${previous.assetId}`);
  if (state.assets[event.assetId]) throw new Error(`Asset already exists: ${event.assetId}`);
  if (compareSemver(event.version, previous.version) <= 0) throw new Error("Superseding version must be greater than the previous version.");

  const replacement: DurableAssetRegistryEntryV1 = {
    ...createEntry({
      assetId: event.assetId,
      patternId: previous.patternId,
      type: previous.type,
      version: event.version,
      canonicalPath: event.canonicalPath,
      semanticFingerprint: event.semanticFingerprint,
      description: event.description,
      evidenceRefs: dedupeEvidence([...previous.evidenceRefs, ...event.evidenceRefs]),
      occurredAt: event.occurredAt,
      promotionAuthority: previous.promotionAuthority,
    }),
    activation: previous.activation,
    mergedPatternIds: previous.mergedPatternIds,
    supersedes: [previous.assetId],
  };
  const predecessor = { ...previous, supersededBy: replacement.assetId, updatedAt: event.occurredAt };
  return { state: { ...state, assets: { ...state.assets, [predecessor.assetId]: predecessor, [replacement.assetId]: replacement } } };
}

function recordAssetTest(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "ASSET_TEST_RECORDED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const asset = requireAsset(state, event.assetId);
  if (asset.lifecycle === "DEPRECATED") throw new Error(`Cannot record tests against deprecated asset: ${event.assetId}`);
  const tests = [
    ...asset.tests.filter((test) => test.id !== event.testId),
    { id: event.testId, type: event.testType, status: event.status },
  ].sort((a, b) => a.id.localeCompare(b.id));
  return { state: withAsset(state, { ...asset, tests, updatedAt: event.occurredAt }) };
}

function transitionAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "LIFECYCLE_TRANSITION_REQUESTED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const asset = requireAsset(state, event.assetId);
  if (!LIFECYCLE_TRANSITIONS[asset.lifecycle].includes(event.to)) {
    throw new Error(`Invalid lifecycle transition: ${asset.lifecycle} -> ${event.to}`);
  }
  if ((event.to === "VERIFIED" || event.to === "ACTIVE") && !hasRequiredPassingTests(asset)) {
    throw new Error(`${event.to} requires passing trigger, output, and failure-path tests.`);
  }

  const assets = { ...state.assets, [asset.assetId]: { ...asset, lifecycle: event.to, updatedAt: event.occurredAt } };
  if (event.to === "ACTIVE") {
    for (const predecessorId of asset.supersedes) {
      const predecessor = assets[predecessorId];
      if (predecessor?.supersededBy === asset.assetId) {
        assets[predecessorId] = { ...predecessor, lifecycle: "DEPRECATED", updatedAt: event.occurredAt };
      }
    }
  }
  return { state: { ...state, assets } };
}

function createEntry(input: {
  assetId: string;
  patternId: string;
  type: DurableAssetRegistryEntryV1["type"];
  version: string;
  canonicalPath: string;
  semanticFingerprint: string;
  description: string;
  evidenceRefs: DurableAssetRegistryEntryV1["evidenceRefs"];
  occurredAt: string;
  promotionAuthority: DurableAssetRegistryEntryV1["promotionAuthority"];
}): DurableAssetRegistryEntryV1 {
  return {
    assetId: input.assetId,
    patternId: input.patternId,
    type: input.type,
    version: input.version,
    lifecycle: "PROMOTED",
    canonicalPath: input.canonicalPath,
    semanticFingerprint: input.semanticFingerprint,
    description: input.description,
    activation: { triggers: [], exclusions: [] },
    evidenceRefs: input.evidenceRefs,
    tests: [],
    promotionAuthority: input.promotionAuthority,
    mergedPatternIds: [],
    supersedes: [],
    supersededBy: null,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  };
}

function buildThresholdReceipt(
  candidate: DurableAssetCandidateV1,
  event: Extract<PromotionEventV1, { type: "PATTERN_OBSERVED" }>,
): DurableAssetPromotionReceiptV1 | undefined {
  if (candidate.distinctSessionCount < PROMOTION_POLICY.minimumDistinctSessions) return undefined;
  const best = candidate.existingAssetMatches[0];
  const decision = !candidate.reusable || candidate.temporaryContext
    ? "REJECT"
    : best && best.similarity >= PROMOTION_POLICY.existingAssetMergeThreshold
      ? "MERGE_EXISTING"
      : candidate.proposedAssetType ? "PROMOTE" : undefined;
  if (!decision) return undefined;
  return {
    schema: "DurableAssetPromotionReceipt/v1",
    receiptId: event.eventId,
    patternId: candidate.patternId,
    semanticFingerprint: candidate.semanticFingerprint,
    occurrenceCount: candidate.occurrenceCount,
    distinctSessionCount: candidate.distinctSessionCount,
    decision,
    assetType: candidate.proposedAssetType,
    targetAssetId: best?.assetId ?? null,
    canonicalPath: null,
    evidenceRefs: candidate.evidenceRefs,
    supersedes: [],
    validationStatus: "PENDING",
    reasonCodes: [
      "THREE_SESSION_THRESHOLD",
      ...(!candidate.reusable ? ["LOW_REUSABILITY" as const] : []),
      ...(candidate.temporaryContext ? ["TEMPORARY_CONTEXT" as const] : []),
      ...(best ? ["EXISTING_ASSET_MATCH" as const] : []),
    ],
    createdAt: event.occurredAt,
    reducerVersion: "1.1.0",
  };
}

function withCandidate(state: DurableAssetRegistryV1, candidate: DurableAssetCandidateV1): DurableAssetRegistryV1 {
  return { ...state, candidates: { ...state.candidates, [candidate.patternId]: candidate } };
}

function withAsset(state: DurableAssetRegistryV1, asset: DurableAssetRegistryEntryV1): DurableAssetRegistryV1 {
  return { ...state, assets: { ...state.assets, [asset.assetId]: asset } };
}

function requireCandidate(state: DurableAssetRegistryV1, patternId: string): DurableAssetCandidateV1 {
  const candidate = state.candidates[patternId];
  if (!candidate) throw new Error(`Missing candidate: ${patternId}`);
  return candidate;
}

function requireAsset(state: DurableAssetRegistryV1, assetId: string): DurableAssetRegistryEntryV1 {
  const asset = state.assets[assetId];
  if (!asset) throw new Error(`Missing asset: ${assetId}`);
  return asset;
}

function dedupeEvidence<T extends { occurrenceId: string }>(items: readonly T[]): T[] {
  const unique = new Map<string, T>();
  for (const item of items) unique.set(item.occurrenceId, item);
  return [...unique.values()];
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function compareSemver(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const delta = (a[index] ?? 0) - (b[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function hasRequiredPassingTests(asset: DurableAssetRegistryEntryV1): boolean {
  const required = new Set(["POSITIVE_TRIGGER", "NEGATIVE_TRIGGER", "AMBIGUOUS_TRIGGER", "OUTPUT_CONTRACT", "FAILURE_PATH"]);
  const passed = new Set(asset.tests.filter((test) => test.status === "PASSED").map((test) => test.type));
  return [...required].every((type) => passed.has(type as typeof asset.tests[number]["type"]));
}
