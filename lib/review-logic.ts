import { conceptNotes, items, TASK, TICKET_LINES } from "@/lib/sample-data";
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

export function ticketVersion(draft: Pick<Draft, "items"> | null | undefined) {
  const decision = stateFor(draft, "unassign").decision;
  if (decision?.choice === "accept") {
    return { version: "v2", restoreLine: TICKET_LINES.restoreV2, changedAt: decision.at };
  }
  return { version: "v1", restoreLine: TICKET_LINES.restoreV1, changedAt: null };
}

export function ticketDoc(draft: Pick<Draft, "items"> | null | undefined) {
  const ticket = ticketVersion(draft);
  return [
    `# ${TASK.ticket} · Archive projects`,
    "",
    `Version ${ticket.version}${ticket.changedAt ? ` · updated ${ticket.changedAt} when you accepted Harbor's task behavior` : " · from the team board"}`,
    "Two lines. This is all that was written down. Your ask to Harbor was one sentence.",
    "",
    "## Written requirements",
    "",
    `- ${TICKET_LINES.hide}`,
    `- ${ticket.restoreLine}`,
  ].join("\n");
}
