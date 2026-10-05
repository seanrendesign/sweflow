"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requirementMap, TASK } from "@/lib/sample-data";
import { evidenceLabels, reviewSummary, statusFor, versionsFor } from "@/lib/review-logic";
import { useReview } from "@/lib/review-store";
import { useTour } from "@/components/workspace/tour";

export function ReviewDialogs() {
  const review = useReview();
  const tour = useTour();
  return (
    <>
      <SaveDialog />
      <SupportDialog />
      <SpecDialog />
      <Dialog open={review.dialog === "discard"} onOpenChange={(open) => !open && review.closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close without saving?</DialogTitle>
            <DialogDescription>
              This session has findings that are not in the saved review. Closing drops them. The last save, if there is one, stays in this browser.
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
                const ok = review.saveReview();
                if (ok) review.confirmDiscard();
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
            <DialogTitle>Reset the demo?</DialogTitle>
            <DialogDescription>
              This clears the saved review in this browser. Supports, corrections, and unresolved items are removed. Harbor’s changes are ready again, and no review is open.
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
  const summary = reviewSummary(review.draft?.decisions ?? {});
  const pending = summary.pending > 0 || summary.unresolved > 0;
  return (
    <Dialog open={review.dialog === "save"} onOpenChange={(open) => !open && review.closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{pending ? "Save while work is still open" : "Save reviewed findings"}</DialogTitle>
          <DialogDescription>
            Findings are stored against the code and spec versions on each requirement. Passing checks do not approve requirements you have not recorded.
            {pending
              ? " Pending review and unresolved questions stay visible. Unrelated mismatches are not closed."
              : ""}
          </DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-2 overflow-y-auto">
          {summary.rows.map((row) => {
            const status = statusFor(row.requirement, row.decision);
            const detail = detailFor(row.decision);
            return (
              <li key={row.requirement.id} className="flex items-start justify-between gap-3 text-[13px]">
                <span>
                  <span className="font-mono text-[11px] text-[#9cdcfe]">{row.requirement.id}</span>{" "}
                  {row.requirement.title}
                  {detail ? <span className="mt-0.5 block text-[12px] text-[#9a9a9a]">{detail}</span> : null}
                </span>
                <span className="shrink-0 text-[12px] text-[#d4d4d4]">{status.label}</span>
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

function detailFor(decision: ReturnType<typeof reviewSummary>["rows"][number]["decision"]) {
  if (decision.support) return `${decision.support.codeRevision} · spec ${decision.support.specVersion}`;
  if (decision.specChange) return `Approved spec ${decision.specChange.version} · ${decision.specChange.approver}`;
  if (decision.unresolved) return `${decision.unresolved.owner} · ${decision.unresolved.evidenceNeeded}`;
  if (decision.reviewRequest) return `${decision.reviewRequest.owner} · ${decision.reviewRequest.question}`;
  if (decision.correction) return "Correction sent to Harbor";
  return "";
}

function SupportDialog() {
  const review = useReview();
  const id = review.dialogRequirementId;
  const requirement = id ? requirementMap[id] : undefined;
  if (!requirement) {
    return (
      <Dialog open={review.dialog === "support"} onOpenChange={(open) => !open && review.closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record support</DialogTitle>
            <DialogDescription>Select a requirement first.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }
  const versions = versionsFor(requirement, review.draft);
  const labels = evidenceLabels(requirement, review.draft);
  return (
    <Dialog open={review.dialog === "support"} onOpenChange={(open) => !open && review.closeDialog()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record support for {requirement.id}</DialogTitle>
          <DialogDescription>
            This stores support against code {versions.codeRevision} and spec {TASK.specId} {versions.specVersion}. It does not mark any other requirement met.
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-[13px] text-[#d4d4d4]">
          {labels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={review.closeDialog}>
            Cancel
          </Button>
          <Button type="button" onClick={() => review.commitSupport(requirement.id)}>
            Record support
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SpecDialog() {
  const review = useReview();
  const id = review.dialogRequirementId;
  const [approver, setApprover] = useState("");
  const [role, setRole] = useState("PM");
  const [version, setVersion] = useState("3.3");
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={review.dialog === "spec" && Boolean(id)}
      onOpenChange={(open) => {
        if (!open) review.closeDialog();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm an authorized spec change</DialogTitle>
          <DialogDescription>
            {id} diverges from spec {TASK.specVersion}. Tie it to the approved requirement version. An Oct 2 chat is not authorization. Spec {TASK.specVersion} will not be marked met.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!id) return;
            review.confirmSpecChange(id, { approver, role, version, note });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="approver">Approver</Label>
            <Input
              id="approver"
              value={approver}
              onChange={(event) => setApprover(event.target.value)}
              placeholder="Priya Shah"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="approver-role">Role</Label>
            <Input id="approver-role" value={role} onChange={(event) => setRole(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="approved-version">Approved requirement version</Label>
            <Input id="approved-version" value={version} onChange={(event) => setVersion(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-note">What was authorized</Label>
            <Textarea
              id="auth-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Retry suspected_fraud holds. stolen_card stays terminal."
              className="field-sizing-fixed min-h-20"
            />
          </div>
          {review.error && review.dialog === "spec" ? (
            <p className="text-[13px] text-[#f14c4c]" role="alert">
              {review.error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={review.closeDialog}>
              Cancel
            </Button>
            <Button type="submit">Tie approved version</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
