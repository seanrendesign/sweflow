"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReview } from "@/lib/review-store";
import { TOUR_STORAGE_KEY } from "@/lib/tour-cues";
import { TOUR_STEPS } from "@/lib/tour-steps";

interface TourContextValue {
  active: boolean;
  index: number;
  stepId: string | null;
  start: () => void;
  restartAfterReset: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const value = useContext(TourContext);
  if (!value) throw new Error("useTour must be used inside TourProvider");
  return value;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const review = useReview();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(0);
  const booted = useRef(false);
  const applyRef = useRef(review.applyTourCue);

  useEffect(() => {
    applyRef.current = review.applyTourCue;
  }, [review.applyTourCue]);

  useEffect(() => {
    if (!review.hydrated || booted.current) return;
    const saved = review.saved;
    const timer = window.setTimeout(() => {
      if (booted.current) return;
      booted.current = true;
      let seen = false;
      try {
        seen = localStorage.getItem(TOUR_STORAGE_KEY) === "seen";
      } catch {
        seen = false;
      }
      if (!seen && !saved) {
        setActive(true);
        setIndex(0);
        setSession((value) => value + 1);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [review.hydrated, review.saved]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      applyRef.current(TOUR_STEPS[index].cue);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [active, index, session]);

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, "seen");
    } catch {
      // Reset still clears storage. The tour can close either way.
    }
  }, []);

  const skip = useCallback(() => {
    markSeen();
    setActive(false);
  }, [markSeen]);

  const start = useCallback(() => {
    setActive(true);
    setIndex(0);
    setSession((value) => value + 1);
  }, []);

  const restartAfterReset = useCallback(() => {
    setActive(true);
    setIndex(0);
    setSession((value) => value + 1);
  }, []);

  const next = useCallback(() => {
    if (index >= TOUR_STEPS.length - 1) {
      markSeen();
      setActive(false);
      return;
    }
    setIndex(index + 1);
  }, [index, markSeen]);

  const back = useCallback(() => {
    setIndex((current) => Math.max(0, current - 1));
  }, []);

  const step = active ? TOUR_STEPS[index] : null;

  return (
    <TourContext.Provider
      value={{
        active,
        index,
        stepId: step?.id ?? null,
        start,
        restartAfterReset,
      }}
    >
      {children}
      {step ? (
        <TourOverlay
          index={index}
          targets={step.targets}
          title={step.title}
          body={step.body}
          onNext={next}
          onBack={back}
          onSkip={skip}
        />
      ) : null}
    </TourContext.Provider>
  );
}

function TourOverlay({
  index,
  targets,
  title,
  body,
  onNext,
  onBack,
  onSkip,
}: {
  index: number;
  targets: string[];
  title: string;
  body: string;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const review = useReview();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const revealed = useRef("");
  const [rects, setRects] = useState<DOMRect[]>([]);
  const [lifted, setLifted] = useState<Record<number, true>>({});
  const [chromeBottom, setChromeBottom] = useState(108);
  const placement = lifted[index] ? "top" : "bottom";
  const targetKey = targets.join("|");

  useEffect(() => {
    if (review.dialog) return;
    const frame = window.requestAnimationFrame(() => {
      nextRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [index, review.dialog]);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const chrome = document.querySelector("[data-tour-chrome]");
      if (chrome) {
        const bottom = chrome.getBoundingClientRect().bottom;
        setChromeBottom((current) => (current === bottom ? current : bottom));
      }

      if (document.documentElement.scrollTop !== 0) document.documentElement.scrollTop = 0;
      if (document.body.scrollTop !== 0) document.body.scrollTop = 0;

      const found = targetKey.split("|").flatMap((name) =>
        name ? [...document.querySelectorAll(`[data-tour="${name}"]`)].filter(isShown) : [],
      );
      const revealKey = `${index}:${found.length}`;
      if (found.length && revealed.current !== revealKey) {
        revealed.current = revealKey;
        reveal(found[0]);
      }
      const nextRects = found.map((element) => element.getBoundingClientRect());
      setRects(nextRects);

      const card = cardRef.current;
      if (!card || nextRects.length === 0) return;
      const cardRect = card.getBoundingClientRect();
      if (cardRect.top < window.innerHeight * 0.45) return;
      if (nextRects.some((rect) => shouldDodge(rect, cardRect))) {
        setLifted((current) => (current[index] ? current : { ...current, [index]: true }));
      }
    };

    frame = window.requestAnimationFrame(measure);
    const interval = window.setInterval(measure, 200);
    const stop = window.setTimeout(() => window.clearInterval(interval), 3500);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
      window.clearTimeout(stop);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [index, targetKey, review.phase, review.view, review.selectedId, review.mobilePane, review.hydrated]);

  const style =
    placement === "top"
      ? { top: chromeBottom + 8, left: 12 }
      : { bottom: 36, left: 12 };

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-30" aria-hidden="true">
        {rects.map((rect, rectIndex) => (
          <div
            key={`${index}-${rectIndex}`}
            className="fixed rounded-sm"
            style={{
              top: Math.max(8, rect.top - 3),
              left: Math.max(4, rect.left - 3),
              width: Math.max(0, rect.width + 6),
              height: Math.max(0, rect.height + 6),
              boxShadow: "0 0 0 2px #1e1e1e, 0 0 0 4px #3794ff",
            }}
          />
        ))}
      </div>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="fixed z-40 flex w-[min(22.5rem,calc(100vw-1.5rem))] flex-col rounded-md border border-[#3794ff] bg-[#252526] p-3 text-[#e8e8e8] shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
        style={style}
      >
        <p className="text-[11px] text-[#9d9d9d]">
          Walk through · {index + 1} of {TOUR_STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-[15px] font-medium text-white">
          {title}
        </h2>
        <p id="tour-body" className="mt-1 max-h-24 overflow-y-auto text-[13px] leading-snug text-[#d4d4d4]">
          {body}
        </p>
        <div className="mt-3 flex shrink-0 items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={index === 0}>
            Back
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <Button ref={nextRef} type="button" size="sm" className="ml-auto" onClick={onNext}>
            Next
          </Button>
        </div>
      </div>
    </>
  );
}

function isShown(element: Element) {
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  let node: Element | null = element;
  while (node) {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

function reveal(element: Element) {
  const scroller = scrollParent(element);
  if (!scroller) return;
  const scrollerRect = scroller.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const padding = 8;
  const above = elementRect.top < scrollerRect.top + padding;
  const below =
    elementRect.bottom > scrollerRect.bottom - padding &&
    elementRect.height < scrollerRect.height - padding * 2;
  const tallAndLow = elementRect.height >= scrollerRect.height - padding * 2 && elementRect.top > scrollerRect.top + padding;
  if (!above && !below && !tallAndLow) return;
  const delta = elementRect.top - scrollerRect.top - padding;
  scroller.scrollTop += delta;
}

function scrollParent(element: Element) {
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = getComputedStyle(parent);
    if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 4) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

function intersects(a: DOMRect, b: DOMRect) {
  return a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4;
}

function shouldDodge(target: DOMRect, card: DOMRect) {
  if (!intersects(target, card)) return false;
  const overlap = Math.min(target.bottom, card.bottom) - Math.max(target.top, card.top);
  if (overlap < 28) return false;
  const ratio = overlap / Math.max(target.height, 1);
  if (target.height > 200 && ratio < 0.45 && target.top < card.top - 80) return false;
  return true;
}
