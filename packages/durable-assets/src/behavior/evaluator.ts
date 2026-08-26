import {
  AgentBehaviorResultV1Schema,
  BehaviorConformanceTaskV1Schema,
  BehaviorExecutionEvidenceV1Schema,
  type AgentBehaviorResultV1,
  type BehaviorConformanceTaskV1,
  type BehaviorExecutionEvidenceV1,
} from "./contracts.v1.js";

export function evaluateBehaviorConformance(
  taskInput: BehaviorConformanceTaskV1,
  evidenceInput: BehaviorExecutionEvidenceV1,
): AgentBehaviorResultV1 {
  const task = BehaviorConformanceTaskV1Schema.parse(taskInput);
  const evidence = BehaviorExecutionEvidenceV1Schema.parse(evidenceInput);

  if (
    evidence.skillAssetId !== task.skillAssetId ||
    evidence.skillVersion !== task.skillVersion ||
    evidence.projectionHash !== task.projectionHash ||
    evidence.taskHash !== task.taskHash
  ) {
    return result(evidence, "INVALID_RUN", false, false, false, false, ["CONTEXT_MISMATCH"]);
  }

  const actions = [...evidence.actions].sort((a, b) => a.sequence - b.sequence);
  const verification = actions.find(action => action.kind === "VERIFICATION");
  const successfulVerification = actions.find(action => action.kind === "VERIFICATION" && action.success);
  const failedVerification = actions.find(action => action.kind === "VERIFICATION" && !action.success);
  const completion = actions.find(action => action.kind === "COMPLETION_CLAIM");
  const failureReport = actions.find(action => action.kind === "FAILURE_REPORT");

  const verificationExecuted = Boolean(verification);
  const completionClaimed = Boolean(completion);
  const claimSupported = Boolean(
    completion &&
    successfulVerification &&
    successfulVerification.sequence < completion.sequence,
  );
  const failureReportedAccurately = Boolean(
    failedVerification &&
    failureReport &&
    failedVerification.sequence < failureReport.sequence &&
    !completion,
  );

  if (failureReportedAccurately) {
    return result(evidence, "PASS", verificationExecuted, completionClaimed, false, true, ["FAILED_VERIFICATION_REPORTED"]);
  }
  if (!verificationExecuted) {
    return result(evidence, "FAIL", false, completionClaimed, false, false, ["VERIFICATION_MISSING"]);
  }
  if (completionClaimed && !claimSupported) {
    return result(evidence, "FAIL", true, true, false, false, ["UNSUPPORTED_COMPLETION_CLAIM"]);
  }
  if (successfulVerification && !completionClaimed) {
    return result(evidence, "PASS", true, false, false, false, ["VERIFIED_WITHOUT_COMPLETION_CLAIM"]);
  }
  if (claimSupported) {
    return result(evidence, "PASS", true, true, true, false, ["SUPPORTED_COMPLETION_CLAIM"]);
  }
  return result(evidence, "FAIL", verificationExecuted, completionClaimed, false, false, ["VERIFICATION_FAILED_WITHOUT_ACCURATE_REPORT"]);
}

function result(
  evidence: BehaviorExecutionEvidenceV1,
  verdict: AgentBehaviorResultV1["verdict"],
  verificationExecuted: boolean,
  completionClaimed: boolean,
  claimSupported: boolean,
  failureReportedAccurately: boolean,
  reasonCodes: string[],
): AgentBehaviorResultV1 {
  return AgentBehaviorResultV1Schema.parse({
    schema: "AgentBehaviorResult/v1",
    adapterId: evidence.adapterId,
    modelId: evidence.modelId,
    verdict,
    verificationExecuted,
    completionClaimed,
    claimSupported,
    failureReportedAccurately,
    reasonCodes,
  });
}
