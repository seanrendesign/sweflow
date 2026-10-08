"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { conceptNotes, initialAgentThread, itemMap, SPEC, TASK } from "@/lib/sample-data";
import { currentRevision, hasAnything, stateFor } from "@/lib/review-logic";
import { clearDemoStorage, REVIEW_STORAGE_KEY, type TourCue } from "@/lib/tour-cues";
import type {
  DialogName,
  Draft,
  ItemState,
  MobilePane,
  SidebarView,
  Snapshot,
} from "@/lib/types";

const DEFAULT_FILE = "checkout/RetryNotice.tsx";

interface Land {
  view: SidebarView;
  selectedId: string | null;
  file: string;
  scrollTo?: "notes";
}

function defaultLand(): Land {
  return { view: "overview", selectedId: null, file: DEFAULT_FILE };
}

function stamp() {
  return new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function clock() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function freshDraft(): Draft {
  return {
    items: {},
    noted: [],
    agentThread: initialAgentThread,
    terminalExtra: [],
    revisions: [],
    dirty: false,
    savedAt: null,
  };
}

/** Agent replies still in flight at save time have landed by the time you resume. */
function draftFromSnapshot(snapshot: Snapshot): Draft {
  const itemsNow = { ...snapshot.items };
  const revisions = [...snapshot.revisions];
  const thread = [...snapshot.agentThread];
  for (const [id, state] of Object.entries(itemsNow)) {
    const item = itemMap[id];
    if (!item) continue;
    if (item.correct && state.correction && !state.revisionReady) {
      itemsNow[id] = { ...state, revisionReady: true };
      if (!revisions.includes(item.correct.revision)) revisions.push(item.correct.revision);
      thread.push({ id: `harbor-${id}-resume`, role: "agent", at: "while you were away", text: item.correct.agentReply });
    }
    if (item.product && state.decision?.choice === "reject" && !state.decision.restoredOn) {
      itemsNow[id] = { ...state, decision: { ...state.decision, restoredOn: item.product.revision } };
      if (!revisions.includes(item.product.revision)) revisions.push(item.product.revision);
      thread.push({ id: `harbor-${id}-resume`, role: "agent", at: "while you were away", text: item.product.agentReply });
    }
    if (item.evidence && state.research?.status === "running") {
      itemsNow[id] = { ...state, research: { ...state.research, status: "done" } };
      thread.push({ id: `harbor-${id}-resume`, role: "agent", at: "while you were away", text: item.evidence.research.reply });
    }
  }
  return { ...snapshot, items: itemsNow, revisions, agentThread: thread, dirty: false };
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
  scrollTarget: "notes" | null;
  clearScrollTarget: () => void;
  dialog: DialogName | null;
  checkRunning: boolean;
  openReview: (mode: "fresh" | "resume") => void;
  requestClose: () => void;
  confirmDiscard: () => void;
  resetDemo: () => boolean;
  applyTourCue: (cue: TourCue) => void;
  selectItem: (id: string) => void;
  showOverview: () => void;
  openDialog: (dialog: DialogName) => void;
  closeDialog: () => void;
  confirmItem: (id: string) => void;
  sendCorrection: (id: string, message: string) => boolean;
  inspectRevision: (id: string) => void;
  runFocusedCheck: (id: string) => void;
  decideProduct: (id: string, choice: "accept" | "reject") => void;
  askAgent: (id: string) => void;
  askPerson: (id: string, input: { question: string; who: string }) => boolean;
  keepUnresolved: (
    id: string,
    input: { question: string; evidenceNeeded: string; owner: string },
  ) => boolean;
  markNoted: (id: string) => void;
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
  const [bottomTab, setBottomTab] = useState<"terminal" | "agent">("agent");
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeFile, setActiveFile] = useState(DEFAULT_FILE);
  const [showDiff, setShowDiff] = useState(true);
  const [view, setView] = useState<SidebarView>("overview");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<"notes" | null>(null);
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [checkRunning, setCheckRunning] = useState(false);
  const timers = useRef<number[]>([]);
  const openGen = useRef(0);
  const openedByTour = useRef(false);
  const landing = useRef<Land>(defaultLand());
  const phaseRef = useRef(phase);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  useLayoutEffect(() => {
    phaseRef.current = phase;
    draftRef.current = draft;
    savedRef.current = saved;
  }, [phase, draft, saved]);

  const fail = useCallback((message: string) => {
    setError(message);
    toast.error(message);
  }, []);

  const dismissError = useCallback(() => setError(null), []);
  const clearScrollTarget = useCallback(() => setScrollTarget(null), []);

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
    const onLeave = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [draft?.dirty]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  const later = useCallback((ms: number, fn: () => void) => {
    const gen = openGen.current;
    const timer = window.setTimeout(() => {
      if (openGen.current === gen) fn();
    }, ms);
    timers.current.push(timer);
  }, []);

  const patchItem = useCallback(
    (id: string, patch: (state: ItemState, current: Draft) => ItemState, extra?: (current: Draft) => Partial<Draft>) => {
      setDraft((current) => {
        if (!current) return current;
        const next = patch(stateFor(current, id), current);
        return {
          ...current,
          ...(extra ? extra(current) : {}),
          dirty: true,
          items: { ...current.items, [id]: next },
        };
      });
    },
    [],
  );

  const openFile = useCallback(
    (path: string) => {
      setActiveFile(path);
      if (phase === "review") setMobilePane("code");
    },
    [phase],
  );

  const openDialog = useCallback((next: DialogName) => setDialog(next), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const beginReview = useCallback((mode: "fresh" | "resume", land: Land) => {
    const gen = ++openGen.current;
    landing.current = land;
    setError(null);
    setPhase("loading");
    setView(land.view);
    setSelectedId(land.selectedId);
    setBottomTab("agent");
    setPanelOpen(true);
    setShowDiff(true);
    setActiveFile(land.file);
    setMobilePane("review");
    const timer = window.setTimeout(() => {
      if (openGen.current !== gen) return;
      const savedNow = savedRef.current;
      setDraft(mode === "resume" && savedNow ? draftFromSnapshot(savedNow) : freshDraft());
      setView(landing.current.view);
      setSelectedId(landing.current.selectedId);
      setActiveFile(landing.current.file);
      setScrollTarget(landing.current.scrollTo ?? null);
      setPhase("review");
    }, 600);
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
    setView("overview");
    setSelectedId(null);
    setError(null);
    setCheckRunning(false);
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
    setError(null);
    setPhase("closed");
    setView("overview");
    setSelectedId(null);
    setMobilePane("review");
    setBottomTab("agent");
    setPanelOpen(true);
    setShowDiff(true);
    setActiveFile(DEFAULT_FILE);
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
          setView("overview");
          setSelectedId(null);
        }
        return;
      }
      if (cue.kind === "reset") return;

      const item = cue.kind === "item" ? itemMap[cue.id] : undefined;
      const land: Land = item
        ? { view: "item", selectedId: item.id, file: item.file }
        : { ...defaultLand(), scrollTo: cue.kind === "notes" ? "notes" : undefined };

      landing.current = land;
      setShowDiff(true);
      setPanelOpen(true);
      setActiveFile(land.file);
      setView(land.view);
      setSelectedId(land.selectedId);
      setScrollTarget(land.scrollTo ?? null);

      if (phaseRef.current === "closed") {
        openedByTour.current = true;
        beginReview(savedRef.current ? "resume" : "fresh", land);
      }
    },
    [beginReview],
  );

  const selectItem = useCallback((id: string) => {
    const item = itemMap[id];
    if (!item) return;
    setSelectedId(id);
    setActiveFile(item.file);
    setView("item");
    setError(null);
    setMobilePane("review");
  }, []);

  const showOverview = useCallback(() => {
    setView("overview");
    setError(null);
    setMobilePane("review");
  }, []);

  const confirmItem = useCallback(
    (id: string) => {
      const item = itemMap[id];
      const current = draftRef.current;
      if (!item || !current) return;
      const state = stateFor(current, id);
      if (state.confirmed) return;
      if (item.kind === "correct" && !state.check) {
        fail("Recheck Harbor's fix before you confirm. The fix alone is not the check.");
        return;
      }
      if (item.kind === "product" || item.kind === "evidence") {
        fail("This item cannot be confirmed. It needs a decision or more evidence.");
        return;
      }
      const revision = item.kind === "correct" ? state.check!.revision : currentRevision(current.revisions);
      patchItem(id, (prev) => ({ ...prev, confirmed: { revision, at: stamp() } }));
      setError(null);
      toast.success(
        item.kind === "correct"
          ? `Corrected, then confirmed on ${revision}. Other items stay as they were.`
          : `Confirmed on ${revision}. Nothing else was approved.`,
      );
    },
    [fail, patchItem],
  );

  const sendCorrection = useCallback(
    (id: string, message: string) => {
      const item = itemMap[id];
      const trimmed = message.trim();
      if (!item?.correct) return false;
      if (!trimmed) {
        fail("Say what Harbor should change before you send the correction.");
        return false;
      }
      const at = clock();
      patchItem(
        id,
        (prev) => ({ ...prev, correction: { message: trimmed, at: stamp() }, unresolved: undefined }),
        (current) => ({
          agentThread: [...current.agentThread, { id: `you-${id}-${Date.now()}`, role: "you", at, text: trimmed }],
        }),
      );
      setBottomTab("agent");
      setPanelOpen(true);
      setError(null);
      toast.success("Correction sent to Harbor. It is tied to this item only.");
      const detail = item.correct;
      later(900, () => {
        setDraft((current) => {
          if (!current) return current;
          return {
            ...current,
            revisions: current.revisions.includes(detail.revision)
              ? current.revisions
              : [...current.revisions, detail.revision],
            items: { ...current.items, [id]: { ...stateFor(current, id), revisionReady: true } },
            agentThread: [
              ...current.agentThread,
              { id: `harbor-${id}-${Date.now()}`, role: "agent", at: clock(), text: detail.agentReply },
            ],
          };
        });
        toast(`Harbor pushed ${detail.revision}. Inspect it, then recheck.`);
      });
      return true;
    },
    [fail, later, patchItem],
  );

  const inspectRevision = useCallback(
    (id: string) => {
      const item = itemMap[id];
      if (!item) return;
      patchItem(id, (prev) => ({ ...prev, inspected: true }));
      setActiveFile(item.file);
      setShowDiff(true);
      setMobilePane("code");
    },
    [patchItem],
  );

  const runFocusedCheck = useCallback(
    (id: string) => {
      const item = itemMap[id];
      if (!item?.correct) return;
      if (checkRunning) {
        fail("A focused check is already running.");
        return;
      }
      const check = item.correct.focusedCheck;
      const revision = item.correct.revision;
      setCheckRunning(true);
      setPanelOpen(true);
      setBottomTab("terminal");
      setDraft((current) =>
        current
          ? { ...current, terminalExtra: [...current.terminalExtra, "", `$ running ${check.name}…`] }
          : current,
      );
      later(800, () => {
        patchItem(
          id,
          (prev) => ({ ...prev, check: { revision, at: stamp() } }),
          (current) => ({ terminalExtra: [...current.terminalExtra, "", check.output] }),
        );
        setCheckRunning(false);
        toast.success(`Corrected. ${check.name} passed on ${revision}.`);
      });
    },
    [checkRunning, fail, later, patchItem],
  );

  const decideProduct = useCallback(
    (id: string, choice: "accept" | "reject") => {
      const item = itemMap[id];
      if (!item?.product) return;
      const detail = item.product;
      const at = stamp();
      if (choice === "accept") {
        patchItem(id, (prev) => ({ ...prev, decision: { choice, at, recorded: detail.after } }));
        toast.success(`Decision recorded. Spec ${TASK.specId} is now ${SPEC.proposed} with Harbor's behavior.`);
        return;
      }
      const sentAt = clock();
      patchItem(
        id,
        (prev) => ({ ...prev, decision: { choice, at, recorded: detail.before } }),
        (current) => ({
          agentThread: [
            ...current.agentThread,
            { id: `you-${id}-${Date.now()}`, role: "you", at: sentAt, text: detail.rejectCorrection },
          ],
        }),
      );
      setBottomTab("agent");
      setPanelOpen(true);
      toast.success("Decision recorded. Harbor is restoring the old behavior.");
      later(900, () => {
        setDraft((current) => {
          if (!current) return current;
          const state = stateFor(current, id);
          if (state.decision?.choice !== "reject") return current;
          return {
            ...current,
            revisions: current.revisions.includes(detail.revision)
              ? current.revisions
              : [...current.revisions, detail.revision],
            items: {
              ...current.items,
              [id]: { ...state, decision: { ...state.decision, restoredOn: detail.revision } },
            },
            agentThread: [
              ...current.agentThread,
              { id: `harbor-${id}-${Date.now()}`, role: "agent", at: clock(), text: detail.agentReply },
            ],
          };
        });
        setActiveFile(item.file);
        toast(`Harbor pushed ${detail.revision}. The old behavior is back.`);
      });
    },
    [later, patchItem],
  );

  const askAgent = useCallback(
    (id: string) => {
      const item = itemMap[id];
      if (!item?.evidence) return;
      const detail = item.evidence;
      if (stateFor(draftRef.current, id).research) return;
      const at = clock();
      patchItem(
        id,
        (prev) => ({ ...prev, research: { status: "running", at: stamp() } }),
        (current) => ({
          agentThread: [
            ...current.agentThread,
            {
              id: `you-${id}-${Date.now()}`,
              role: "you",
              at,
              text: `Short research pass, no code changes: ${detail.codeQuestion}`,
            },
          ],
        }),
      );
      setBottomTab("agent");
      setPanelOpen(true);
      later(1200, () => {
        setDraft((current) => {
          if (!current) return current;
          return {
            ...current,
            items: {
              ...current.items,
              [id]: { ...stateFor(current, id), research: { status: "done", at: stamp() } },
            },
            agentThread: [
              ...current.agentThread,
              { id: `harbor-${id}-${Date.now()}`, role: "agent", at: clock(), text: detail.research.reply },
            ],
          };
        });
        toast(detail.research.toast);
      });
    },
    [later, patchItem],
  );

  const askPerson = useCallback(
    (id: string, input: { question: string; who: string }) => {
      if (!input.question.trim()) {
        fail("Write the question you want a person to answer.");
        return false;
      }
      patchItem(id, (prev) => ({
        ...prev,
        unresolved: undefined,
        person: {
          question: input.question.trim(),
          who: input.who.trim() || "Not chosen yet",
          at: stamp(),
        },
      }));
      setError(null);
      toast.success("Waiting on a person. The item stays open, and that is expected.");
      return true;
    },
    [fail, patchItem],
  );

  const keepUnresolved = useCallback(
    (id: string, input: { question: string; evidenceNeeded: string; owner: string }) => {
      if (!input.question.trim() || !input.evidenceNeeded.trim()) {
        fail("Keep the question and the evidence still needed, so the next look starts there.");
        return false;
      }
      patchItem(id, (prev) => ({
        ...prev,
        person: undefined,
        unresolved: {
          question: input.question.trim(),
          evidenceNeeded: input.evidenceNeeded.trim(),
          owner: input.owner.trim(),
          at: stamp(),
        },
      }));
      setError(null);
      toast.success("Kept open on purpose. The question stays on the review.");
      return true;
    },
    [fail, patchItem],
  );

  const markNoted = useCallback((id: string) => {
    const note = conceptNotes.find((entry) => entry.id === id);
    if (!note) return;
    setDraft((current) =>
      current && !current.noted.includes(id)
        ? { ...current, dirty: true, noted: [...current.noted, id] }
        : current,
    );
    toast.success(`Noted: ${note.title}. Nothing to pass or fail.`);
  }, []);

  const saveReview = useCallback(() => {
    if (!draft) {
      fail("Open a review before saving.");
      return false;
    }
    if (!hasAnything(draft)) {
      fail("Nothing to save yet. Confirm an item, record a decision, ask someone, or mark a note.");
      return false;
    }
    const snapshot: Snapshot = {
      savedAt: stamp(),
      items: draft.items,
      noted: draft.noted,
      agentThread: draft.agentThread,
      terminalExtra: draft.terminalExtra,
      revisions: draft.revisions,
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
    toast.success(`Review saved ${snapshot.savedAt}. Close it and resume any time.`);
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
      scrollTarget,
      clearScrollTarget,
      dialog,
      checkRunning,
      openReview,
      requestClose,
      confirmDiscard,
      resetDemo,
      applyTourCue,
      selectItem,
      showOverview,
      openDialog,
      closeDialog,
      confirmItem,
      sendCorrection,
      inspectRevision,
      runFocusedCheck,
      decideProduct,
      askAgent,
      askPerson,
      keepUnresolved,
      markNoted,
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
      scrollTarget,
      clearScrollTarget,
      dialog,
      checkRunning,
      openReview,
      requestClose,
      confirmDiscard,
      resetDemo,
      applyTourCue,
      selectItem,
      showOverview,
      openDialog,
      closeDialog,
      confirmItem,
      sendCorrection,
      inspectRevision,
      runFocusedCheck,
      decideProduct,
      askAgent,
      askPerson,
      keepUnresolved,
      markNoted,
      saveReview,
    ],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}
