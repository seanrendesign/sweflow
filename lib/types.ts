export type Pile = "confirm" | "judgment";

export type ItemKind = "confirm" | "correct" | "product" | "evidence";

export type CheckResult = "pass" | "fail" | "missing";

export type SidebarView = "overview" | "item";

export type MobilePane = "files" | "review" | "code" | "output";

export type DialogName = "save" | "discard" | "restart";

export type Tone = "confirmed" | "decision" | "waiting" | "open" | "problem" | "idle";

export interface Check {
  name: string;
  result: CheckResult;
  detail: string;
}

export interface WrittenRequirement {
  source: string;
  text: string;
  scope?: string;
}

export interface CorrectDetail {
  expected: string;
  actual: string;
  correctionDraft: string;
  revision: string;
  revisionSummary: string;
  agentReply: string;
  focusedCheck: { name: string; output: string };
  fixedBehavior: string;
}

export interface BehaviorVersion {
  label: string;
  behavior: string;
  spec: string;
}

export interface ProductDetail {
  example: string;
  before: BehaviorVersion;
  after: BehaviorVersion;
  testNote: string;
  rejectCorrection: string;
  revision: string;
  agentReply: string;
}

export interface EvidenceDetail {
  codeQuestion: string;
  runningLabel: string;
  research: {
    reply: string;
    toast: string;
    summary: string;
    findings: { where: string; file?: string; note: string; concern: boolean }[];
  };
  personQuestionBefore: string;
  personQuestionAfter: string;
  suggestedWho: string[];
  evidenceNeeded: string;
}

export interface ReviewItem {
  id: string;
  pile: Pile;
  kind: ItemKind;
  title: string;
  category: string;
  whyHere: string;
  closesWith: string;
  file: string;
  changed: string;
  check: Check;
  written?: WrittenRequirement;
  related?: { id: string; note: string };
  correct?: CorrectDetail;
  product?: ProductDetail;
  evidence?: EvidenceDetail;
}

export interface ConceptNote {
  id: string;
  kind: string;
  title: string;
  body: string;
  file: string;
}

export interface DiffLine {
  kind: "ctx" | "add" | "del" | "hunk";
  newNo?: number;
  text: string;
  marks?: string[];
}

export interface FileDoc {
  path: string;
  language: string;
  kind: "diff" | "doc";
  status: "added" | "modified" | "unchanged";
  lines: DiffLine[];
  /** Lines shown once this agent revision has landed. */
  variant?: { revision: string; lines: DiffLine[] };
  /** File only appears in the explorer after this item's research pass. */
  revealedBy?: string;
}

export interface AgentMessage {
  id: string;
  role: "agent" | "you";
  at: string;
  text: string;
}

export interface ItemState {
  confirmed?: { revision: string; at: string };
  correction?: { message: string; at: string };
  revisionReady?: boolean;
  inspected?: boolean;
  check?: { revision: string; at: string };
  decision?: {
    choice: "accept" | "reject";
    at: string;
    recorded: BehaviorVersion;
    restoredOn?: string;
  };
  research?: { status: "running" | "done"; at: string };
  person?: { question: string; who: string; at: string };
  unresolved?: { question: string; evidenceNeeded: string; owner: string; at: string };
}

export interface Draft {
  items: Record<string, ItemState>;
  noted: string[];
  agentThread: AgentMessage[];
  terminalExtra: string[];
  revisions: string[];
  dirty: boolean;
  savedAt: string | null;
}

export interface Snapshot {
  savedAt: string;
  items: Record<string, ItemState>;
  noted: string[];
  agentThread: AgentMessage[];
  terminalExtra: string[];
  revisions: string[];
}
