"use client";

import { ChevronDown, FileCode, FileText } from "lucide-react";
import { cn } from "cn";
import { files } from "@/lib/sample-data";
import { useReview } from "@/lib/review-store";

export function Explorer() {
  const { activeFile, openFile, phase } = useReview();
  const groups = [
    {
      name: "checkout",
      items: files.filter((file) => file.path.startsWith("checkout/")),
    },
    {
      name: "spec",
      items: files.filter((file) => file.path.startsWith("spec/")),
    },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col border-r border-[#2b2b2b] bg-[#252526] lg:w-60">
      <div className="px-4 py-2 text-[11px] font-medium tracking-wide text-[#bbbbbb]">
        EXPLORER
      </div>
      <div className="px-3 pb-1 text-[11px] text-[#8a8a8a]">northwind-checkout</div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.name}>
            <div className="flex items-center gap-1 px-2 py-1 text-[13px] font-medium text-[#cccccc]">
              <ChevronDown className="size-3.5 text-[#cccccc]" />
              {group.name}
            </div>
            {group.items.map((file) => {
              const name = file.path.split("/")[1];
              const selected = phase === "review" && activeFile === file.path;
              const Icon = file.kind === "doc" ? FileText : FileCode;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => openFile(file.path)}
                  className={cn(
                    "flex w-full items-center gap-1.5 py-1 pr-2 pl-6 text-left text-[13px] text-[#cccccc] hover:bg-[#2a2d2e]",
                    selected && "bg-[#094771] text-white",
                  )}
                >
                  <Icon className="size-3.5 shrink-0 text-[#75beff]" />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
