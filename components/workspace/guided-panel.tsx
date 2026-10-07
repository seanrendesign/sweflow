"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileCode } from "lucide-react";
import { cn } from "cn";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { conceptNotes, itemMap, items, TASK } from "@/lib/sample-data";
import { currentRevision, reviewSummary, stateFor, statusFor, ticketVersion } from "@/lib/review-logic";
import { useReview } from "@/lib/review-store";
import type { BehaviorVersion, ItemKind, Pile, ReviewItem } from "@/lib/types";
import {
  checkLabel,
  checkTone,
  Quote,
  Section,
  StatusChip,
  SuccessBanner,
} from "@/components/workspace/bits";

const PILES: Record<Pile, { title: string; blurb: string }> = {
  confirm: {
    title: "Looks right, confirm",
    blurb: "The evidence is attached and matches. Confirming one item does not approve any other.",
  },
  judgment: {
    title: "Needs your judgment",
    blurb: "Harbor got it wrong, decided something on its own, or could not show enough evidence.",
  },
};

const ACTION: Record<ItemKind, string> = {
  confirm: "Closes with: Confirm",
  correct: "Closes with: send a correction, then recheck",
  product: "Closes with: accept it, or keep the old behavior",
  evidence: "Closes with: ask Harbor, ask a person, or keep it open",
};

export function GuidedPanel() {
  const review = useReview();
  const revision = currentRevision(review.draft?.revisions);

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l border-[#2b2b2b] bg-[#252526] lg:w-[420px]"
      data-screen={review.phase === "review" ? review.view : review.phase}
    >
      <header className="flex items-start justify-between gap-2 border-b border-[#2b2b2b] px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-[#3794ff]">GUIDED REVIEW</p>
          <p className="truncate text-[13px] text-[#e8e8e8]">{TASK.title}</p>
          <p className="font-mono text-[11px] text-[#8a8a8a]">
            {TASK.branch} · {revision}
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
            <button type="button" className="mt-1 block text-[#f14c4c] underline" onClick={review.dismissError}>
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
        ) : review.view === "item" && review.selectedId && itemMap[review.selectedId] ? (
          <ItemPane key={review.selectedId} item={itemMap[review.selectedId]} />
        ) : (
          <Overview />
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
          ? "Opening Harbor's work. Sorting what it changed into things to confirm and things that need you."
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
  const summary = saved ? reviewSummary(saved) : null;
  return (
    <div data-tour="welcome" className="space-y-4 p-3">
      <div>
        <p className="text-[11px] text-[#8a8a8a]">{saved ? "Saved review" : `Harbor finished · ${TASK.finishedAt}`}</p>
        <h2 className="mt-1 text-[15px] font-medium text-[#e8e8e8]">
          {saved ? "Your review is saved" : "Agent work is ready"}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#c8c8c8]">
          {saved
            ? `Saved ${saved.savedAt}. ${summary?.settled ?? 0} of ${summary?.total ?? 0} items settled, ${summary?.waiting ?? 0} waiting on a person, ${summary?.noted ?? 0} of ${summary?.notes ?? 0} concept notes marked. Resume to pick up where you left off.`
            : "You asked Harbor to let people archive projects. You were not watching the edits. Open the work to see what it did and what it needs from you."}
        </p>
      </div>
      {saved && summary ? (
        <ul className="space-y-2">
          {summary.rows.map((row) => {
            const status = statusFor(row.item, row.state);
            return (
              <li key={row.item.id} className="flex items-start justify-between gap-2 text-[13px]">
                <span className="text-[#d4d4d4]">{row.item.title}</span>
                <StatusChip label={status.label} tone={status.tone} />
              </li>
            );
          })}
        </ul>
      ) : (
        <Quote source={`You · ${TASK.askedAt}`}>“{TASK.ask}”</Quote>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => openReview(saved ? "resume" : "fresh")}>
          {saved ? "Resume review" : "Open the finished work"}
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

function Overview() {
  const review = useReview();
  const summary = reviewSummary(review.draft);
  const notesRef = useRef<HTMLElement>(null);

  const { scrollTarget, clearScrollTarget } = review;
  useEffect(() => {
    if (scrollTarget !== "notes") return;
    notesRef.current?.scrollIntoView({ block: "start" });
    clearScrollTarget();
  }, [scrollTarget, clearScrollTarget]);

  return (
    <div>
      <div data-tour="context" className="space-y-3 px-3 py-3">
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-[#8a8a8a]">WHAT YOU ASKED</p>
          <Quote source={`You to Harbor · ${TASK.askedAt}`}>“{TASK.ask}”</Quote>
          <p className="mt-1.5 text-[12px] leading-snug text-[#9a9a9a]">
            No numbered spec. Ticket {TASK.ticket} has two written lines; they show on the items they apply to.
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-[#8a8a8a]">
            WHAT HARBOR FINISHED · {TASK.baseRevision}
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-[#d4d4d4]">
            {TASK.finished.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium tracking-wide text-[#8a8a8a]">WHAT HARBOR IS UNSURE ABOUT</p>
          <ul className="list-disc space-y-0.5 pl-4 text-[13px] leading-snug text-[#d4d4d4]">
            {TASK.unsure.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#2b2b2b] px-3 py-2">
        <p className="text-[12px] text-[#bbbbbb]">Guided list</p>
        <p className="text-[12px] text-[#8a8a8a]">
          {summary.settled} of {summary.total} settled
        </p>
      </div>

      <div data-tour="piles">
        {(["confirm", "judgment"] as const).map((pile) => (
          <PileList key={pile} pile={pile} />
        ))}
      </div>

      <section
        ref={notesRef}
        data-tour="notes"
        className="m-3 rounded-sm border border-dashed border-[#4a4a4a] bg-[#1e1e1e] px-3 py-3"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-medium text-[#e8e8e8]">Concept notes</h3>
          <span className="text-[11px] text-[#8a8a8a]">Not scored</span>
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-[#9a9a9a]">
          These update your picture of the system. Nothing to pass, fail, or assign.
        </p>
        <ul className="mt-3 space-y-3">
          {conceptNotes.map((note) => {
            const noted = review.draft?.noted.includes(note.id);
            return (
              <li key={note.id} className="space-y-1.5">
                <p className="text-[11px] text-[#c586c0]">{note.kind}</p>
                <p className="font-mono text-[13px] text-[#e8e8e8]">{note.title}</p>
                <p className="text-[12px] leading-relaxed text-[#c8c8c8]">{note.body}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-[#3794ff] hover:underline"
                    onClick={() => review.openFile(note.file)}
                  >
                    <FileCode className="size-3" />
                    {note.file.split("/").at(-1)}
                  </button>
                  {noted ? null : (
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      className="ml-auto"
                      onClick={() => review.markNoted(note.id)}
                    >
                      Mark noted
                    </Button>
                  )}
                </div>
                {noted ? <SuccessBanner label="Noted" /> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function PileList({ pile }: { pile: Pile }) {
  const { draft, selectItem, selectedId } = useReview();
  const pileItems = items.filter((item) => item.pile === pile);
  return (
    <section className="border-t border-[#2b2b2b]">
      <div className="px-3 pt-3 pb-1.5">
        <h3 className="text-[13px] font-medium text-[#e8e8e8]">
          {PILES[pile].title} <span className="font-normal text-[#8a8a8a]">· {pileItems.length}</span>
        </h3>
        <p className="text-[12px] leading-snug text-[#9a9a9a]">{PILES[pile].blurb}</p>
      </div>
      <ul className="pb-2">
        {pileItems.map((item) => {
          const status = statusFor(item, stateFor(draft, item.id));
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => selectItem(item.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-l-2 px-3 py-2 text-left",
                  selectedId === item.id
                    ? "border-[#007acc] bg-[#094771]/60"
                    : "border-transparent hover:bg-[#2a2d2e]",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[13px] leading-snug text-[#e8e8e8]">{item.title}</span>
                  <StatusChip label={status.label} tone={status.tone} />
                </span>
                <span className="text-[12px] leading-snug text-[#9a9a9a]">{item.category}</span>
                <span className="text-[12px] leading-snug text-[#75beff]">{ACTION[item.kind]}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ItemPane({ item }: { item: ReviewItem }) {
  const review = useReview();
  const status = statusFor(item, stateFor(review.draft, item.id));
  const related = item.related ? itemMap[item.related.id] : undefined;

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-[#2b2b2b] px-3 py-2">
        <Button type="button" variant="ghost" size="xs" onClick={review.showOverview}>
          <ArrowLeft className="size-3.5" />
          Guided list
        </Button>
        <span className="truncate text-[12px] text-[#8a8a8a]">{PILES[item.pile].title}</span>
        <span className="ml-auto">
          <StatusChip label={status.label} tone={status.tone} />
        </span>
      </div>

      <div data-tour="item-detail">
        <div className="px-3 py-3">
          <p className="text-[11px] text-[#c586c0]">{item.category}</p>
          <h2 className="mt-0.5 text-[15px] font-medium text-white">{item.title}</h2>
          <dl className="mt-2 space-y-2 text-[13px] leading-relaxed">
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-[#8a8a8a]">
                WHY IT IS IN “{PILES[item.pile].title.toUpperCase()}”
              </dt>
              <dd className="text-[#d4d4d4]">{item.whyHere}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium tracking-wide text-[#8a8a8a]">WHAT CLOSES IT</dt>
              <dd className="text-[#d4d4d4]">{item.closesWith}</dd>
            </div>
          </dl>
        </div>

        {item.written && item.kind !== "product" ? (
          <Section title={`Written requirement · ${item.written.source}`}>
            <Quote>{item.written.text}</Quote>
            {item.written.scope ? <p className="mt-1.5 text-[12px] text-[#9a9a9a]">{item.written.scope}</p> : null}
          </Section>
        ) : null}
        {item.kind === "evidence" ? (
          <Section title="Written requirement">
            <p className="text-[#9a9a9a]">None. Nothing written covers the other callers.</p>
          </Section>
        ) : null}

        <Section title="What changed">
          <p>{item.changed}</p>
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-1 font-mono text-[12px] text-[#3794ff] hover:underline"
            onClick={() => review.openFile(item.file)}
          >
            <FileCode className="size-3.5" />
            {item.file}
          </button>
        </Section>

        <Section title="The check">
          <p className={checkTone(item.check.result)}>
            {checkLabel(item.check.result)} · {item.check.name}
          </p>
          <p className="text-[#9a9a9a]">{item.check.detail}</p>
        </Section>

        {related && item.related ? (
          <Section title="Not the same as">
            <button
              type="button"
              className="text-left text-[#3794ff] hover:underline"
              onClick={() => review.selectItem(related.id)}
            >
              {related.title}
            </button>
            <p className="text-[#9a9a9a]">{item.related.note}</p>
          </Section>
        ) : null}
      </div>

      {item.kind === "confirm" ? <ConfirmActions item={item} /> : null}
      {item.kind === "correct" ? <CorrectActions item={item} /> : null}
      {item.kind === "product" ? <ProductActions item={item} /> : null}
      {item.kind === "evidence" ? <EvidenceActions item={item} /> : null}
    </div>
  );
}

function ConfirmActions({ item }: { item: ReviewItem }) {
  const review = useReview();
  const state = stateFor(review.draft, item.id);
  const revision = currentRevision(review.draft?.revisions);
  return (
    <div data-tour="item-actions" className="space-y-2 border-t border-[#2b2b2b] p-3">
      {state.confirmed ? (
        <SuccessBanner label="Confirmed">
          On {state.confirmed.revision} · {state.confirmed.at}. Only this item. Everything else stays as it was.
        </SuccessBanner>
      ) : (
        <>
          <Button type="button" className="w-full" onClick={() => review.confirmItem(item.id)}>
            Confirm
          </Button>
          <p className="text-[11px] leading-snug text-[#8a8a8a]">
            Records this item on {revision} only. A later revision can reopen it.
          </p>
        </>
      )}
    </div>
  );
}

function Step({
  n,
  title,
  done,
  active,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className={cn("flex gap-2.5", !done && !active && "opacity-50")}>
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]",
          done ? "bg-[#89d185] text-[#1e1e1e]" : active ? "bg-[#007acc] text-white" : "bg-[#3c3c3c] text-[#bbbbbb]",
        )}
      >
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[13px] text-[#e8e8e8]">{title}</p>
        {active || done ? children : null}
      </div>
    </li>
  );
}

function CorrectActions({ item }: { item: ReviewItem }) {
  const review = useReview();
  const detail = item.correct!;
  const state = stateFor(review.draft, item.id);
  const [message, setMessage] = useState(state.correction?.message ?? detail.correctionDraft);
  const sent = Boolean(state.correction);
  const ready = Boolean(state.revisionReady);
  const checked = Boolean(state.check);

  return (
    <div data-tour="item-actions" className="border-t border-[#2b2b2b] p-3">
      <div className="mb-3 grid grid-cols-2 gap-2 text-[12px] leading-snug">
        <div className="rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] p-2">
          <p className="text-[11px] text-[#8a8a8a]">Expected</p>
          <p className="mt-0.5 text-[#d4d4d4]">{detail.expected}</p>
        </div>
        <div
          className={cn(
            "rounded-sm border bg-[#1e1e1e] p-2",
            checked ? "border-[#89d185]/50" : "border-[#f14c4c]/50",
          )}
        >
          <p className="text-[11px] text-[#8a8a8a]">
            {checked ? `Now, on ${detail.revision}` : `Actual, on ${TASK.baseRevision}`}
          </p>
          <p className="mt-0.5 text-[#d4d4d4]">{checked ? detail.fixedBehavior : detail.actual}</p>
        </div>
      </div>
      <ol className="space-y-4">
        <Step n={1} title="Send Harbor a correction" done={sent} active={!sent}>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            readOnly={sent}
            className="field-sizing-fixed min-h-36 font-mono text-[12px] leading-5"
            aria-label="Correction for Harbor"
          />
          {sent ? (
            <p className="text-[12px] text-[#9a9a9a]">Sent {state.correction?.at}. Tied to this item only.</p>
          ) : (
            <Button type="button" onClick={() => review.sendCorrection(item.id, message)}>
              Send correction
            </Button>
          )}
        </Step>
        <Step n={2} title="Inspect Harbor's revision" done={Boolean(state.inspected)} active={sent && !state.inspected}>
          {ready ? (
            <>
              <p className="text-[12px] leading-snug text-[#c8c8c8]">
                <span className="font-mono text-[#9cdcfe]">{detail.revision}</span> · {detail.revisionSummary}
              </p>
              <Button type="button" size="sm" variant="secondary" onClick={() => review.inspectRevision(item.id)}>
                Show {detail.revision} in the diff
              </Button>
            </>
          ) : (
            <p className="text-[12px] text-[#e2c044]" aria-live="polite">
              Harbor is working on the fix…
            </p>
          )}
        </Step>
        <Step n={3} title="Recheck with one focused check" done={checked} active={ready && !checked}>
          {checked ? (
            <SuccessBanner label="Corrected">
              {detail.focusedCheck.name} passed on {detail.revision}. Other items were not rechecked and stay as they were.
            </SuccessBanner>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={review.checkRunning || !ready}
              onClick={() => review.runFocusedCheck(item.id)}
            >
              {review.checkRunning ? "Running check…" : `Run “${detail.focusedCheck.name}”`}
            </Button>
          )}
        </Step>
        <Step n={4} title="Confirm the fix" done={Boolean(state.confirmed)} active={checked && !state.confirmed}>
          {state.confirmed ? (
            <SuccessBanner label="Confirmed">
              Corrected, then confirmed on {state.confirmed.revision} · {state.confirmed.at}.
            </SuccessBanner>
          ) : (
            <Button type="button" size="sm" onClick={() => review.confirmItem(item.id)}>
              Confirm on {detail.revision}
            </Button>
          )}
        </Step>
      </ol>
    </div>
  );
}

function VersionCard({
  title,
  version,
  recorded,
  dimmed,
}: {
  title: string;
  version: BehaviorVersion;
  recorded: boolean;
  dimmed: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-sm border bg-[#1e1e1e] p-2.5 transition-opacity",
        recorded ? "border-[#3794ff] shadow-[inset_3px_0_0_#3794ff]" : "border-[#3c3c3c]",
        dimmed && "opacity-45",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-medium text-[#e8e8e8]">{title}</p>
        {recorded ? <StatusChip label="Recorded" tone="decision" /> : null}
      </div>
      <p className="text-[11px] text-[#8a8a8a]">{version.label}</p>
      <p className="mt-1.5 text-[11px] text-[#8a8a8a]">Behavior</p>
      <p className="text-[13px] leading-relaxed text-[#d4d4d4]">{version.behavior}</p>
      <p className="mt-1.5 text-[11px] text-[#8a8a8a]">Written requirement</p>
      <p className="border-l-2 border-[#007acc] pl-2 text-[13px] leading-relaxed text-[#d4d4d4]">{version.spec}</p>
    </div>
  );
}

function ProductActions({ item }: { item: ReviewItem }) {
  const review = useReview();
  const detail = item.product!;
  const state = stateFor(review.draft, item.id);
  const decision = state.decision;
  const ticket = ticketVersion(review.draft);

  return (
    <div className="border-t border-[#2b2b2b] p-3">
      <div data-tour="compare" className="space-y-2">
        <p className="text-[11px] font-medium tracking-wide text-[#8a8a8a]">BEFORE AND AFTER</p>
        <p className="text-[12px] text-[#9a9a9a]">{detail.example}</p>
        <VersionCard
          title="Before"
          version={detail.before}
          recorded={decision?.choice === "reject"}
          dimmed={decision?.choice === "accept"}
        />
        <VersionCard
          title="After"
          version={detail.after}
          recorded={decision?.choice === "accept"}
          dimmed={decision?.choice === "reject"}
        />
        <p className="rounded-sm bg-[#2d2d30] px-2.5 py-2 text-[12px] leading-snug text-[#e2c044]">{detail.testNote}</p>
      </div>

      <div className="mt-3 space-y-2">
        {decision ? (
          <SuccessBanner label="Decision recorded">
            {decision.choice === "accept" ? (
              <>
                You accepted Harbor&apos;s behavior · {decision.at}. {TASK.ticket} now reads {ticket.version}: “
                {ticket.restoreLine}”
              </>
            ) : decision.restoredOn ? (
              <>
                You kept the old behavior · {decision.at}. Harbor reverted it on{" "}
                <span className="font-mono">{decision.restoredOn}</span>. {TASK.ticket} stays {ticket.version}.
              </>
            ) : (
              <>
                You kept the old behavior · {decision.at}. {TASK.ticket} stays {ticket.version}. Harbor is
                reverting the unassign step…
              </>
            )}
          </SuccessBanner>
        ) : (
          <>
            <Button type="button" className="w-full" onClick={() => review.decideProduct(item.id, "accept")}>
              Accept the new behavior
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => review.decideProduct(item.id, "reject")}
            >
              Keep the old behavior · send a correction
            </Button>
            <p className="text-[11px] leading-snug text-[#8a8a8a]">
              Accept updates {TASK.ticket} to v2. Keeping the old behavior sends Harbor a correction to revert it.
            </p>
          </>
        )}
        {decision ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="xs" variant="secondary" onClick={() => review.openFile("tickets/PLT-212.md")}>
              Open {TASK.ticket}
            </Button>
            {decision.restoredOn ? (
              <Button type="button" size="xs" variant="secondary" onClick={() => review.openFile(item.file)}>
                Show {decision.restoredOn} in the diff
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EvidenceActions({ item }: { item: ReviewItem }) {
  const review = useReview();
  const detail = item.evidence!;
  const state = stateFor(review.draft, item.id);
  const researched = state.research?.status === "done";
  const running = state.research?.status === "running";

  return (
    <div data-tour="routes" className="space-y-3 border-t border-[#2b2b2b] p-3">
      <p className="text-[11px] font-medium tracking-wide text-[#8a8a8a]">YOU CANNOT JUDGE THIS YET</p>

      <div className="rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] p-2.5">
        <p className="text-[13px] text-[#e8e8e8]">Code question · ask Harbor</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[#9a9a9a]">
          A short research pass. Harbor reads the codebase and reports back. It changes nothing.
        </p>
        <p className="mt-1.5 text-[13px] text-[#d4d4d4]">“{detail.codeQuestion}”</p>
        {!state.research ? (
          <Button type="button" size="sm" className="mt-2" onClick={() => review.askAgent(item.id)}>
            Ask Harbor: what does the rest of the codebase do?
          </Button>
        ) : running ? (
          <p className="mt-2 text-[12px] text-[#e2c044]" aria-live="polite">
            Harbor is reading every caller of listProjects()…
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            <p className="text-[12px] text-[#89d185]">Research back · {detail.research.summary}</p>
            <ul className="space-y-1.5">
              {detail.research.findings.map((finding) => (
                <li
                  key={finding.where}
                  className={cn(
                    "rounded-sm px-2 py-1.5 text-[12px] leading-snug",
                    finding.concern ? "bg-[#e2c044]/10 text-[#e8e8e8]" : "text-[#c8c8c8]",
                  )}
                >
                  <span className="font-medium">{finding.where}</span> · {finding.note}
                  {finding.file ? (
                    <button
                      type="button"
                      className="mt-0.5 block font-mono text-[11px] text-[#3794ff] hover:underline"
                      onClick={() => review.openFile(finding.file!)}
                    >
                      {finding.file}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <PersonRoute
        key={researched ? "after" : "before"}
        id={item.id}
        defaultQuestion={researched ? detail.personQuestionAfter : detail.personQuestionBefore}
        suggestions={detail.suggestedWho}
        researched={researched}
      />

      {state.person ? null : <KeepOpen item={item} />}
    </div>
  );
}

function PersonRoute({
  id,
  defaultQuestion,
  suggestions,
  researched,
}: {
  id: string;
  defaultQuestion: string;
  suggestions: string[];
  researched: boolean;
}) {
  const review = useReview();
  const state = stateFor(review.draft, id);
  const [question, setQuestion] = useState(state.person?.question ?? defaultQuestion);
  const [who, setWho] = useState(state.person?.who === "Not chosen yet" ? "" : (state.person?.who ?? ""));

  if (state.person) {
    return (
      <SuccessBanner label="Waiting on a person">
        “{state.person.question}” · {state.person.who} · {state.person.at}. The item stays open until they answer. That
        open state is the right place to be.
      </SuccessBanner>
    );
  }

  return (
    <form
      className="space-y-2 rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        review.askPerson(id, { question, who });
      }}
    >
      <div>
        <p className="text-[13px] text-[#e8e8e8]">Product question · ask a person</p>
        <p className="mt-0.5 text-[12px] leading-snug text-[#9a9a9a]">
          Optional. Only for “should the product behave this way?”
          {researched ? " Harbor's research turned up one." : ""}
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`pq-${id}`}>Question</Label>
        <Textarea
          id={`pq-${id}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="field-sizing-fixed min-h-16"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`pw-${id}`}>Who might know</Label>
        <Input
          id={`pw-${id}`}
          value={who}
          onChange={(event) => setWho(event.target.value)}
          placeholder="Leave blank if you do not know yet"
        />
        <div className="flex flex-wrap gap-1">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setWho(suggestion)}
              className="rounded-sm border border-[#3c3c3c] px-1.5 py-0.5 text-[11px] text-[#cccccc] hover:bg-[#2a2d2e]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Send to a person
      </Button>
    </form>
  );
}

function KeepOpen({ item }: { item: ReviewItem }) {
  const review = useReview();
  const state = stateFor(review.draft, item.id);
  const detail = item.evidence!;
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(detail.codeQuestion);
  const [evidenceNeeded, setEvidenceNeeded] = useState(detail.evidenceNeeded);
  const [owner, setOwner] = useState("");

  if (state.unresolved) {
    return (
      <div role="status" className="rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] px-2.5 py-2 text-[12px] leading-relaxed">
        <p className="text-[13px] text-[#e2c044]">Kept open on purpose</p>
        <p className="text-[#d4d4d4]">
          {state.unresolved.question} Still needed: {state.unresolved.evidenceNeeded}
          {state.unresolved.owner ? ` · ${state.unresolved.owner}` : ""}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Or keep it open with what is still needed
      </Button>
    );
  }

  return (
    <form
      className="space-y-2 rounded-sm border border-[#3c3c3c] bg-[#1e1e1e] p-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        review.keepUnresolved(item.id, { question, evidenceNeeded, owner });
      }}
    >
      <p className="text-[13px] text-[#e8e8e8]">Keep it open</p>
      <div className="space-y-1">
        <Label htmlFor={`uq-${item.id}`}>Question</Label>
        <Textarea
          id={`uq-${item.id}`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="field-sizing-fixed min-h-14"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`ue-${item.id}`}>Evidence still needed</Label>
        <Textarea
          id={`ue-${item.id}`}
          value={evidenceNeeded}
          onChange={(event) => setEvidenceNeeded(event.target.value)}
          className="field-sizing-fixed min-h-14"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`uo-${item.id}`}>Owner (optional)</Label>
        <Input id={`uo-${item.id}`} value={owner} onChange={(event) => setOwner(event.target.value)} />
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Keep open
      </Button>
    </form>
  );
}
