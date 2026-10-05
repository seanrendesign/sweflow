"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  correctionDraft,
  files,
  harborReply,
  initialAgentThread,
  requirementMap,
  TASK,
} from "@/lib/sample-data";
import {
  decisionFor,
  meaningfulDisposition,
  supportBlockReason,
  versionsFor,
  evidenceLabels,
} from "@/lib/review-logic";
import { clearDemoStorage, REVIEW_STORAGE_KEY, type TourCue } from "@/lib/tour-cues";
import type {
  Decision,
  DialogName,
  Draft,
  MobilePane,
  ReviewDomain,
  SidebarView,
  Snapshot,
} from "@/lib/types";

const DEFAULT_FILE = "checkout/RetryNotice.tsx";

interface Land {
  view: SidebarView;
  selectedId: string | null;
  file: string;
}

function defaultLand(): Land {
  return { view: "task", selectedId: null, file: DEFAULT_FILE };
}

function stamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function freshDraft(savedAt: string | null = null): Draft {
  return {
    decisions: {},
    agentThread: initialAgentThread,
    terminalExtra: [],
    applied: [],
    harborReady: [],
    dirty: false,
    savedAt,
  };
}

function draftFromSnapshot(snapshot: Snapshot): Draft {
  return {
    decisions: snapshot.decisions,
    agentThread: snapshot.agentThread,
    terminalExtra: snapshot.terminalExtra,
    applied: snapshot.applied,
    harborReady: snapshot.harborReady,
    dirty: false,
    savedAt: snapshot.savedAt,
  };
}

interface ReviewContextValue {
  hydrated: boolean;
  phase: "closed" | "loading" | "review";
  saved: Snapshot | null;
  draft: Draft | null;
  error: string | null;
  dismissError: () => void;
  mobilePane: MobilePane;
  setMobilePane: (pane: MobilePane) => void;
  bottomTab: "terminal" | "agent";
  setBottomTab: (tab: "terminal" | "agent") => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  activeFile: string;
  openFile: (path: string) => void;
  showDiff: boolean;
  setShowDiff: (show: boolean) => void;
  view: SidebarView;
  selectedId: string | null;
  attentionOnly: boolean;
  setAttentionOnly: (value: boolean) => void;
  dialog: DialogName | null;
  dialogRequirementId: string | null;
  checkRunning: boolean;
  openReview: (mode: "fresh" | "resume") => void;
  requestClose: () => void;
  confirmDiscard: () => void;
  resetDemo: () => boolean;
  applyTourCue: (cue: TourCue) => void;
  selectRequirement: (id: string) => void;
  showTask: () => void;
  setView: (view: SidebarView) => void;
  openDialog: (dialog: DialogName, requirementId?: string) => void;
  closeDialog: () => void;
  tryRecordSupport: (id: string) => void;
  commitSupport: (id: string) => void;
  sendCorrection: (id: string, message: string) => boolean;
  applyRevision: (id: string) => boolean;
  runFocusedCheck: (id: string) => void;
  confirmSpecChange: (
    id: string,
    input: { approver: string; role: string; version: string; note: string },
  ) => boolean;
  requestReview: (
    id: string,
    input: { domain: ReviewDomain; owner: string; question: string },
  ) => boolean;
  saveUnresolved: (
    id: string,
    input: { question: string; evidenceNeeded: string; owner: string },
  ) => boolean;
  saveReview: () => boolean;
}

const ReviewContext = createContext<ReviewContextValue | null>(null);

export function useReview() {
  const value = useContext(ReviewContext);
  if (!value) throw new Error("useReview must be used inside ReviewProvider");
  return value;
}

export function ReviewProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<"closed" | "loading" | "review">("closed");
  const [saved, setSaved] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("review");
  const [bottomTab, setBottomTab] = useState<"terminal" | "agent">("terminal");
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeFile, setActiveFile] = useState(files[0].path);
  const [showDiff, setShowDiff] = useState(true);
  const [view, setView] = useState<SidebarView>("task");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [dialogRequirementId, setDialogRequirementId] = useState<string | null>(null);
  const [checkRunning, setCheckRunning] = useState(false);
  const timers = useRef<number[]>([]);
  const openGen = useRef(0);
  const openedByTour = useRef(false);
  const landing = useRef<Land>(defaultLand());
  const phaseRef = useRef(phase);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  phaseRef.current = phase;
  draftRef.current = draft;
  savedRef.current = saved;

  const fail = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
        if (raw) setSaved(JSON.parse(raw) as Snapshot);
      } catch {
        setError("The saved review could not be read in this browser. You can still open a new review.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draft?.dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [draft?.dirty]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const mutate = useCallback((updater: (current: Draft) => Draft) => {
    setDraft((current) => (current ? updater(current) : current));
  }, []);

  const openFile = useCallback((path: string) => {
    setActiveFile(path);
    if (phase === "review") setMobilePane("code");
  }, [phase]);

  const openDialog = useCallback((next: DialogName, requirementId?: string) => {
    setDialog(next);
    if (requirementId) setDialogRequirementId(requirementId);
  }, []);

  const closeDialog = useCallback(() => setDialog(null), []);

  const beginReview = useCallback((mode: "fresh" | "resume", land: Land) => {
    const gen = ++openGen.current;
    landing.current = land;
    setError(null);
    setPhase("loading");
    setView(land.view);
    setSelectedId(land.selectedId);
    setBottomTab("terminal");
    setPanelOpen(true);
    setShowDiff(true);
    setActiveFile(land.file);
    setMobilePane("review");
    const timer = window.setTimeout(() => {
      if (openGen.current !== gen) return;
      const savedNow = savedRef.current;
      if (mode === "resume" && savedNow) {
        setDraft(draftFromSnapshot(savedNow));
      } else {
        setDraft(freshDraft());
      }
      setView(landing.current.view);
      setSelectedId(landing.current.selectedId);
      setActiveFile(landing.current.file);
      setPhase("review");
    }, 700);
    timers.current.push(timer);
  }, []);

  const openReview = useCallback(
    (mode: "fresh" | "resume") => {
      openedByTour.current = false;
      beginReview(mode, defaultLand());
    },
    [beginReview],
  );

  const confirmDiscard = useCallback(() => {
    openGen.current += 1;
    openedByTour.current = false;
    setDraft(null);
    setPhase("closed");
    setDialog(null);
    setView("task");
    setSelectedId(null);
    setError(null);
  }, []);

  const requestClose = useCallback(() => {
    if (draft?.dirty) {
      setDialog("discard");
      return;
    }
    confirmDiscard();
  }, [confirmDiscard, draft?.dirty]);

  const resetDemo = useCallback(() => {
    try {
      clearDemoStorage();
    } catch {
      fail("The saved review could not be cleared in this browser.");
      return false;
    }
    openGen.current += 1;
    openedByTour.current = false;
    landing.current = defaultLand();
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setSaved(null);
    setDraft(null);
    setDialog(null);
    setDialogRequirementId(null);
    setError(null);
    setPhase("closed");
    setView("task");
    setSelectedId(null);
    setMobilePane("review");
    setBottomTab("terminal");
    setPanelOpen(true);
    setShowDiff(true);
    setActiveFile(DEFAULT_FILE);
    setAttentionOnly(false);
    setCheckRunning(false);
    return true;
  }, [fail]);

  const applyTourCue = useCallback(
    (cue: TourCue) => {
      setMobilePane("review");
      setError(null);
      setDialog(null);

      if (cue.kind === "welcome") {
        if (openedByTour.current && !draftRef.current?.dirty) {
          openGen.current += 1;
          openedByTour.current = false;
          setDraft(null);
          setPhase("closed");
          setView("task");
          setSelectedId(null);
        }
        return;
      }

      if (cue.kind === "reset") return;

      const requirement = cue.kind === "requirement" ? requirementMap[cue.id] : undefined;
      const land: Land =
        cue.kind === "requirement"
          ? {
              view: cue.view,
              selectedId: cue.id,
              file: requirement?.file ?? DEFAULT_FILE,
            }
          : defaultLand();

      landing.current = land;
      setShowDiff(true);
      setPanelOpen(true);
      setActiveFile(land.file);
      setView(land.view);
      setSelectedId(land.selectedId);

      if (phaseRef.current === "closed") {
        openedByTour.current = true;
        beginReview(savedRef.current ? "resume" : "fresh", land);
      }
    },
    [beginReview],
  );

  const selectRequirement = useCallback((id: string) => {
    const requirement = requirementMap[id];
    if (!requirement) return;
    setSelectedId(id);
    setActiveFile(requirement.file);
    setView("evidence");
    setError(null);
    setMobilePane("review");
  }, []);

  const showTask = useCallback(() => {
    setView("task");
    setError(null);
    setMobilePane("review");
  }, []);

  const tryRecordSupport = useCallback(
    (id: string) => {
      const requirement = requirementMap[id];
      if (!requirement) return;
      const reason = supportBlockReason(requirement, draft);
      if (reason) {
        fail(reason);
        return;
      }
      setDialogRequirementId(id);
      setDialog("support");
      setError(null);
    },
    [draft, fail],
  );

  const commitSupport = useCallback(
    (id: string) => {
      const requirement = requirementMap[id];
      if (!requirement || !draft) return;
      const reason = supportBlockReason(requirement, draft);
      if (reason) {
        fail(reason);
        return;
      }
      const versions = versionsFor(requirement, draft);
      const at = stamp();
      const next: Decision = {
        ...decisionFor(draft, id),
        disposition: "supported",
        support: {
          codeRevision: versions.codeRevision,
          specVersion: versions.specVersion,
          at,
          evidence: evidenceLabels(requirement, draft),
        },
      };
      mutate((current) => ({
        ...current,
        dirty: true,
        decisions: { ...current.decisions, [id]: next },
      }));
      setDialog(null);
      setView("task");
      setSelectedId(id);
      setError(null);
      toast.success(
        `${id} supported against ${versions.codeRevision} and spec ${versions.specVersion}. Other requirements were not approved.`,
      );
    },
    [draft, fail, mutate],
  );

  const sendCorrection = useCallback(
    (id: string, message: string) => {
      const trimmed = message.trim();
      if (!trimmed) {
        fail("The correction needs the unmet requirement and what Harbor should change.");
        return false;
      }
      const at = stamp();
      mutate((current) => ({
        ...current,
        dirty: true,
        decisions: {
          ...current.decisions,
          [id]: {
            ...decisionFor(current, id),
            disposition: "correction_sent",
            correction: { message: trimmed, at },
          },
        },
        agentThread: [
          ...current.agentThread,
          { id: `you-${id}-${Date.now()}`, role: "you", at, text: trimmed },
        ],
      }));
      setBottomTab("agent");
      setPanelOpen(true);
      setError(null);
      toast.success(`Correction for ${id} sent to Harbor.`);
      const timer = window.setTimeout(() => {
        setDraft((current) => {
          if (!current) return current;
          return {
            ...current,
            harborReady: current.harborReady.includes(id)
              ? current.harborReady
              : [...current.harborReady, id],
            agentThread: [
              ...current.agentThread,
              {
                id: `harbor-${id}-${Date.now()}`,
                role: "agent",
                at: stamp(),
                text: harborReply(id),
              },
            ],
          };
        });
      }, 800);
      timers.current.push(timer);
      return true;
    },
    [fail, mutate],
  );

  const applyRevision = useCallback(
    (id: string) => {
      const requirement = requirementMap[id];
      if (!requirement?.revised) {
        fail(`Harbor has not prepared revised evidence for ${id}.`);
        return false;
      }
      if (!draft?.harborReady.includes(id)) {
        fail("Harbor has not returned a revision for this correction yet.");
        return false;
      }
      mutate((current) => ({
        ...current,
        dirty: true,
        applied: current.applied.includes(id) ? current.applied : [...current.applied, id],
      }));
      setActiveFile(requirement.file);
      setShowDiff(true);
      setView("recheck");
      setBottomTab("terminal");
      setPanelOpen(true);
      setError(null);
      return true;
    },
    [draft?.harborReady, fail, mutate],
  );

  const runFocusedCheck = useCallback(
    (id: string) => {
      if (checkRunning) {
        fail("A focused check is already running. Wait for it to finish.");
        return;
      }
      const requirement = requirementMap[id];
      if (!requirement || !draft) return;
      const revised = Boolean(requirement.revised && draft.applied.includes(id));
      const check = revised && requirement.revised ? requirement.revised.focusedCheck : requirement.focusedCheck;
      setCheckRunning(true);
      setPanelOpen(true);
      setBottomTab("terminal");
      setMobilePane("output");
      setError(null);
      mutate((current) => ({
        ...current,
        terminalExtra: [...current.terminalExtra, "", `$ running ${check.name}…`],
      }));
      const timer = window.setTimeout(() => {
        setDraft((current) => {
          if (!current) return current;
          return {
            ...current,
            dirty: true,
            terminalExtra: [...current.terminalExtra, "", check.output],
            decisions: {
              ...current.decisions,
              [id]: {
                ...decisionFor(current, id),
                focusedCheck: { ...check, at: stamp() },
              },
            },
          };
        });
        setCheckRunning(false);
        setMobilePane("review");
        if (check.result === "pass") {
          toast.success(`${check.name} passed. Record support only if this requirement is now met.`);
        } else if (check.result === "fail") {
          toast.error(`${check.name} failed. ${id} is still unmet.`);
        } else {
          toast.warning(`${check.name} is inconclusive. ${id} stays unresolved.`);
        }
      }, 800);
      timers.current.push(timer);
    },
    [checkRunning, draft, fail, mutate],
  );

  const confirmSpecChange = useCallback(
    (
      id: string,
      input: { approver: string; role: string; version: string; note: string },
    ) => {
      if (!input.approver.trim() || !input.version.trim()) {
        fail("Authorization could not be recorded. Name the approver and the approved requirement version.");
        return false;
      }
      const at = stamp();
      mutate((current) => ({
        ...current,
        dirty: true,
        decisions: {
          ...current.decisions,
          [id]: {
            ...decisionFor(current, id),
            disposition: "spec_change",
            specChange: {
              approver: input.approver.trim(),
              role: input.role.trim() || "PM",
              version: input.version.trim(),
              note: input.note.trim(),
              at,
            },
          },
        },
      }));
      setDialog(null);
      setView("evidence");
      setError(null);
      toast.success(
        `${id} tied to approved spec ${input.version.trim()} by ${input.approver.trim()}. Spec ${TASK.specVersion} is not marked met.`,
      );
      return true;
    },
    [fail, mutate],
  );

  const requestReview = useCallback(
    (id: string, input: { domain: ReviewDomain; owner: string; question: string }) => {
      if (!input.question.trim() || !input.owner.trim()) {
        fail("The request needs an open question and an owner before it can be sent.");
        return false;
      }
      const at = stamp();
      mutate((current) => ({
        ...current,
        dirty: true,
        decisions: {
          ...current.decisions,
          [id]: {
            ...decisionFor(current, id),
            disposition: "review_pending",
            reviewRequest: {
              domain: input.domain,
              owner: input.owner.trim(),
              question: input.question.trim(),
              at,
            },
          },
        },
      }));
      setDialog(null);
      setView("evidence");
      setError(null);
      toast.success(`Review requested from ${input.owner.trim()}. ${id} stays pending.`);
      return true;
    },
    [fail, mutate],
  );

  const saveUnresolved = useCallback(
    (id: string, input: { question: string; evidenceNeeded: string; owner: string }) => {
      if (!input.question.trim() || !input.evidenceNeeded.trim() || !input.owner.trim()) {
        fail("Unresolved items need a question, the evidence still missing, and an owner.");
        return false;
      }
      const at = stamp();
      mutate((current) => ({
        ...current,
        dirty: true,
        decisions: {
          ...current.decisions,
          [id]: {
            ...decisionFor(current, id),
            disposition: "unresolved",
            unresolved: {
              question: input.question.trim(),
              evidenceNeeded: input.evidenceNeeded.trim(),
              owner: input.owner.trim(),
              at,
            },
          },
        },
      }));
      setDialog(null);
      setView("evidence");
      setError(null);
      toast.success(`${id} kept unresolved. The question stays on the review.`);
      return true;
    },
    [fail, mutate],
  );

  const saveReview = useCallback(() => {
    if (!draft) {
      fail("Open a review before saving.");
      return false;
    }
    const hasFinding = Object.values(draft.decisions).some((decision) =>
      meaningfulDisposition(decision.disposition),
    );
    if (!hasFinding) {
      fail(
        "Nothing to save yet. Record support, request a correction, or leave a requirement unresolved.",
      );
      return false;
    }
    const snapshot: Snapshot = {
      savedAt: stamp(),
      decisions: draft.decisions,
      agentThread: draft.agentThread,
      terminalExtra: draft.terminalExtra,
      applied: draft.applied,
      harborReady: draft.harborReady,
    };
    try {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      fail("The review could not be saved in this browser.");
      return false;
    }
    setSaved(snapshot);
    setDraft({ ...draft, dirty: false, savedAt: snapshot.savedAt });
    setDialog(null);
    setError(null);
    toast.success(`Review saved ${snapshot.savedAt}. You can close it and resume later.`);
    return true;
  }, [draft, fail]);

  const value = useMemo<ReviewContextValue>(
    () => ({
      hydrated,
      phase,
      saved,
      draft,
      error,
      dismissError,
      mobilePane,
      setMobilePane,
      bottomTab,
      setBottomTab,
      panelOpen,
      setPanelOpen,
      activeFile,
      openFile,
      showDiff,
      setShowDiff,
      view,
      selectedId,
      attentionOnly,
      setAttentionOnly,
      dialog,
      dialogRequirementId,
      checkRunning,
      openReview,
      requestClose,
      confirmDiscard,
      resetDemo,
      applyTourCue,
      selectRequirement,
      showTask,
      setView,
      openDialog,
      closeDialog,
      tryRecordSupport,
      commitSupport,
      sendCorrection,
      applyRevision,
      runFocusedCheck,
      confirmSpecChange,
      requestReview,
      saveUnresolved,
      saveReview,
    }),
    [
      hydrated,
      phase,
      saved,
      draft,
      error,
      dismissError,
      mobilePane,
      bottomTab,
      panelOpen,
      activeFile,
      openFile,
      showDiff,
      view,
      selectedId,
      attentionOnly,
      dialog,
      dialogRequirementId,
      checkRunning,
      openReview,
      requestClose,
      confirmDiscard,
      resetDemo,
      applyTourCue,
      selectRequirement,
      showTask,
      openDialog,
      closeDialog,
      tryRecordSupport,
      commitSupport,
      sendCorrection,
      applyRevision,
      runFocusedCheck,
      confirmSpecChange,
      requestReview,
      saveUnresolved,
      saveReview,
    ],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function defaultCorrection(id: string) {
  const requirement = requirementMap[id];
  return requirement ? correctionDraft(requirement) : "";
}
