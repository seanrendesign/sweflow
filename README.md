# SWEflow

SWEflow is the place a senior engineer returns after an AI agent finishes a delegated coding task. It connects each requirement to the spec, the diff, the revision, the checks, and the observed behavior, then keeps a review record of what is supported, what diverges, and what is still unresolved.

The sample session is **checkout retry copy** on `northwind-checkout`. Harbor finished the branch `agent/checkout-retry-copy` at `a4c91e2` against spec `checkout-retry` 3.2. Nothing here talks to Git or a spec host. Findings are saved in this browser.

## Run

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

## Learn and retest

**Walk through** and **Reset demo** sit in the bar under the title, on the closed screen and inside an open review.

On a fresh browser with no saved review, the walkthrough starts on its own. Skip or finish it, and it stays off until you choose Walk through or Reset demo. Reset asks once, then clears the saved review so the sample task is back at the start.

## Review the sample

1. Open the review. The task shows spec 3.2, the revisions, and Maya Chen’s prior review on an older revision.
2. Select a requirement to see its evidence beside the diff.
3. Record support when the evidence holds (R1, R5). That record is tied to the current code and spec versions and does not approve anything else.
4. Resolve a divergence when the evidence conflicts or is thin:
   - R2 is a confirmed mismatch. Request a correction, inspect Harbor’s revised evidence, run the focused check, then record support.
   - R3 may be an intentional spec change. Confirm an authorized version, or request a correction if it is not authorized.
   - R4 does not have enough evidence. Run the focused check or request a behavior review, and keep it unresolved if the trace is still missing.
5. Save the review, close it, and resume. The saved findings come back. Passing checks never mark a requirement met on their own.
