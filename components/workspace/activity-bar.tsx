"use client";

import { Files, GitBranch, ListChecks, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "cn";
import { useReview } from "@/lib/review-store";

const items = [
  { id: "files", label: "Explorer", icon: Files },
  { id: "search", label: "Search is not part of this review", icon: Search, disabled: true },
  { id: "review", label: "Guided review", icon: ListChecks },
  { id: "branch", label: "agent/archive-projects", icon: GitBranch, disabled: true },
] as const;

export function ActivityBar() {
  const { setMobilePane, phase } = useReview();
  return (
    <nav
      aria-label="Activity bar"
      className="flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r border-[#2b2b2b] bg-[#333333] py-2"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const disabled = "disabled" in item && item.disabled;
        const active = item.id === "review" ? phase === "review" : item.id === "files";
        return (
          <Tooltip key={item.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={item.label}
                disabled={disabled}
                onClick={() => {
                  if (item.id === "files") setMobilePane("files");
                  if (item.id === "review") setMobilePane("review");
                }}
                className={cn(
                  "relative flex size-10 items-center justify-center text-[#858585] hover:text-white disabled:cursor-default disabled:hover:text-[#858585]",
                  active && "text-white",
                )}
              >
                {active ? <span className="absolute top-1 left-0 h-8 w-0.5 bg-white" /> : null}
                <Icon className="size-[22px]" strokeWidth={1.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}
