"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OWNERS, requirementMap, requirements, revisions, revisedRevision, specHistory, TASK } from "@/lib/sample-data";
import {
  decisionFor,
  isAttention,
  reviewSummary,
  statusFor,
  versionsFor,
} from "@/lib/review-logic";
import { defaultCorrection, useReview } from "@/lib/review-store";
import type { Requirement, ReviewDomain } from "@/lib/types";
import { classLabel, Quote, Section, StatusChip, checkTone } from "@/components/workspace/bits";

export function SpecSidebar() {
  const review = useReview();
  const summary = reviewSummary(review.draft?.decisions ?? review.saved?.decisions ?? {});

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l border-[#2b2b2b] bg-[#252526] lg:w-[400px]"
      data-screen={review.phase === "review" ? review.view : review.phase}
    >
      <header className="flex items-start justify-between gap-2 border-b border-[#2b2b2b] px-3 py-2">
        <div data-tour={review.phase === "review" ? "welcome" : undefined}>
          <p className="text-[11px] font-medium tracking-wide text-[#3794ff]">SPEC REVIEW</p>
          <p className="text-[13px] text-[#e8e8e8]">{TASK.title}</p>
          <p className="font-mono text-[11px] text-[#8a8a8a]">
            {TASK.specId} {TASK.specVersion} · {TASK.codeRevision}
            {review.draft?.dirty ? " · unsaved" : ""}
            {review.draft?.savedAt && !review.draft.dirty ? ` · saved ${review.draft.savedAt}` : ""}
          </p>
        </div>
        {review.phase === "review" ? (
          <div data-tour="save" className="flex shrink-0 flex-col gap-1">
            <Button type="button" size="sm" onClick={() => review.openDialog("save")}>
              Save review
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={review.requestClose}>
              Close
            </Button>
          </div>
        ) : null}
      </header>

      {review.error ? (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertTitle>That action could not complete</AlertTitle>
          <AlertDescription className="text-[13px]">
            {review.error}
            <button
              type="button"
              className="mt-1 block text-[#f14c4c] underline"
              onClick={review.dismissError}
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="ide-scroll min-h-0 flex-1 overflow-y-auto">
        {!review.hydrated || review.phase === "loading" ? (
          <LoadingPane hydrated={review.hydrated} />
        ) : review.phase === "closed" ? (
          <ClosedPane />
        ) : review.view === "task" ? (
          <TaskPane openCount={summary.open} />
        ) : review.view === "evidence" && review.selectedId ? (
          <EvidencePane id={review.selectedId} />
        ) : review.view === "resolve" && review.selectedId ? (
          <ResolvePane id={review.selectedId} />
        ) : review.view === "correct" && review.selectedId ? (
          <CorrectPane id={review.selectedId} />
        ) : review.view === "recheck" && review.selectedId ? (
          <RecheckPane id={review.selectedId} />
        ) : review.view === "investigate" && review.selectedId ? (
          <InvestigatePane id={review.selectedId} />
        ) : review.view === "peer" && review.selectedId ? (
          <PeerPane id={review.selectedId} />
        ) : (
          <TaskPane openCount={summary.open} />
        )}
      </div>
    </aside>
  );
}

function LoadingPane({ hydrated }: { hydrated: boolean }) {
  return (
    <div className="space-y-3 p-3" aria-busy="true" aria-live="polite">
      <p className="text-[13px] text-[#d4d4d4]">
        {hydrated
          ? "Opening checkout retry copy. Reading spec 3.2, revision a4c91e2, and Maya Chen’s prior review."
          : "Checking this browser for a saved review."}
      </p>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-8 animate-pulse rounded-sm bg-[#2a2d2e]" />
      ))}
    </div>
  );
}

function ClosedPane() {
  const { saved, openReview, openDialog } = useReview();
  const summary = saved ? reviewSummary(saved.decisions) : null;
  return (
    <div data-tour="welcome" className="space-y-4 p-3">
      <div>
        <h2 className="text-[15px] font-medium text-[#e8e8e8]">
          {saved ? "A review is saved" : "No review is open"}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#c8c8c8]">
          {saved
            ? `Saved ${saved.savedAt}. ${summary?.supported ?? 0} supported, ${summary?.specChanges ?? 0} spec changes, ${summary?.unresolved ?? 0} unresolved, ${summary?.pending ?? 0} still pending. Resume to continue from those findings.`
            : "Harbor finished checkout retry copy at 9:40 AM. You were not watching the edits. Open the review to connect each requirement to the spec, the diff, and the checks."}
        </p>
      </div>
      {saved ? (
        <ul className="space-y-2">
          {summary?.rows
            .filter((row) => row.decision.disposition !== "unreviewed")
            .map((row) => {
              const status = statusFor(row.requirement, row.decision);
              return (
                <li key={row.requirement.id} className="flex items-start justify-between gap-2 text-[13px]">
                  <span>
                    <span className="font-mono text-[11px] text-[#8a8a8a]">{row.requirement.id}</span>{" "}
                    {row.requirement.title}
                  </span>
                  <StatusChip label={status.label} tone={status.tone} />
                </li>
              );
            })}
        </ul>
      ) : (
        <p className="text-[13px] text-[#8a8a8a]">
          Nothing is flagged until you open the review. The agent run is waiting on{" "}
          <span className="font-mono">agent/checkout-retry-copy</span>.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => openReview(saved ? "resume" : "fresh")}>
          {saved ? "Resume review" : "Open review"}
        </Button>
        {saved ? (
          <Button type="button" variant="outline" onClick={() => openDialog("restart")}>
            Start over
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function TaskPane({ openCount }: { openCount: number }) {
  const { attentionOnly, setAttentionOnly, draft } = useReview();
  const visible = requirements.filter((requirement) => {
    if (!attentionOnly) return true;
    return isAttention(requirement, decisionFor(draft, requirement.id));
  });

  return (
    <div>
      <div data-tour="task" className="space-y-3 px-3 py-3">
        <p className="text-[13px] leading-relaxed text-[#d4d4d4]">
          Harbor finished at {TASK.finishedAt}. Spec {TASK.specId} {TASK.specVersion} is the contract.
          The branch is at <span className="font-mono">{TASK.codeRevision}</span>. Passing checks do not
          approve a requirement you have not recorded.
        </p>
        <div className="rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] px-2.5 py-2">
          <p className="text-[11px] text-[#8a8a8a]">Prior review</p>
          <p className="text-[13px] leading-relaxed text-[#d4d4d4]">
            {TASK.priorReview.reviewer} · {TASK.priorReview.at}. {TASK.priorReview.summary}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] text-[#8a8a8a]">Revisions</p>
          <ul className="space-y-1.5">
            {(draft?.applied.includes("R2") ? [revisedRevision, ...revisions] : revisions).map((revision) => (
              <li key={revision.id} className="text-[12px] leading-snug text-[#c8c8c8]">
                <span className="font-mono text-[#9cdcfe]">{revision.id}</span> {revision.author} · {revision.at}
                <span className="block text-[#9a9a9a]">{revision.summary}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[11px] text-[#8a8a8a]">Spec</p>
          {specHistory.map((entry) => (
            <p key={entry.version} className="text-[12px] leading-snug text-[#c8c8c8]">
              <span className="font-mono text-[#ce9178]">{entry.version}</span> · {entry.at} · {entry.author}. {entry.note}
            </p>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-[#2b2b2b] px-3 py-2">
        <p className="text-[12px] text-[#bbbbbb]">
          Requirements <span className="text-[#8a8a8a]">{openCount} open</span>
        </p>
        <div className="flex overflow-hidden rounded-sm border border-[#3c3c3c]">
          <FilterButton active={!attentionOnly} onClick={() => setAttentionOnly(false)}>
            All
          </FilterButton>
          <FilterButton active={attentionOnly} onClick={() => setAttentionOnly(true)}>
            Flagged
          </FilterButton>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="px-3 py-4 text-[13px] leading-relaxed text-[#c8c8c8]">
          Nothing is flagged on {TASK.codeRevision}. Switch to All for requirements that are supported
          or still unreviewed. A passing suite did not close them.
        </p>
      ) : (
        <RequirementList items={visible} />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "bg-[#094771] px-2 py-0.5 text-[11px] text-white" : "px-2 py-0.5 text-[11px] text-[#cccccc]"}
    >
      {children}
    </button>
  );
}

function RequirementList({ items }: { items: Requirement[] }) {
  const { draft, selectRequirement, selectedId } = useReview();
  return (
    <ul>
      {items.map((requirement) => {
        const decision = decisionFor(draft, requirement.id);
        const status = statusFor(requirement, decision);
        const active = selectedId === requirement.id;
        return (
          <li key={requirement.id}>
            <button
              type="button"
              onClick={() => selectRequirement(requirement.id)}
              className={
                active
                  ? "flex w-full items-start gap-2 border-l-2 border-[#007acc] bg-[#094771] px-3 py-2 text-left"
                  : "flex w-full items-start gap-2 border-l-2 border-transparent px-3 py-2 text-left hover:bg-[#2a2d2e]"
              }
            >
              <span className="w-7 shrink-0 font-mono text-[11px] text-[#9cdcfe]">{requirement.id}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug text-[#e8e8e8]">{requirement.title}</span>
              </span>
              <StatusChip label={status.label} tone={status.tone} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function BackBar({ id }: { id: string }) {
  const { showTask, draft } = useReview();
  const requirement = requirementMap[id];
  const status = statusFor(requirement, decisionFor(draft, id));
  return (
    <div className="flex items-center gap-2 border-b border-[#2b2b2b] px-3 py-2">
      <Button type="button" variant="ghost" size="xs" onClick={showTask}>
        Requirements
      </Button>
      <span className="font-mono text-[12px] text-[#9cdcfe]">{id}</span>
      <StatusChip label={status.label} tone={status.tone} />
    </div>
  );
}

function EvidencePane({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  const decision = decisionFor(review.draft, id);
  const revised = Boolean(requirement.revised && review.draft?.applied.includes(id));
  const specText = revised ? requirement.revised!.specText : requirement.evidence.specText;
  const specVersion = revised ? requirement.revised!.specVersion : requirement.evidence.specVersion;
  const codeNote = revised ? requirement.revised!.codeNote : requirement.evidence.codeNote;
  const behavior = revised ? requirement.revised!.behavior : requirement.evidence.behavior;
  const checks = revised ? requirement.revised!.checks : requirement.evidence.checks;
  const versions = versionsFor(requirement, review.draft);
  const revisionList = requirement.evidence.revisionIds
    .map((revisionId) => revisions.find((revision) => revision.id === revisionId))
    .filter((revision) => revision !== undefined);
  if (revised) revisionList.unshift(revisedRevision);

  return (
    <div>
      <BackBar id={id} />
      <div data-tour="evidence">
      <div className="px-3 py-3">
        <h2 className="text-[15px] font-medium text-white">{requirement.title}</h2>
        <p className="mt-1 text-[12px] text-[#e2c044]">{classLabel(requirement.evidenceClass)}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#c8c8c8]">{requirement.classRationale}</p>
      </div>
      <Section title={`Spec · ${TASK.specId} ${specVersion}`}>
        <Quote>{specText}</Quote>
      </Section>
      <Section title="Code">
        <button
          type="button"
          className="font-mono text-[12px] text-[#3794ff] hover:underline"
          onClick={() => review.openFile(requirement.file)}
        >
          {requirement.file}
        </button>
        <p className="mt-1">{codeNote}</p>
        {revised ? (
          <p className="mt-1 text-[#89d185]">Showing revised evidence on {requirement.revised!.revision}.</p>
        ) : null}
      </Section>
      <Section title="Revisions">
        <ul className="space-y-1.5">
          {revisionList.map((revision) => (
            <li key={revision.id}>
              <span className="font-mono text-[#9cdcfe]">{revision.id}</span> {revision.author} · {revision.summary}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Checks">
        <ul className="space-y-1.5">
          {checks.map((check) => (
            <li key={check.id}>
              <span className={checkTone(check.result)}>
                {check.result === "pass" ? "Pass" : check.result === "fail" ? "Fail" : "Missing"} · {check.name}
              </span>
              <span className="block text-[#9a9a9a]">{check.detail}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Behavior">
        <p>{behavior}</p>
      </Section>
      </div>
      <Recorded decisionId={id} />
      <div data-tour="support" className="sticky bottom-0 flex flex-col gap-2 border-t border-[#2b2b2b] bg-[#252526] p-3">
        {decision.disposition !== "supported" && decision.disposition !== "spec_change" ? (
          <>
            {requirement.evidenceClass === "supports" ? (
              <Button type="button" onClick={() => review.tryRecordSupport(id)}>
                Record support
              </Button>
            ) : null}
            {requirement.evidenceClass === "confirmed_mismatch" ||
            requirement.evidenceClass === "possible_intentional" ? (
              <Button type="button" onClick={() => review.setView("resolve")}>
                Resolve divergence
              </Button>
            ) : null}
            {requirement.evidenceClass === "insufficient" ? (
              <Button type="button" onClick={() => review.setView("investigate")}>
                Investigate
              </Button>
            ) : null}
            {requirement.evidenceClass !== "supports" ? (
              <Button type="button" variant="outline" onClick={() => review.tryRecordSupport(id)}>
                Record support
              </Button>
            ) : null}
          </>
        ) : null}
        {decision.disposition === "correction_sent" && requirement.revised && review.draft?.harborReady.includes(id) ? (
          <Button type="button" onClick={() => review.applyRevision(id)}>
            Inspect revised evidence
          </Button>
        ) : null}
        <p className="text-[11px] leading-snug text-[#8a8a8a]">
          {requirement.evidenceClass === "supports"
            ? `Records support against ${versions.codeRevision} and spec ${versions.specVersion} only.`
            : "Missing or conflicting evidence cannot mark this requirement met."}
        </p>
      </div>
    </div>
  );
}

function Recorded({ decisionId }: { decisionId: string }) {
  const { draft } = useReview();
  const decision = decisionFor(draft, decisionId);
  if (decision.disposition === "unreviewed") return null;
  return (
    <Section title="Review record">
      {decision.support ? (
        <p>
          Supported against <span className="font-mono">{decision.support.codeRevision}</span> and spec{" "}
          {decision.support.specVersion} · {decision.support.at}.
        </p>
      ) : null}
      {decision.correction ? <p>Correction sent {decision.correction.at}.</p> : null}
      {decision.specChange ? (
        <p>
          Authorized spec {decision.specChange.version} by {decision.specChange.approver} ({decision.specChange.role}) ·{" "}
          {decision.specChange.at}. Spec {TASK.specVersion} is not marked met.
        </p>
      ) : null}
      {decision.reviewRequest ? (
        <p>
          {domainLabel(decision.reviewRequest.domain)} review pending with {decision.reviewRequest.owner}.{" "}
          {decision.reviewRequest.question}
        </p>
      ) : null}
      {decision.unresolved ? (
        <p>
          Unresolved · {decision.unresolved.owner}. {decision.unresolved.question} Still needed:{" "}
          {decision.unresolved.evidenceNeeded}
        </p>
      ) : null}
      {decision.focusedCheck ? (
        <p className="mt-1 text-[#9a9a9a]">
          Last focused check: {decision.focusedCheck.name} · {decision.focusedCheck.result}.
        </p>
      ) : null}
    </Section>
  );
}

function ResolvePane({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  const tourKey = requirement.evidenceClass === "confirmed_mismatch" ? "mismatch" : "spec-change";
  return (
    <div>
      <BackBar id={id} />
      <div data-tour={tourKey} className="px-3 py-3">
        <p className="text-[11px] text-[#f14c4c]">Possible divergence</p>
        <h2 className="text-[15px] font-medium text-white">{requirement.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#d4d4d4]">{requirement.classRationale}</p>
      </div>
      <Compare id={id} />
      <Section title="What the evidence shows">
        <p>{classLabel(requirement.evidenceClass)}. {requirement.independentReason}</p>
      </Section>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {requirement.evidenceClass === "confirmed_mismatch" ? (
          <Button type="button" data-tour="mismatch" onClick={() => review.setView("correct")}>
            Request correction
          </Button>
        ) : null}
        {requirement.evidenceClass === "possible_intentional" ? (
          <div data-tour="spec-change" className="flex flex-col gap-2">
            <Button type="button" onClick={() => review.openDialog("spec", id)}>
              Confirm spec change
            </Button>
            <Button type="button" variant="outline" onClick={() => review.setView("correct")}>
              Not authorized — request correction
            </Button>
          </div>
        ) : null}
        <IndependentChoice id={id} />
        <UnresolvedForm id={id} />
      </div>
    </div>
  );
}

function Compare({ id }: { id: string }) {
  const requirement = requirementMap[id];
  return (
    <>
      <Section title="Requirement">
        <Quote>{requirement.evidence.specText}</Quote>
      </Section>
      <Section title="Code">
        <p>{requirement.evidence.codeNote}</p>
      </Section>
      <Section title="Behavior">
        <p>{requirement.evidence.behavior}</p>
      </Section>
    </>
  );
}

function IndependentChoice({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  return (
    <div className="rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] p-2.5">
      <p className="text-[13px] text-[#e8e8e8]">Can you resolve this without another person?</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#9a9a9a]">{requirement.independentReason}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={review.checkRunning}
          onClick={() => review.runFocusedCheck(id)}
        >
          {review.checkRunning ? "Running check…" : "Yes — run focused check"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => review.setView("peer")}>
          No — request review
        </Button>
      </div>
    </div>
  );
}

function CorrectPane({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  const decision = decisionFor(review.draft, id);
  const [message, setMessage] = useState(decision.correction?.message || defaultCorrection(id));
  const sent = decision.disposition === "correction_sent";
  const ready = review.draft?.harborReady.includes(id);

  return (
    <div>
      <BackBar id={id} />
      <div className="space-y-3 px-3 py-3">
        <div>
          <p className="text-[11px] text-[#3794ff]">Agent composer</p>
          <h2 className="text-[15px] font-medium text-white">Correction for {id}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#c8c8c8]">
            This goes to Harbor on the current session. It carries {id}, the selected diff in {requirement.file}, and
            the checks that must keep passing.
          </p>
        </div>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          readOnly={sent}
          className="field-sizing-fixed min-h-52 font-mono text-[12px] leading-5"
          aria-label="Correction for Harbor"
        />
        {!sent ? (
          <Button
            type="button"
            onClick={() => {
              review.sendCorrection(id, message);
            }}
          >
            Send correction
          </Button>
        ) : (
          <p className="text-[13px] text-[#89d185]">Sent {decision.correction?.at}. Harbor has the unmet requirement.</p>
        )}
        {sent && !ready ? (
          <p className="text-[13px] text-[#e2c044]">Waiting for Harbor to answer on this correction.</p>
        ) : null}
        {sent && ready && requirement.revised ? (
          <Button type="button" onClick={() => review.applyRevision(id)}>
            Inspect revised evidence on {requirement.revised.revision}
          </Button>
        ) : null}
        {sent && ready && !requirement.revised ? (
          <p className="text-[13px] leading-relaxed text-[#c8c8c8]">
            Harbor has not pushed a revision. The finding stays open until you request the right review or keep it unresolved.
          </p>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => review.setView("resolve")}>
          Back to the finding
        </Button>
        <UnresolvedForm id={id} />
      </div>
    </div>
  );
}

function RecheckPane({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  const revised = requirement.revised;
  const decision = decisionFor(review.draft, id);
  if (!revised) return null;
  const passed = decision.focusedCheck?.result === "pass";

  return (
    <div>
      <BackBar id={id} />
      <div className="px-3 py-3">
        <p className="text-[11px] text-[#89d185]">Recheck · {revised.revision}</p>
        <h2 className="text-[15px] font-medium text-white">{revised.summary}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#c8c8c8]">
          Stay on this diff. A passing check here does not approve any other requirement.
        </p>
      </div>
      <Section title={`Spec · ${revised.specVersion}`}>
        <Quote>{revised.specText}</Quote>
      </Section>
      <Section title="Revised code">
        <p>{revised.codeNote}</p>
        <button
          type="button"
          className="mt-1 font-mono text-[12px] text-[#3794ff] hover:underline"
          onClick={() => review.openFile(requirement.file)}
        >
          {requirement.file}
        </button>
      </Section>
      <Section title="Checks on the new revision">
        {revised.checks.map((check) => (
          <p key={check.id} className={checkTone(check.result)}>
            {check.result} · {check.name}
          </p>
        ))}
      </Section>
      <Section title="Behavior">
        <p>{revised.behavior}</p>
      </Section>
      <Section title="Affected requirements">
        <ul className="space-y-2">
          {revised.affected.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="font-mono text-[#9cdcfe] hover:underline"
                onClick={() => review.selectRequirement(item.id)}
              >
                {item.id}
              </button>
              <span className="text-[#c8c8c8]"> · {item.note}</span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="flex flex-col gap-2 px-3 pb-4">
        <IndependentChoice id={id} />
        {decision.focusedCheck ? (
          <p className={decision.focusedCheck.result === "pass" ? "text-[13px] text-[#89d185]" : "text-[13px] text-[#e2c044]"}>
            {decision.focusedCheck.name} · {decision.focusedCheck.result}. {passed
              ? `${id} now matches spec ${revised.specVersion} on ${revised.revision}. Record support to store that. Other requirements stay as they were.`
              : "There is not enough evidence to mark this requirement met."}
          </p>
        ) : (
          <p className="text-[13px] text-[#c8c8c8]">
            Run the focused check before recording support. The revised diff alone is not the review record.
          </p>
        )}
        {passed ? (
          <Button type="button" onClick={() => review.tryRecordSupport(id)}>
            Record support
          </Button>
        ) : null}
        <UnresolvedForm id={id} />
      </div>
    </div>
  );
}

function InvestigatePane({ id }: { id: string }) {
  const requirement = requirementMap[id];
  const { setView } = useReview();
  return (
    <div>
      <BackBar id={id} />
      <div className="px-3 py-3">
        <p className="text-[11px] text-[#e2c044]">Missing evidence</p>
        <h2 className="text-[15px] font-medium text-white">{requirement.title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#d4d4d4]">
          {requirement.classRationale} Do not mark {id} met from the source alone.
        </p>
      </div>
      <Section title="Still needed">
        <p>{requirement.evidenceNeeded}</p>
      </Section>
      <Compare id={id} />
      <div className="flex flex-col gap-2 px-3 pb-4">
        <IndependentChoice id={id} />
        <Button type="button" variant="ghost" onClick={() => setView("evidence")}>
          Inspect the evidence again
        </Button>
        <UnresolvedForm id={id} />
      </div>
    </div>
  );
}

function PeerPane({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  const [domain, setDomain] = useState<ReviewDomain>(requirement.defaultDomain);
  const [owner, setOwner] = useState<string>(OWNERS[requirement.defaultDomain].name);
  const [question, setQuestion] = useState(requirement.openQuestion);

  function onDomain(next: ReviewDomain) {
    setDomain(next);
    setOwner(OWNERS[next].name);
  }

  return (
    <div>
      <BackBar id={id} />
      <form
        className="space-y-3 px-3 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          review.requestReview(id, { domain, owner, question });
        }}
      >
        <div data-tour="unresolved">
          <p className="text-[11px] text-[#3794ff]">Focused review</p>
          <h2 className="text-[15px] font-medium text-white">Request review for {id}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-[#c8c8c8]">
            The reviewer gets spec {TASK.specId} {TASK.specVersion}, code {TASK.codeRevision}, and this question.
            It stays pending until they answer. Other mismatches are not closed.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-domain">Who needs to answer</Label>
          <Select value={domain} onValueChange={(value) => onDomain(value as ReviewDomain)}>
            <SelectTrigger id="review-domain" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="spec">Spec · PM or designer</SelectItem>
              <SelectItem value="architecture">Architecture · tech lead or code owner</SelectItem>
              <SelectItem value="behavior">Behavior · reviewer or QA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-owner">Owner</Label>
          <Input id="review-owner" value={owner} onChange={(event) => setOwner(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="review-question">Open question</Label>
          <Textarea
            id="review-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="field-sizing-fixed min-h-24"
          />
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-[#8a8a8a]">
          Attached · {requirement.file} · {TASK.codeRevision} · spec {TASK.specVersion}
        </p>
        <Button type="submit">Send review request</Button>
      </form>
      <div className="px-3 pb-4">
        <UnresolvedForm id={id} />
      </div>
    </div>
  );
}

function UnresolvedForm({ id }: { id: string }) {
  const review = useReview();
  const requirement = requirementMap[id];
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(requirement.openQuestion);
  const [evidenceNeeded, setEvidenceNeeded] = useState(requirement.evidenceNeeded);
  const [owner, setOwner] = useState("");

  if (!open) {
    return (
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        Keep unresolved
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        review.saveUnresolved(id, { question, evidenceNeeded, owner });
      }}
    >
      <p className="text-[13px] text-[#e8e8e8]">Keep {id} unresolved</p>
      <div className="space-y-1">
        <Label htmlFor={`q-${id}`}>Question</Label>
        <Textarea
          id={`q-${id}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="field-sizing-fixed min-h-16"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`e-${id}`}>Evidence still needed</Label>
        <Textarea
          id={`e-${id}`}
          value={evidenceNeeded}
          onChange={(event) => setEvidenceNeeded(event.target.value)}
          className="field-sizing-fixed min-h-16"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`o-${id}`}>Owner</Label>
        <Input
          id={`o-${id}`}
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          placeholder="Who brings the next evidence"
        />
      </div>
      <Button type="submit" size="sm">
        Save unresolved
      </Button>
    </form>
  );
}

function domainLabel(domain: ReviewDomain) {
  if (domain === "spec") return "Spec";
  if (domain === "architecture") return "Architecture";
  return "Behavior";
}
