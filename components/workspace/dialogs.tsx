"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { conceptNotes } from "@/lib/sample-data";
import { reviewSummary, statusFor } from "@/lib/review-logic";
import { useReview } from "@/lib/review-store";
import type { ItemState } from "@/lib/types";
import { StatusChip } from "@/components/workspace/bits";
import { useTour } from "@/components/workspace/tour";

export function ReviewDialogs() {
  const review = useReview();
  const tour = useTour();
  return (
    <>
      <SaveDialog />
      <Dialog open={review.dialog === "discard"} onOpenChange={(open) => !open && review.closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close without saving?</DialogTitle>
            <DialogDescription>
              This session has confirms, decisions, or notes that are not saved. Closing drops them. The last save, if
              there is one, stays in this browser.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={review.closeDialog}>
              Keep working
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (review.saveReview()) review.confirmDiscard();
              }}
            >
              Save and close
            </Button>
            <Button type="button" variant="destructive" onClick={review.confirmDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={review.dialog === "restart"} onOpenChange={(open) => !open && review.closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset the v2 demo?</DialogTitle>
            <DialogDescription>
              This clears the saved v2 review in this browser: confirms, decisions, people you are waiting on, and
              notes. Version 1 keeps its own saved state. Harbor&apos;s work is ready again from the start.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={review.closeDialog}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (review.resetDemo()) tour.restartAfterReset();
              }}
            >
              Reset demo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SaveDialog() {
  const review = useReview();
  const summary = reviewSummary(review.draft);
  const open = summary.total - summary.settled;
  return (
    <Dialog open={review.dialog === "save"} onOpenChange={(next) => !next && review.closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{open > 0 ? "Save, with items still open" : "Save the review"}</DialogTitle>
          <DialogDescription>
            Each result is stored against the revision you reviewed.
            {open > 0 ? ` ${open} item${open === 1 ? " is" : "s are"} not settled yet and stay on the list.` : ""}
            {summary.waiting > 0 ? " Questions waiting on a person stay open." : ""}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {summary.rows.map((row) => {
            const status = statusFor(row.item, row.state);
            const detail = detailFor(row.state);
            return (
              <li key={row.item.id} className="flex items-start justify-between gap-3 text-[13px]">
                <span>
                  {row.item.title}
                  {detail ? <span className="mt-0.5 block text-[12px] text-[#9a9a9a]">{detail}</span> : null}
                </span>
                <StatusChip label={status.label} tone={status.tone} />
              </li>
            );
          })}
          {conceptNotes.map((note) => {
            const noted = review.draft?.noted.includes(note.id);
            return (
              <li key={note.id} className="flex items-start justify-between gap-3 text-[13px]">
                <span>
                  <span className="text-[#c586c0]">{note.kind}</span> · {note.title}
                </span>
                <StatusChip label={noted ? "Noted" : "Not marked"} tone="idle" />
              </li>
            );
          })}
        </ul>
        {review.error && review.dialog === "save" ? (
          <p className="text-[13px] text-[#f14c4c]" role="alert">
            {review.error}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={review.closeDialog}>
            Cancel
          </Button>
          <Button type="button" onClick={review.saveReview}>
            Save review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function detailFor(state: ItemState) {
  if (state.confirmed) return `On ${state.confirmed.revision}`;
  if (state.decision) return `Recorded: ${state.decision.recorded.label}`;
  if (state.person) return `${state.person.who} · ${state.person.question}`;
  if (state.unresolved) return `Still needed: ${state.unresolved.evidenceNeeded}`;
  if (state.check) return "Fix rechecked, not confirmed yet";
  if (state.correction) return "Correction sent to Harbor";
  if (state.research) return "Harbor research pass";
  return "";
}
