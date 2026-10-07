export const STORAGE_PREFIX = "sweflow.v2.";
export const REVIEW_STORAGE_KEY = `${STORAGE_PREFIX}review`;
export const TOUR_STORAGE_KEY = `${STORAGE_PREFIX}tour`;

export type TourCue =
  | { kind: "welcome" }
  | { kind: "overview" }
  | { kind: "notes" }
  | { kind: "save" }
  | { kind: "reset" }
  | { kind: "item"; id: string };

/** Drops only v2 keys, so a v2 reset never touches a v1 review saved in the same browser. */
export function clearDemoStorage() {
  for (const store of [localStorage, sessionStorage]) {
    const keys: string[] = [];
    for (let index = 0; index < store.length; index += 1) {
      const key = store.key(index);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) store.removeItem(key);
  }
}
