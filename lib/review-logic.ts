import { conceptNotes, items, SPEC, TASK } from "@/lib/sample-data";
import type { DiffLine, Draft, FileDoc, ItemState, ReviewItem, Tone } from "@/lib/types";

const empty: ItemState = {};

export function stateFor(draft: Pick<Draft, "items"> | null | undefined, id: string): ItemState {
  return draft?.items[id] ?? empty;
}

export function currentRevision(revisions: string[] | undefined) {
  return revisions?.at(-1) ?? TASK.baseRevision;
}

export function statusFor(item: ReviewItem, state: ItemState): { label: string; tone: Tone } {
  switch (item.kind) {
    case "confirm":
      return state.confirmed
        ? { label: "Confirmed", tone: "confirmed" }
        : { label: "Ready to confirm", tone: "idle" };
    case "correct":
      if (state.confirmed) return { label: "Corrected · Confirmed", tone: "confirmed" };
      if (state.check) return { label: "Corrected", tone: "confirmed" };
      if (state.unresolved) return { label: "Kept open", tone: "waiting" };
      if (state.revisionReady) return { label: "Fix ready to recheck", tone: "open" };
      if (state.correction) return { label: "Correction sent", tone: "open" };
      return { label: "Needs a fix", tone: "problem" };
    case "product":
      return state.decision
        ? { label: "Decision recorded", tone: "decision" }
        : { label: "Your call", tone: "problem" };
    case "evidence":
      if (state.person) return { label: "Waiting on a person", tone: "waiting" };
      if (state.unresolved) return { label: "Kept open", tone: "waiting" };
      if (state.research?.status === "running") return { label: "Agent researching", tone: "open" };
      if (state.research?.status === "done") return { label: "Research back", tone: "open" };
      return { label: "Not enough evidence", tone: "problem" };
  }
}

/** Settled means you acted on it: closed, decided, or left open on purpose. */
export function isSettled(item: ReviewItem, state: ItemState) {
  if (item.kind === "confirm" || item.kind === "correct") {
    return Boolean(state.confirmed || state.unresolved);
  }
  if (item.kind === "product") return Boolean(state.decision);
  return Boolean(state.person || state.unresolved);
}

export function reviewSummary(snapshot: Pick<Draft, "items" | "noted"> | null | undefined) {
  const rows = items.map((item) => ({ item, state: stateFor(snapshot, item.id) }));
  return {
    rows,
    settled: rows.filter((row) => isSettled(row.item, row.state)).length,
    total: rows.length,
    confirmed: rows.filter((row) => row.state.confirmed).length,
    decisions: rows.filter((row) => row.state.decision).length,
    waiting: rows.filter((row) => row.state.person).length,
    unresolved: rows.filter((row) => row.state.unresolved).length,
    noted: snapshot?.noted.length ?? 0,
    notes: conceptNotes.length,
  };
}

export function hasAnything(draft: Draft) {
  return (
    draft.noted.length > 0 ||
    Object.values(draft.items).some((state) => Object.keys(state).length > 0)
  );
}

export function activeFileLines(file: FileDoc, revisions: string[]): DiffLine[] {
  if (file.variant && revisions.includes(file.variant.revision)) return file.variant.lines;
  return file.lines;
}

export function specVersion(draft: Pick<Draft, "items"> | null | undefined) {
  const decision = stateFor(draft, "R3").decision;
  if (decision?.choice === "accept") {
    return { version: SPEC.proposed, r3Line: SPEC.R3proposed, changedAt: decision.at };
  }
  return { version: SPEC.current, r3Line: SPEC.R3, changedAt: null };
}

export function specDoc(draft: Pick<Draft, "items"> | null | undefined) {
  const spec = specVersion(draft);
  return [
    "# Checkout retry",
    "",
    spec.changedAt
      ? `Version ${spec.version} · updated ${spec.changedAt} when you accepted Harbor's fraud-hold retry. Supersedes ${SPEC.current}.`
      : `Version ${spec.version} · Priya Shah · Oct 3, 2026`,
    `Applies to the card form in ${TASK.repo}. Your ask to Harbor was one sentence; these lines show on the items they apply to.`,
    "",
    "## R1 · Form stays editable",
    "",
    SPEC.R1,
    "",
    "## R2 · Notice does not claim success",
    "",
    SPEC.R2,
    "",
    `## R3 · ${spec.changedAt ? "Retry for soft declines and fraud holds" : "Retry only for soft declines"}`,
    "",
    spec.r3Line,
    "",
    "## R4 · Announce, then move focus",
    "",
    SPEC.R4,
    "",
    "## R5 · Clear the notice after success",
    "",
    SPEC.R5,
  ].join("\n");
}
