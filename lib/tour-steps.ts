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
    body: "This is version 2, the guided review. You asked Harbor one informal thing. Now you check what it did, one item at a time. You still make the final call.",
    targets: ["welcome"],
    cue: { kind: "welcome" },
  },
  {
    id: "context",
    title: "What you asked, what it finished, what it is unsure about",
    body: "There is no numbered spec. The ticket has two written lines, and they show up only on the items they apply to.",
    targets: ["context"],
    cue: { kind: "overview" },
  },
  {
    id: "piles",
    title: "Two piles",
    body: "Looks right, confirm: the evidence is attached. Needs your judgment: something the agent got wrong, decided on its own, or could not check. Each item says why it is in its pile and what closes it.",
    targets: ["piles"],
    cue: { kind: "overview" },
  },
  {
    id: "confirm",
    title: "Confirm a looks-right item",
    body: "You see what changed and the check. Confirm records this item on this revision only. It does not approve anything else.",
    targets: ["item-detail", "diff"],
    cue: { kind: "item", id: "sidebar" },
  },
  {
    id: "correct",
    title: "Correct it yourself",
    body: "The ticket says search too, and search still finds archived projects. Send Harbor a correction, recheck its fix, and the item becomes Corrected, then Confirmed.",
    targets: ["item-actions"],
    cue: { kind: "item", id: "search" },
  },
  {
    id: "product",
    title: "A product choice, before and after",
    body: "Harbor decided on its own to unassign tasks. Before and after sit side by side. Accept and the ticket moves to v2. Keep the old behavior and Harbor reverts it. Either way: Decision recorded.",
    targets: ["compare"],
    cue: { kind: "item", id: "unassign" },
  },
  {
    id: "evidence",
    title: "Not enough evidence to judge",
    body: "A code question goes back to Harbor as a short research pass. A question about how the product should behave can go to a person, if you want. Waiting on a person is a fine place to stop.",
    targets: ["routes"],
    cue: { kind: "item", id: "callers" },
  },
  {
    id: "notes",
    title: "Concept notes",
    body: "A new concept and a new table. They sit beside the list and are not scored. Mark them Noted once your picture of the system is updated.",
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
