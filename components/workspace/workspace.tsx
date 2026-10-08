"use client";

import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { TASK } from "@/lib/sample-data";
import { currentRevision, reviewSummary, specVersion } from "@/lib/review-logic";
import { useReview } from "@/lib/review-store";
import { ActivityBar } from "@/components/workspace/activity-bar";
import { BottomPanel } from "@/components/workspace/bottom-panel";
import { ReviewDialogs } from "@/components/workspace/dialogs";
import { Editor } from "@/components/workspace/editor";
import { Explorer } from "@/components/workspace/explorer";
import { GuidedPanel } from "@/components/workspace/guided-panel";
import { useTour } from "@/components/workspace/tour";

const panes = [
  { id: "files", label: "Files" },
  { id: "review", label: "Review" },
  { id: "code", label: "Code" },
  { id: "output", label: "Output" },
] as const;

export function Workspace() {
  const { mobilePane, setMobilePane, panelOpen, draft, phase, saved, openDialog } = useReview();
  const tour = useTour();
  const revision = phase === "review" ? currentRevision(draft?.revisions) : TASK.baseRevision;
  const status = demoStatus(phase, Boolean(saved), Boolean(draft?.dirty));
  const summary = reviewSummary(draft);

  return (
    <div className="flex h-dvh flex-col bg-[#1e1e1e] text-[#cccccc]">
      <div data-tour-chrome className="shrink-0">
        <header className="flex h-9 items-center gap-3 bg-[#3c3c3c] px-3 text-[12px]">
          <span className="font-medium text-white">SWEflow</span>
          <span className="rounded-sm bg-[#007acc] px-1.5 py-0.5 text-[11px] font-medium text-white">
            v2 · guided review
          </span>
          <span className="hidden text-[#cccccc] sm:inline">{TASK.repo}</span>
          <span className="ml-auto truncate font-mono text-[#cccccc]">
            {TASK.branch}
            {draft?.dirty ? "*" : ""}
          </span>
        </header>
        <div className="flex items-center gap-2 border-b border-[#2b2b2b] bg-[#252526] px-2 py-1">
          <p className="min-w-0 truncate text-[11px] text-[#9d9d9d]">{status}</p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button type="button" size="xs" variant="secondary" onClick={tour.start}>
              Walk through
            </Button>
            <Button type="button" size="xs" variant="outline" data-tour="reset" onClick={() => openDialog("restart")}>
              Reset demo
            </Button>
          </div>
        </div>

        <nav className="flex border-b border-[#2b2b2b] bg-[#252526] lg:hidden" aria-label="Workspace">
          {panes.map((pane) => (
            <button
              key={pane.id}
              type="button"
              onClick={() => setMobilePane(pane.id)}
              className={cn(
                "flex-1 py-2 text-[13px]",
                mobilePane === pane.id ? "border-b-2 border-[#007acc] text-white" : "text-[#9d9d9d]",
              )}
            >
              {pane.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden h-full lg:flex">
          <ActivityBar />
        </div>
        <div className={cn("min-h-0", mobilePane === "files" ? "flex w-full" : "hidden", "lg:flex lg:w-60")}>
          <Explorer />
        </div>
        <div
          className={cn(
            "flex min-h-0 min-w-0 flex-1 flex-col",
            mobilePane !== "code" && mobilePane !== "output" && "max-lg:hidden",
          )}
        >
          <div className={cn("flex min-h-0 flex-1 flex-col", mobilePane === "output" && "max-lg:hidden")}>
            <Editor />
          </div>
          {panelOpen || mobilePane === "output" ? (
            <div
              className={cn(
                "min-h-0 shrink-0",
                mobilePane === "output" ? "max-lg:min-h-0 max-lg:flex-1 lg:h-56" : "h-56 max-lg:hidden",
              )}
            >
              <BottomPanel />
            </div>
          ) : null}
        </div>
        <div className={cn("min-h-0", mobilePane === "review" ? "flex w-full" : "hidden", "lg:flex lg:w-[420px]")}>
          <GuidedPanel />
        </div>
      </div>

      <footer className="flex h-6 shrink-0 items-center gap-3 bg-[#007acc] px-2 text-[11px] text-white">
        <span className="truncate">{TASK.branch}</span>
        <span className="font-mono">{revision}</span>
        <span>
          spec {specVersion(phase === "review" ? draft : null).version}
        </span>
        {phase === "review" ? (
          <span>
            {summary.settled}/{summary.total} settled
          </span>
        ) : null}
        <span>{status}</span>
        <span className="ml-auto hidden sm:inline">v2 · guided review · simulated session</span>
      </footer>
      <ReviewDialogs />
    </div>
  );
}

function demoStatus(phase: "closed" | "loading" | "review", saved: boolean, dirty: boolean) {
  if (phase === "loading") return "Opening the finished work";
  if (phase === "closed") return saved ? "Review saved" : "Agent work is ready";
  if (dirty) return "Unsaved review";
  if (saved) return "Review saved";
  return "Review open";
}
