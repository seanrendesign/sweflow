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
    title: "Harbor finished while you were away",
    body: "This is version 2, the guided review, on the same checkout retry copy task as v1. You asked Harbor one casual thing. Now you check what it did, one item at a time. You still make the final call.",
    targets: ["welcome"],
    cue: { kind: "welcome" },
  },
  {
    id: "context",
    title: "What you asked, what it finished, what it is unsure about",
    body: "Your ask was one sentence. Lines from spec checkout-retry 3.2 show up only on the items they apply to.",
    targets: ["context"],
    cue: { kind: "overview" },
  },
  {
    id: "piles",
    title: "Two piles",
    body: "Looks right, confirm: R1 and R5, with evidence attached. Needs your judgment: R2, R3, and R4. Each item says why it is in its pile and what closes it.",
    targets: ["piles"],
    cue: { kind: "overview" },
  },
  {
    id: "confirm",
    title: "Confirm a looks-right item",
    body: "R1 is what happens right after a decline: the form stays editable. You see what changed and the check. Confirm records R1 on this revision only.",
    targets: ["item-detail", "diff"],
    cue: { kind: "item", id: "R1" },
  },
  {
    id: "correct",
    title: "Correct it yourself",
    body: "R2: the friendlier banner says the payment succeeded. Send Harbor a correction, recheck its fix, and R2 becomes Corrected, then Confirmed.",
    targets: ["item-actions"],
    cue: { kind: "item", id: "R2" },
  },
  {
    id: "product",
    title: "A product choice, before and after",
    body: "R3: Harbor let suspected_fraud retry on its own. Before and after sit side by side. Accept and the spec becomes 3.3. Keep the old behavior and Harbor restores the terminal error. Either way: Decision recorded.",
    targets: ["compare"],
    cue: { kind: "item", id: "R3" },
  },
  {
    id: "evidence",
    title: "Not enough evidence to judge",
    body: "R4: nothing shows the notice is announced or that focus moves. Ask Harbor how other notices do it, or ask a person such as QA, if you want. Waiting on a person is a fine place to stop.",
    targets: ["routes"],
    cue: { kind: "item", id: "R4" },
  },
  {
    id: "notes",
    title: "Concept notes",
    body: "A new retry policy hook and a new soft-vs-hard decline split. They sit beside the list and are not scored. Mark them Noted once your picture of the system is updated.",
    targets: ["notes"],
    cue: { kind: "notes" },
  },
  {
    id: "save",
    title: "Save, then resume",
    body: "Save keeps your confirms, decisions, people you are waiting on, and the notes you marked. Close and Resume brings them back.",
    targets: ["save"],
    cue: { kind: "save" },
  },
  {
    id: "reset",
    title: "Reset the demo",
    body: "Reset demo clears this version's saved review only. Version 1 keeps its own saved state.",
    targets: ["reset"],
    cue: { kind: "reset" },
  },
];
