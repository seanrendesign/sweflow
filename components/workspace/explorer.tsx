"use client";

import { ChevronDown, FileCode, FileText } from "lucide-react";
import { cn } from "cn";
import { files, TASK } from "@/lib/sample-data";
import { stateFor } from "@/lib/review-logic";
import { useReview } from "@/lib/review-store";

const STATUS_MARK = {
  added: { letter: "A", className: "text-[#89d185]" },
  modified: { letter: "M", className: "text-[#e2c044]" },
  unchanged: { letter: "", className: "" },
} as const;

export function Explorer() {
  const { activeFile, openFile, phase, draft } = useReview();
  const visible = files.filter(
    (file) => !file.revealedBy || stateFor(draft, file.revealedBy).research?.status === "done",
  );
  const groups = ["checkout", "spec"].map((name) => ({
    name,
    items: visible.filter((file) => file.path.startsWith(`${name}/`)),
  }));

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-[#2b2b2b] bg-[#252526] lg:w-60">
      <div className="px-4 py-2 text-[11px] font-medium tracking-wide text-[#bbbbbb]">EXPLORER</div>
      <div className="px-3 pb-1 text-[11px] text-[#8a8a8a]">{TASK.repo}</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.name}>
            <div className="flex items-center gap-1 px-2 py-1 text-[13px] font-medium text-[#cccccc]">
              <ChevronDown className="size-3.5 text-[#cccccc]" />
              {group.name}
            </div>
            {group.items.map((file) => {
              const name = file.path.slice(group.name.length + 1);
              const selected = phase === "review" && activeFile === file.path;
              const Icon = file.kind === "doc" ? FileText : FileCode;
              const mark = STATUS_MARK[file.status];
              return (
                <button
                  key={file.path}
                  type="button"
                  title={file.path}
                  onClick={() => openFile(file.path)}
                  className={cn(
                    "flex w-full items-center gap-1.5 py-1 pr-2 pl-6 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e]",
                    selected && "bg-[#094771] text-white",
                  )}
                >
                  <Icon className="size-3.5 shrink-0 text-[#75beff]" />
                  <span className="truncate">{name}</span>
                  {file.revealedBy ? (
                    <span className="ml-auto shrink-0 text-[10px] text-[#e2c044]">research</span>
                  ) : mark.letter ? (
                    <span className={cn("ml-auto shrink-0 font-mono text-[11px]", mark.className)}>
                      {mark.letter}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
