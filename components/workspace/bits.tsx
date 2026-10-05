import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { CheckResult } from "@/lib/types";

const toneClass = {
  supported: "bg-[#89d185]/15 text-[#89d185]",
  divergence: "bg-[#f14c4c]/15 text-[#f14c4c]",
  unresolved: "bg-[#cca700]/18 text-[#e2c044]",
  spec: "bg-[#3794ff]/15 text-[#3794ff]",
  idle: "bg-[#3c3c3c] text-[#bbbbbb]",
} as const;

export function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof toneClass;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 rounded-sm border-transparent px-1.5 font-medium",
        toneClass[tone],
      )}
    >
      {label}
    </Badge>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#2b2b2b] px-3 py-3">
      <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-[#8a8a8a]">
        {title}
      </h3>
      <div className="text-[13px] leading-relaxed text-[#d4d4d4]">{children}</div>
    </section>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-2 border-[#007acc] bg-[#1e1e1e] px-2.5 py-2 text-[13px] leading-relaxed text-[#d4d4d4]">
      {children}
    </blockquote>
  );
}

export function checkTone(result: CheckResult) {
  if (result === "pass") return "text-[#89d185]";
  if (result === "fail") return "text-[#f14c4c]";
  if (result === "missing" || result === "inconclusive") return "text-[#e2c044]";
  return "text-[#d4d4d4]";
}

export function classLabel(evidenceClass: string) {
  switch (evidenceClass) {
    case "supports":
      return "Evidence supports the requirement";
    case "confirmed_mismatch":
      return "Confirmed mismatch";
    case "possible_intentional":
      return "Possible intentional change";
    case "insufficient":
      return "Insufficient evidence";
    default:
      return evidenceClass;
  }
}
