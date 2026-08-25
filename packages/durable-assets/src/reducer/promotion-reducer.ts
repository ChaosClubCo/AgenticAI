import type { DurableAssetLifecycle } from "../schemas/common.v1.js";
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
  if (state.processedEventIds.includes(event.eventId)) {
    return { state, replayed: true };
  }

  const next = applyEvent(state, event);
  const finalized: DurableAssetRegistryV1 = {
    ...next.state,
    revision: state.revision + 1,
    processedEventIds: [...state.processedEventIds, event.eventId],
    updatedAt: event.occurredAt,
  };

  return {
    state: finalized,
    replayed: false,
    ...(next.receipt ? { receipt: next.receipt } : {}),
  };
}

function applyEvent(
  state: DurableAssetRegistryV1,
  event: PromotionEventV1,
): Omit<PromotionReducerResult, "replayed"> {
  switch (event.type) {
    case "PATTERN_OBSERVED":
      return observePattern(state, event);
    case "PROMOTION_CLASSIFIED":
      return classifyPattern(state, event);
    case "EXISTING_ASSET_MATCHED":
      return matchExistingAsset(state, event);
    case "ASSET_PROMOTED":
      return promoteAsset(state, event);
    case "LIFECYCLE_TRANSITION_REQUESTED":
      return transitionAsset(state, event);
  }
}

function observePattern(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "PATTERN_OBSERVED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const existing = state.candidates[event.patternId];
  const evidenceRefs = dedupeEvidence([
    ...(existing?.evidenceRefs ?? []),
    event.evidence,
  ]);
  const distinctSessionCount = new Set(evidenceRefs.map((item) => item.sessionId)).size;

  const candidate: DurableAssetCandidateV1 = {
    patternId: event.patternId,
    semanticFingerprint: event.semanticFingerprint,
    evidenceRefs,
    occurrenceCount: evidenceRefs.length,
    distinctSessionCount,
    firstSeenAt: existing?.firstSeenAt ?? event.occurredAt,
    lastSeenAt: event.occurredAt,
    proposedAssetType: event.proposedAssetType ?? existing?.proposedAssetType ?? null,
    existingAssetMatches: existing?.existingAssetMatches ?? [],
    temporaryContext: event.temporaryContext,
    reusable: event.reusable,
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
  return {
    state: withCandidate(state, {
      ...candidate,
      proposedAssetType: event.proposedAssetType,
      lastSeenAt: event.occurredAt,
    }),
  };
}

function matchExistingAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "EXISTING_ASSET_MATCHED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  if (!state.assets[event.assetId]) {
    throw new Error(`Cannot match missing asset: ${event.assetId}`);
  }
  const candidate = requireCandidate(state, event.patternId);
  const matches = [
    ...candidate.existingAssetMatches.filter((item) => item.assetId !== event.assetId),
    { assetId: event.assetId, similarity: event.similarity },
  ].sort((a, b) => b.similarity - a.similarity);

  return {
    state: withCandidate(state, {
      ...candidate,
      existingAssetMatches: matches,
      lastSeenAt: event.occurredAt,
    }),
  };
}

function promoteAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "ASSET_PROMOTED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  if (state.assets[event.assetId]) {
    throw new Error(`Asset already exists: ${event.assetId}`);
  }
  const candidate = requireCandidate(state, event.patternId);
  if (candidate.distinctSessionCount < PROMOTION_POLICY.minimumDistinctSessions) {
    throw new Error("Promotion requires three distinct sessions or a separate higher-authority event type.");
  }
  if (!candidate.reusable || candidate.temporaryContext) {
    throw new Error("Non-reusable or temporary candidates cannot be promoted.");
  }

  const entry: DurableAssetRegistryEntryV1 = {
    assetId: event.assetId,
    patternId: event.patternId,
    type: event.assetType,
    version: event.version,
    lifecycle: "PROMOTED",
    canonicalPath: event.canonicalPath,
    semanticFingerprint: candidate.semanticFingerprint,
    description: event.description,
    activation: { triggers: [], exclusions: [] },
    evidenceRefs: candidate.evidenceRefs,
    tests: [],
    supersedes: [],
    createdAt: event.occurredAt,
    updatedAt: event.occurredAt,
  };

  return {
    state: {
      ...state,
      assets: { ...state.assets, [entry.assetId]: entry },
    },
  };
}

function transitionAsset(
  state: DurableAssetRegistryV1,
  event: Extract<PromotionEventV1, { type: "LIFECYCLE_TRANSITION_REQUESTED" }>,
): Omit<PromotionReducerResult, "replayed"> {
  const asset = state.assets[event.assetId];
  if (!asset) throw new Error(`Missing asset: ${event.assetId}`);

  const allowed = LIFECYCLE_TRANSITIONS[asset.lifecycle];
  if (!allowed.includes(event.to)) {
    throw new Error(`Invalid lifecycle transition: ${asset.lifecycle} -> ${event.to}`);
  }

  if (event.to === "ACTIVE" && !hasRequiredPassingTests(asset)) {
    throw new Error("Activation requires passing trigger, output, and failure-path tests.");
  }

  return {
    state: {
      ...state,
      assets: {
        ...state.assets,
        [asset.assetId]: { ...asset, lifecycle: event.to, updatedAt: event.occurredAt },
      },
    },
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
      ? "UPDATE_EXISTING"
      : candidate.proposedAssetType
        ? "PROMOTE"
        : undefined;
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
    reducerVersion: "1.0.0",
  };
}

function withCandidate(
  state: DurableAssetRegistryV1,
  candidate: DurableAssetCandidateV1,
): DurableAssetRegistryV1 {
  return {
    ...state,
    candidates: { ...state.candidates, [candidate.patternId]: candidate },
  };
}

function requireCandidate(state: DurableAssetRegistryV1, patternId: string): DurableAssetCandidateV1 {
  const candidate = state.candidates[patternId];
  if (!candidate) throw new Error(`Missing candidate: ${patternId}`);
  return candidate;
}

function dedupeEvidence<T extends { occurrenceId: string }>(items: readonly T[]): T[] {
  const unique = new Map<string, T>();
  for (const item of items) unique.set(item.occurrenceId, item);
  return [...unique.values()];
}

function hasRequiredPassingTests(asset: DurableAssetRegistryEntryV1): boolean {
  const required = new Set(["POSITIVE_TRIGGER", "NEGATIVE_TRIGGER", "AMBIGUOUS_TRIGGER", "OUTPUT_CONTRACT", "FAILURE_PATH"]);
  const passed = new Set(asset.tests.filter((test) => test.status === "PASSED").map((test) => test.type));
  return [...required].every((type) => passed.has(type as typeof asset.tests[number]["type"]));
}
