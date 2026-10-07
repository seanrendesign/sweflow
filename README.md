# SWEflow · v2 guided review

SWEflow is where an engineer returns after an AI agent finishes a delegated task. Version 2 follows the revised user flow from user testing: the agent sorts its work into a guided list, you judge one item at a time, and you still make the final call.

The sample task is an informal one-sentence ask on `tasklane`: *"Can we let people archive a project instead of deleting it? Deleting is scary."* The agent, Harbor, finished `agent/archive-projects` at `a3f9c10`. Nothing here talks to Git. Results are saved in this browser under `sweflow.v2.*` keys, separate from v1.

## Run

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:48231](http://127.0.0.1:48231).

## What you review

The opening context shows what you asked, what Harbor finished, and what it is unsure about. Two written lines from ticket PLT-212 appear only on the items they apply to.

**Looks right, confirm**

- *Archived projects leave the sidebar* → **Confirmed**
- *Restore puts the project back* → **Confirmed**

**Needs your judgment**

- *Archived projects still show up in search*: send a correction, inspect Harbor's revision, run one focused check → **Corrected**, then **Confirmed**.
- *Archiving unassigns open tasks*: a product choice Harbor made on its own. Before and after are on screen. Accept (PLT-212 moves to v2) or keep the old behavior (Harbor reverts it) → **Decision recorded**.
- *Every caller of listProjects() now skips archived projects*: not enough evidence. Ask Harbor for a short research pass, ask a person the product question → **Waiting on a person**, or keep it open.

**Concept notes**, beside the list and not scored: a new concept (archived projects) and a new table (`project_archive_events`) → **Noted**.

Save keeps confirms, decisions, people you are waiting on, and notes. Close, then Resume brings them back. **Walk through** replays the tour. **Reset demo** clears v2 state only.
