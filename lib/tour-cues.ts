import type { SidebarView } from "@/lib/types";

export const REVIEW_STORAGE_KEY = "sweflow.review.v1";
export const TOUR_STORAGE_KEY = "sweflow.tour.v1";

export type TourCue =
  | { kind: "welcome" }
  | { kind: "task" }
  | { kind: "save" }
  | { kind: "reset" }
  | { kind: "requirement"; id: string; view: SidebarView };

/** Drops every SWEflow key so a reset cannot leave a saved review or a dismissed tour. */
export function clearDemoStorage() {
  for (const store of [localStorage, sessionStorage]) {
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith("sweflow.")) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  }
}
