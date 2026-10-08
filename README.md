# SWEflow · v2 guided review

SWEflow is where an engineer returns after an AI agent finishes a delegated task. Version 2 follows the revised user flow from user testing: the agent sorts its work into a guided list, you judge one item at a time, and you still make the final call.

v2 uses the same sample task as v1, so only the flow differs: **checkout retry copy** on `northwind-checkout`. Harbor finished `agent/checkout-retry-copy` at `a4c91e2` against spec `checkout-retry` 3.2. The ask was one casual sentence: *"Can you make the retry banner after a declined card friendlier, and let people try again?"* Nothing here talks to Git. Results are saved in this browser under `sweflow.v2.*` keys, separate from v1.

## Run

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:48231](http://127.0.0.1:48231).

## What you review

The opening context shows what you asked, what Harbor finished, and what it is unsure about. There is no prior review. Spec 3.2 lines appear only on the items they apply to.

**Looks right, confirm**

- *R1 Keep the card form editable after a decline*: what happens right after the decline → **Confirmed**
- *R5 Clear the notice after a successful retry*: what happens after the next attempt succeeds → **Confirmed**

**Needs your judgment**

- *R2 Retry notice must not claim the payment succeeded*: send a correction, inspect Harbor's revision `c8e11aa`, run one focused check → **Corrected**, then **Confirmed**.
- *R3 Offer retry only for soft declines*: Harbor let `suspected_fraud` retry on its own. Before (spec 3.2, terminal) and after (Harbor's retry) are on screen. Accept and the spec becomes 3.3, or keep the old behavior and Harbor restores the terminal error on `f2d9b47` → **Decision recorded**.
- *R4 Announce the notice and move focus*: not enough evidence. Ask Harbor for a short research pass on how other notices do it, ask a person (Sam Okonkwo, QA) → **Waiting on a person**, or keep it open.

**Concept notes**, beside the list and not scored: the new `useRetryPolicy` hook and the new soft-vs-hard decline split → **Noted**.

Save keeps confirms, decisions, people you are waiting on, and notes. Close, then Resume brings them back. **Walk through** replays the tour. **Reset demo** clears v2 state only.
