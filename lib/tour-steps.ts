import type { TourCue } from "@/lib/tour-cues";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  targets: string[];
  cue: TourCue;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "A review after the agent",
    body: "SWEflow is where you check finished agent work against the spec. The sample task is checkout retry copy. This is not a checkout product.",
    targets: ["welcome"],
    cue: { kind: "welcome" },
  },
  {
    id: "task",
    title: "Open the review",
    body: "The task shows spec checkout-retry 3.2, the revisions, and Maya Chen’s prior review. That older review does not cover this revision.",
    targets: ["task"],
    cue: { kind: "task" },
  },
  {
    id: "evidence",
    title: "Pick a requirement",
    body: "R1 is selected. Beside the diff: the spec text, the affected code, the history, the checks, and the behavior.",
    targets: ["evidence", "diff"],
    cue: { kind: "requirement", id: "R1", view: "evidence" },
  },
  {
    id: "support",
    title: "Record support",
    body: "Support applies only to this requirement, this code revision, and this spec version. It does not approve any other requirement.",
    targets: ["support"],
    cue: { kind: "requirement", id: "R1", view: "evidence" },
  },
  {
    id: "mismatch",
    title: "A confirmed mismatch",
    body: "R2 disagrees with the spec. The banner says the payment succeeded. Request a correction so Harbor changes that copy.",
    targets: ["mismatch"],
    cue: { kind: "requirement", id: "R2", view: "resolve" },
  },
  {
    id: "spec",
    title: "A possible spec change",
    body: "R3 may be intentional. Name the approver and the approved version, or request a correction if nobody authorized it.",
    targets: ["spec-change"],
    cue: { kind: "requirement", id: "R3", view: "resolve" },
  },
  {
    id: "unresolved",
    title: "Not enough evidence",
    body: "Do not mark R4 met. Keep the question, what is missing, and an owner. A peer is only for this gap: spec to a PM or designer, architecture to a tech lead or code owner, behavior to a reviewer or QA.",
    targets: ["unresolved"],
    cue: { kind: "requirement", id: "R4", view: "peer" },
  },
  {
    id: "save",
    title: "Save, then resume",
    body: "Save stores the findings in this browser. Close the review, then Resume brings back the same record.",
    targets: ["save"],
    cue: { kind: "save" },
  },
  {
    id: "reset",
    title: "Reset the demo",
    body: "Reset demo is in the top bar. One confirm clears the saved review so you can run this concept test again from the start.",
    targets: ["reset"],
    cue: { kind: "reset" },
  },
];
