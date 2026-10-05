import {
  requirementMap,
  requirements,
  TASK,
} from "@/lib/sample-data";
import type { Decision, DiffLine, Disposition, Draft, Requirement } from "@/lib/types";

export const emptyDecision: Decision = { disposition: "unreviewed" };

export function decisionFor(
  draft: Draft | null | undefined,
  id: string,
): Decision {
  return draft?.decisions[id] ?? emptyDecision;
}

export function isAttention(requirement: Requirement, decision: Decision): boolean {
  if (decision.disposition === "supported" || decision.disposition === "spec_change") {
    return false;
  }
  if (decision.disposition === "unreviewed") return requirement.flagged;
  return true;
}

export function statusFor(requirement: Requirement, decision: Decision): {
  label: string;
  tone: "supported" | "divergence" | "unresolved" | "spec" | "idle";
} {
  switch (decision.disposition) {
    case "supported":
      return { label: "Supported", tone: "supported" };
    case "spec_change":
      return { label: "Spec change", tone: "spec" };
    case "review_pending":
      return { label: "Review pending", tone: "unresolved" };
    case "unresolved":
      return { label: "Unresolved", tone: "unresolved" };
    case "correction_sent":
      return { label: "Correction sent", tone: "unresolved" };
    default:
      if (requirement.evidenceClass === "confirmed_mismatch") {
        return { label: "Divergence", tone: "divergence" };
      }
      if (requirement.evidenceClass === "possible_intentional") {
        return { label: "Divergence", tone: "divergence" };
      }
      if (requirement.evidenceClass === "insufficient") {
        return { label: "Needs evidence", tone: "unresolved" };
      }
      return { label: "Unreviewed", tone: "idle" };
  }
}

export function versionsFor(requirement: Requirement, draft: Draft | null) {
  if (
    requirement.revised &&
    draft?.applied.includes(requirement.id) &&
    requirement.evidenceClass === "confirmed_mismatch"
  ) {
    return {
      codeRevision: requirement.revised.revision,
      specVersion: requirement.revised.specVersion,
    };
  }
  return {
    codeRevision: TASK.codeRevision,
    specVersion: requirement.evidence.specVersion,
  };
}

export function supportBlockReason(
  requirement: Requirement,
  draft: Draft | null,
): string | null {
  const decision = decisionFor(draft, requirement.id);
  if (decision.disposition === "supported") {
    const support = decision.support;
    return `${requirement.id} is already recorded as supported against ${support?.codeRevision} and spec ${support?.specVersion}.`;
  }
  if (decision.disposition === "spec_change") {
    return `${requirement.id} is recorded as an authorized spec change, not as support for spec ${requirement.evidence.specVersion}.`;
  }
  if (requirement.evidenceClass === "insufficient") {
    return `${requirement.id} cannot be marked met. There is no announcement trace and no focus check on ${TASK.codeRevision}. Investigate and gather that evidence first.`;
  }
  if (requirement.evidenceClass === "possible_intentional") {
    return `${requirement.id} cannot be recorded as support for spec ${requirement.evidence.specVersion}. The fraud-hold retry is not in that spec. Confirm an authorized spec change, or request a correction.`;
  }
  if (requirement.evidenceClass === "confirmed_mismatch") {
    const revised = Boolean(requirement.revised && draft?.applied.includes(requirement.id));
    const passed = decision.focusedCheck?.result === "pass" && revised;
    if (!passed) {
      return `${requirement.id} cannot be marked met. The notice on ${TASK.codeRevision} says the payment succeeded, which spec ${requirement.evidence.specVersion} forbids. Resolve the divergence and recheck the revised evidence first.`;
    }
  }
  return null;
}

export function evidenceLabels(requirement: Requirement, draft: Draft | null): string[] {
  const revised = Boolean(requirement.revised && draft?.applied.includes(requirement.id));
  const specVersion = revised
    ? requirement.revised!.specVersion
    : requirement.evidence.specVersion;
  const checks = revised ? requirement.revised!.checks : requirement.evidence.checks;
  const behavior = revised ? requirement.revised!.behavior : requirement.evidence.behavior;
  return [
    `Spec ${TASK.specId} ${specVersion}`,
    requirement.file,
    ...checks.map((check) => `Check: ${check.name} (${check.result})`),
    behavior,
  ];
}

export function meaningfulDisposition(disposition: Disposition): boolean {
  return disposition !== "unreviewed";
}

export function reviewSummary(decisions: Record<string, Decision>) {
  const rows = requirements.map((requirement) => ({
    requirement,
    decision: decisions[requirement.id] ?? emptyDecision,
  }));
  return {
    rows,
    supported: rows.filter((row) => row.decision.disposition === "supported").length,
    specChanges: rows.filter((row) => row.decision.disposition === "spec_change").length,
    pending: rows.filter((row) =>
      row.decision.disposition === "review_pending" ||
      row.decision.disposition === "correction_sent",
    ).length,
    unresolved: rows.filter((row) => row.decision.disposition === "unresolved").length,
    open: rows.filter((row) => isAttention(row.requirement, row.decision)).length,
  };
}

export function activeFileLines(
  file: { lines: DiffLine[]; revisedLines?: DiffLine[]; revisedWhen: string[] },
  applied: string[],
) {
  if (file.revisedLines && file.revisedWhen.some((id) => applied.includes(id))) {
    return file.revisedLines;
  }
  return file.lines;
}

export function requirementById(id: string): Requirement {
  const requirement = requirementMap[id];
  if (!requirement) throw new Error(`Unknown requirement ${id}`);
  return requirement;
}
