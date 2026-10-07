"use client";

import { useEffect } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { fileMap, TASK } from "@/lib/sample-data";
import { highlightCode } from "@/lib/highlight";
import { activeFileLines, currentRevision, ticketDoc } from "@/lib/review-logic";
import { useReview } from "@/lib/review-store";
import type { DiffLine } from "@/lib/types";

export function Editor() {
  const {
    phase,
    hydrated,
    draft,
    saved,
    activeFile,
    showDiff,
    setShowDiff,
    selectedId,
    openReview,
    setPanelOpen,
    panelOpen,
  } = useReview();
  const file = fileMap[activeFile];
  const revisions = draft?.revisions ?? [];
  const lines = file && phase === "review" ? activeFileLines(file, revisions) : [];
  const variantRevision =
    file?.variant && revisions.includes(file.variant.revision) ? file.variant.revision : null;
  const fileRevision = variantRevision ?? (file?.status === "unchanged" ? null : TASK.baseRevision);

  useEffect(() => {
    if (!selectedId || phase !== "review") return;
    document.getElementById(`mark-${selectedId}`)?.scrollIntoView({ block: "center" });
  }, [selectedId, activeFile, draft?.revisions, showDiff, phase]);

  return (
    <section
      data-tour={phase === "review" ? "diff" : undefined}
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#1e1e1e]"
    >
      <div className="flex h-9 items-end border-b border-[#2b2b2b] bg-[#252526]">
        {phase === "review" && file ? (
          <div className="flex h-9 items-center border-r border-[#2b2b2b] bg-[#1e1e1e] px-3 text-[13px] text-[#ffffff]">
            {file.path.split("/").at(-1)}
            {variantRevision ? (
              <span className="ml-2 font-mono text-[11px] text-[#89d185]">{variantRevision}</span>
            ) : null}
          </div>
        ) : (
          <div className="flex h-9 items-center px-3 text-[13px] text-[#8a8a8a]">
            No editor
          </div>
        )}
        <div className="ml-auto flex items-center gap-1 px-2 pb-1">
          {phase === "review" && file?.kind === "diff" ? (
            <div className="flex overflow-hidden rounded-sm border border-[#3c3c3c]">
              <button
                type="button"
                onClick={() => setShowDiff(true)}
                className={cn(
                  "px-2 py-0.5 text-[11px]",
                  showDiff ? "bg-[#094771] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]",
                )}
              >
                Diff
              </button>
              <button
                type="button"
                onClick={() => setShowDiff(false)}
                className={cn(
                  "px-2 py-0.5 text-[11px]",
                  !showDiff ? "bg-[#094771] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]",
                )}
              >
                File
              </button>
            </div>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="hidden text-[#cccccc] lg:inline-flex"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? "Hide panel" : "Show panel"}
          </Button>
        </div>
      </div>

      <div className="ide-scroll min-h-0 flex-1 overflow-auto">
        {!hydrated || phase === "loading" ? (
          <LoadingEditor label={hydrated ? "Opening the review…" : "Restoring the workspace…"} />
        ) : phase === "closed" ? (
          <ClosedEditor
            savedAt={saved?.savedAt ?? null}
            onOpen={() => openReview(saved ? "resume" : "fresh")}
            saved={Boolean(saved)}
          />
        ) : file?.kind === "doc" ? (
          <DocView source={ticketDoc(draft)} />
        ) : (
          <DiffView lines={lines} showDiff={showDiff} selectedId={selectedId} />
        )}
      </div>
      {phase === "review" ? (
        <div className="border-t border-[#2b2b2b] px-3 py-1 font-mono text-[11px] text-[#8a8a8a]">
          {TASK.repo} / {activeFile}
          {fileRevision ? ` · ${fileRevision}` : ` · not changed · branch at ${currentRevision(revisions)}`}
        </div>
      ) : null}
    </section>
  );
}

function LoadingEditor({ label }: { label: string }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
      <p className="text-[13px] text-[#9d9d9d]">{label}</p>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-3 animate-pulse rounded-sm bg-[#2a2d2e]"
          style={{ width: `${68 - (index % 4) * 8}%` }}
        />
      ))}
    </div>
  );
}

function ClosedEditor({
  saved,
  savedAt,
  onOpen,
}: {
  saved: boolean;
  savedAt: string | null;
  onOpen: () => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-xl flex-col justify-center px-6">
      <p className="text-[11px] font-medium tracking-wide text-[#3794ff]">
        {saved ? "SAVED REVIEW" : "AGENT WORK IS READY"}
      </p>
      <h2 className="mt-2 text-xl font-medium text-[#e8e8e8]">
        {saved ? "Your archive-projects review is saved" : "Harbor finished: archive projects"}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[#bdbdbd]">
        {saved
          ? `Saved ${savedAt}. Resume to see what you confirmed, what you decided, and who you are waiting on.`
          : `You asked: “${TASK.ask}” Harbor finished on ${TASK.branch} at ${TASK.baseRevision}. Open it to see what it did, what looks right, and what needs your judgment.`}
      </p>
      <div className="mt-4">
        <Button type="button" onClick={onOpen}>
          {saved ? "Resume review" : "Open the finished work"}
        </Button>
      </div>
    </div>
  );
}

function DocView({ source }: { source: string }) {
  return (
    <div className="max-w-3xl px-6 py-4 font-mono text-[13px] leading-6 text-[#d4d4d4]">
      {source.split("\n").map((row, index) => {
        if (row.startsWith("# ")) {
          return (
            <h2 key={index} className="mt-1 mb-3 font-sans text-lg font-medium text-white">
              {row.slice(2)}
            </h2>
          );
        }
        if (row.startsWith("## ")) {
          return (
            <h3 key={index} className="mt-5 mb-1 font-sans text-[15px] font-medium text-[#e8e8e8]">
              {row.slice(3)}
            </h3>
          );
        }
        if (!row.trim()) return <div key={index} className="h-2" />;
        if (row.startsWith("- ")) {
          return (
            <p key={index} className="flex gap-2 font-sans text-[13px] leading-relaxed text-[#d4d4d4]">
              <span className="text-[#3794ff]">•</span>
              {row.slice(2)}
            </p>
          );
        }
        return (
          <p key={index} className="font-sans text-[13px] leading-relaxed text-[#d4d4d4]">
            {row}
          </p>
        );
      })}
    </div>
  );
}

function DiffView({
  lines,
  showDiff,
  selectedId,
}: {
  lines: DiffLine[];
  showDiff: boolean;
  selectedId: string | null;
}) {
  const visible = showDiff ? lines : lines.filter((entry) => entry.kind !== "del" && entry.kind !== "hunk");
  const firstMarkIndex = visible.findIndex(
    (entry) => Boolean(selectedId && entry.marks?.includes(selectedId)),
  );
  return (
    <div className="min-w-max py-1 font-mono text-[12.5px] leading-5">
      {visible.map((entry, index) => {
        const marked = Boolean(selectedId && entry.marks?.includes(selectedId));
        return (
          <div
            key={`${entry.kind}-${index}`}
            id={index === firstMarkIndex ? `mark-${selectedId}` : undefined}
            className={cn(
              "grid grid-cols-[3.25rem_1.1rem_minmax(0,1fr)] pr-4",
              entry.kind === "add" && "bg-[#2ea04322]",
              entry.kind === "del" && "bg-[#f8514926]",
              entry.kind === "hunk" && "bg-[#1e1e1e] text-[#858585]",
              marked && "shadow-[inset_3px_0_0_#3794ff]",
            )}
          >
            <span className="pr-2 text-right text-[#6e6e6e] select-none">
              {entry.kind === "hunk" ? "" : (entry.newNo ?? "")}
            </span>
            <span
              className={cn(
                "select-none",
                entry.kind === "add" && "text-[#3fb950]",
                entry.kind === "del" && "text-[#f85149]",
              )}
            >
              {entry.kind === "add" ? "+" : entry.kind === "del" ? "−" : " "}
            </span>
            <span className="whitespace-pre text-[#d4d4d4]">
              {entry.kind === "hunk" ? entry.text : highlightCode(entry.text)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
