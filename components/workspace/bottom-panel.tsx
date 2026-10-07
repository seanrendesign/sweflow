"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { baseTerminal } from "@/lib/sample-data";
import { useReview } from "@/lib/review-store";

export function BottomPanel() {
  const { bottomTab, setBottomTab, draft, checkRunning, phase } = useReview();
  const terminal = [baseTerminal, ...(draft?.terminalExtra ?? [])].join("\n");
  const thread = draft?.agentThread ?? [];

  return (
    <section className="flex h-full min-h-0 flex-col border-t border-[#2b2b2b] bg-[#181818]">
      <Tabs
        value={bottomTab}
        onValueChange={(value) => setBottomTab(value as "terminal" | "agent")}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="flex h-8 items-center border-b border-[#2b2b2b] px-2">
          <TabsList variant="line" className="h-8 bg-transparent">
            <TabsTrigger value="terminal" className="text-[12px]">
              Terminal
            </TabsTrigger>
            <TabsTrigger value="agent" className="text-[12px]">
              Agent
            </TabsTrigger>
          </TabsList>
          {checkRunning ? (
            <span className="ml-3 text-[11px] text-[#e2c044]">Running focused check…</span>
          ) : null}
          {phase !== "review" ? (
            <span className="ml-auto pr-2 text-[11px] text-[#8a8a8a]">
              Output from the last agent run
            </span>
          ) : null}
        </div>
        <TabsContent value="terminal" className="ide-scroll min-h-0 overflow-auto px-3 py-2">
          <pre className="font-mono text-[12px] leading-5 whitespace-pre-wrap">
            {terminal.split("\n").map((row, index) => (
              <span key={index} className="block">
                <TermLine line={row} />
              </span>
            ))}
          </pre>
        </TabsContent>
        <TabsContent value="agent" className="ide-scroll min-h-0 overflow-auto">
          {phase !== "review" ? (
            <p className="px-3 py-3 text-[13px] text-[#9d9d9d]">
              Your ask and Harbor&apos;s handoff appear when you open the work. Corrections and research passes land here.
            </p>
          ) : (
            thread.map((message) => (
              <article key={message.id} className="border-b border-[#2b2b2b] px-3 py-2">
                <header className="flex gap-2 text-[11px] text-[#8a8a8a]">
                  <span className="text-[#cccccc]">
                    {message.role === "agent" ? "Harbor" : "You"}
                  </span>
                  <span>{message.at}</span>
                </header>
                <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-wrap text-[#d4d4d4]">
                  {message.text}
                </p>
              </article>
            ))
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function TermLine({ line }: { line: string }) {
  let className = "text-[#cccccc]";
  if (line.startsWith("✓") || line.includes(" passed")) className = "text-[#89d185]";
  else if (
    line.startsWith("×") ||
    line.includes("Assertion") ||
    line.includes("failed") ||
    line.includes("Received")
  ) {
    className = "text-[#f14c4c]";
  } else if (line.startsWith("$") || line.startsWith(" RUN")) className = "text-[#dcdcaa]";
  else if (
    line.includes("inconclusive") ||
    line.includes("not written") ||
    line.includes("Not covered") ||
    line.startsWith(" No ")
  ) {
    className = "text-[#e2c044]";
  } else if (line.startsWith("harbor@")) className = "text-[#4ec9b0]";
  return <span className={className}>{line || " "}</span>;
}
