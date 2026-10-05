export type EvidenceClass =
  | "supports"
  | "confirmed_mismatch"
  | "possible_intentional"
  | "insufficient";

export type Disposition =
  | "unreviewed"
  | "supported"
  | "correction_sent"
  | "spec_change"
  | "review_pending"
  | "unresolved";

export type ReviewDomain = "spec" | "architecture" | "behavior";

export type CheckResult = "pass" | "fail" | "inconclusive" | "missing";

export type SidebarView =
  | "task"
  | "evidence"
  | "resolve"
  | "correct"
  | "recheck"
  | "investigate"
  | "peer";

export type MobilePane = "files" | "review" | "code" | "output";

export type DialogName =
  | "save"
  | "support"
  | "spec"
  | "peer"
  | "unresolved"
  | "discard"
  | "restart";

export interface Check {
  id: string;
  name: string;
  result: CheckResult;
  detail: string;
}

export interface Revision {
  id: string;
  author: string;
  at: string;
  summary: string;
}

export interface FocusedCheck {
  name: string;
  result: "pass" | "fail" | "inconclusive";
  output: string;
}

export interface Requirement {
  id: string;
  title: string;
  flagged: boolean;
  evidenceClass: EvidenceClass;
  classRationale: string;
  file: string;
  evidence: {
    specVersion: string;
    specText: string;
    codeNote: string;
    revisionIds: string[];
    checks: Check[];
    behavior: string;
  };
  revised?: {
    revision: string;
    summary: string;
    specVersion: string;
    specText: string;
    codeNote: string;
    behavior: string;
    checks: Check[];
    affected: { id: string; note: string }[];
    focusedCheck: FocusedCheck;
  };
  focusedCheck: FocusedCheck;
  canResolveIndependently: boolean;
  independentReason: string;
  defaultDomain: ReviewDomain;
  openQuestion: string;
  evidenceNeeded: string;
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
  lines: DiffLine[];
  revisedLines?: DiffLine[];
  /** Requirement ids whose revised evidence swaps in revisedLines. */
  revisedWhen: string[];
  doc?: string;
}

export interface AgentMessage {
  id: string;
  role: "agent" | "you";
  at: string;
  text: string;
}

export interface Decision {
  disposition: Disposition;
  support?: {
    codeRevision: string;
    specVersion: string;
    at: string;
    evidence: string[];
  };
  correction?: {
    message: string;
    at: string;
  };
  specChange?: {
    approver: string;
    role: string;
    version: string;
    note: string;
    at: string;
  };
  unresolved?: {
    question: string;
    evidenceNeeded: string;
    owner: string;
    at: string;
  };
  reviewRequest?: {
    domain: ReviewDomain;
    owner: string;
    question: string;
    at: string;
  };
  focusedCheck?: FocusedCheck & { at: string };
}

export interface Draft {
  decisions: Record<string, Decision>;
  agentThread: AgentMessage[];
  terminalExtra: string[];
  applied: string[];
  harborReady: string[];
  dirty: boolean;
  savedAt: string | null;
}

export interface Snapshot {
  savedAt: string;
  decisions: Record<string, Decision>;
  agentThread: AgentMessage[];
  terminalExtra: string[];
  applied: string[];
  harborReady: string[];
}
