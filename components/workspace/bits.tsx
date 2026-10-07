import type { ReactNode } from "react";
import { CheckCircle2, Clock3, NotebookPen, Scale, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { CheckResult, Tone } from "@/lib/types";

const toneClass: Record<Tone, string> = {
  confirmed: "bg-[#89d185]/15 text-[#89d185]",
  decision: "bg-[#3794ff]/15 text-[#75beff]",
  waiting: "bg-[#cca700]/18 text-[#e2c044]",
  open: "bg-[#c586c0]/15 text-[#d7a6d3]",
  problem: "bg-[#f14c4c]/15 text-[#f48771]",
  idle: "bg-[#3c3c3c] text-[#bbbbbb]",
};

export function StatusChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-5 shrink-0 rounded-sm border-transparent px-1.5 font-medium", toneClass[tone])}
    >
      {label}
    </Badge>
  );
}

export function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-[#2b2b2b] px-3 py-3", className)}>
      <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-[#8a8a8a]">{title}</h3>
      <div className="text-[13px] leading-relaxed text-[#d4d4d4]">{children}</div>
    </section>
  );
}

export function Quote({ children, source }: { children: ReactNode; source?: string }) {
  return (
    <blockquote className="border-l-2 border-[#007acc] bg-[#1e1e1e] px-2.5 py-2 text-[13px] leading-relaxed text-[#d4d4d4]">
      {children}
      {source ? <span className="mt-1 block text-[11px] text-[#8a8a8a]">{source}</span> : null}
    </blockquote>
  );
}

export function checkTone(result: CheckResult) {
  if (result === "pass") return "text-[#89d185]";
  if (result === "fail") return "text-[#f14c4c]";
  return "text-[#e2c044]";
}

export function checkLabel(result: CheckResult) {
  if (result === "pass") return "Pass";
  if (result === "fail") return "Fail";
  return "No check";
}

export type SuccessLabel =
  | "Confirmed"
  | "Corrected"
  | "Decision recorded"
  | "Waiting on a person"
  | "Noted";

const successStyle: Record<SuccessLabel, { className: string; Icon: typeof CheckCircle2 }> = {
  Confirmed: { className: "border-[#89d185]/50 bg-[#89d185]/10 text-[#89d185]", Icon: CheckCircle2 },
  Corrected: { className: "border-[#89d185]/50 bg-[#89d185]/10 text-[#89d185]", Icon: Wrench },
  "Decision recorded": { className: "border-[#3794ff]/60 bg-[#3794ff]/10 text-[#75beff]", Icon: Scale },
  "Waiting on a person": { className: "border-[#e2c044]/50 bg-[#e2c044]/10 text-[#e2c044]", Icon: Clock3 },
  Noted: { className: "border-[#8a8a8a]/50 bg-[#8a8a8a]/10 text-[#d4d4d4]", Icon: NotebookPen },
};

export function SuccessBanner({
  label,
  children,
}: {
  label: SuccessLabel;
  children?: ReactNode;
}) {
  const { className, Icon } = successStyle[label];
  return (
    <div role="status" className={cn("flex gap-2 rounded-sm border px-2.5 py-2", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{label}</p>
        {children ? <div className="mt-0.5 text-[12px] leading-relaxed text-[#d4d4d4]">{children}</div> : null}
      </div>
    </div>
  );
}
