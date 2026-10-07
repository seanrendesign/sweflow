import type { AgentMessage, ConceptNote, FileDoc, ReviewItem } from "@/lib/types";

export const TASK = {
  title: "Archive projects instead of deleting them",
  repo: "tasklane",
  branch: "agent/archive-projects",
  agent: "Harbor",
  askedAt: "Oct 7, 9:12 AM",
  finishedAt: "Oct 7, 10:04 AM",
  baseRevision: "a3f9c10",
  ask: "Can we let people archive a project instead of deleting it? Deleting is scary.",
  ticket: "PLT-212",
  finished: [
    "Added Archive and Restore to project settings. Only admins see them.",
    "Archived projects leave the sidebar.",
    "Added an archived_at column and a table that logs each archive and restore.",
    "Wrote 3 tests. All 3 pass on a3f9c10.",
  ],
  unsure: [
    "I unassign open tasks when a project is archived, so My Tasks stays clean. You did not ask for that.",
    "listProjects() now hides archived projects for every caller. I did not check the other callers.",
  ],
} as const;

export const TICKET_LINES = {
  hide: "Archiving hides a project from the sidebar and from search.",
  restoreV1: "Admins can restore an archived project as it was.",
  restoreV2: "Admins can restore an archived project. Open tasks come back unassigned.",
};

export const REVISION_NOTES: Record<string, string> = {
  a3f9c10: "Harbor · Archive and Restore, sidebar filter, migration, 3 tests",
  b72e0f1: "Harbor · Search skips archived projects (your correction)",
  d05a6b3: "Harbor · Archiving keeps task assignees (your decision)",
};

export const items: ReviewItem[] = [
  {
    id: "sidebar",
    pile: "confirm",
    kind: "confirm",
    title: "Archived projects leave the sidebar",
    category: `Written requirement · ${TASK.ticket}`,
    whyHere:
      "The change is one filter, and a test checks it on this revision. The evidence matches the ticket.",
    closesWith: "Confirm it. That records this item only, on this revision.",
    file: "src/projects/listProjects.ts",
    changed:
      "listProjects() now skips projects that have an archived_at date. The sidebar gets its list from listProjects().",
    check: {
      name: "archived project leaves the sidebar",
      result: "pass",
      detail: "Archived “Q3 launch” and reloaded the sidebar. 4 projects show. “Q3 launch” is not one of them.",
    },
    written: {
      source: TASK.ticket,
      text: TICKET_LINES.hide,
      scope: "This item covers the sidebar half. Search is a separate item under Needs your judgment.",
    },
  },
  {
    id: "restore",
    pile: "confirm",
    kind: "confirm",
    title: "Restore puts the project back",
    category: `Written requirement · ${TASK.ticket}`,
    whyHere:
      "Restore clears the archived date, and a test checks the project comes back with its tasks.",
    closesWith: "Confirm it. That records this item only, on this revision.",
    file: "src/projects/archive.ts",
    changed:
      "restoreProject() sets archived_at back to empty and logs a restore. Admins see a Restore button on archived projects.",
    check: {
      name: "restore puts the project back in the sidebar",
      result: "pass",
      detail: "“Q3 launch” is back in the sidebar with all 12 of its tasks.",
    },
    written: {
      source: TASK.ticket,
      text: TICKET_LINES.restoreV1,
    },
    related: {
      id: "unassign",
      note: "This only checks that the project comes back. Whether its tasks come back with their assignees is a separate call.",
    },
  },
  {
    id: "search",
    pile: "judgment",
    kind: "correct",
    title: "Archived projects still show up in search",
    category: "Written requirement the evidence contradicts",
    whyHere:
      "The ticket says archived projects leave search too. Harbor only filtered the sidebar, so searching “Q3” still finds the archived project.",
    closesWith: "Send Harbor a correction, then recheck its fix with one focused check.",
    file: "src/search/searchProjects.ts",
    changed: "Nothing. searchProjects() was not touched, and it has its own query.",
    check: {
      name: "search skips archived projects",
      result: "missing",
      detail: "No test covers search. Harbor's 3 tests only look at the sidebar and restore.",
    },
    written: {
      source: TASK.ticket,
      text: TICKET_LINES.hide,
      scope: "This item covers the search half.",
    },
    correct: {
      expected: "Searching “Q3” finds no archived projects.",
      actual: "“Q3 launch” is the first result, with no sign that it is archived.",
      correctionDraft: [
        "searchProjects() still returns archived projects.",
        "PLT-212 says archiving hides a project from search too.",
        "",
        "Skip projects with an archived_at date in searchProjects(), and add a test for it.",
        "Leave the sidebar and restore code as they are.",
      ].join("\n"),
      revision: "b72e0f1",
      revisionSummary: "searchProjects() skips archived projects. New test: search skips archived projects.",
      agentReply: [
        "Fixed. searchProjects() now skips projects with an archived_at date, the same filter listProjects() uses.",
        "",
        "I added one test: search skips archived projects. I did not touch the sidebar or restore code. Pushed b72e0f1.",
      ].join("\n"),
      focusedCheck: {
        name: "search skips archived projects",
        output: [
          '$ pnpm test src/search/searchProjects.test.ts -t "skips archived"',
          "",
          " ✓ search skips archived projects                  10ms",
          '   Query "Q3": 0 results. "Q3 launch" is archived.',
          "",
          " revision b72e0f1",
          " Focused check passed. Only this item was rechecked.",
        ].join("\n"),
      },
      fixedBehavior: "Searching “Q3” returns nothing while “Q3 launch” is archived.",
    },
  },
  {
    id: "unassign",
    pile: "judgment",
    kind: "product",
    title: "Archiving unassigns open tasks",
    category: "Behavior change you did not ask for",
    whyHere:
      "Harbor made a product choice on its own: archiving now removes the assignee from every open task. You did not ask for it, and it changes what “restore as it was” means.",
    closesWith:
      "Accept the new behavior, or keep the old one and Harbor reverts it. Either way your decision is recorded.",
    file: "src/projects/archive.ts",
    changed: "archiveProject() sets assignee to empty on every open task in the project.",
    check: {
      name: "archiving unassigns open tasks",
      result: "pass",
      detail: "Harbor's own test. It proves the code does what Harbor chose, not that the choice is right.",
    },
    product: {
      example: "Example: “Q3 launch” has 7 open tasks spread across 3 people.",
      before: {
        label: `${TASK.ticket} v1 · before this change`,
        behavior:
          "Archiving leaves tasks alone. The 7 open tasks keep their assignees. Restore brings the project back exactly as it was.",
        spec: TICKET_LINES.restoreV1,
      },
      after: {
        label: `${TASK.ticket} v2 · Harbor's proposal`,
        behavior:
          "Archiving removes the assignee from all 7 open tasks, so they leave each person's My Tasks. Restore brings them back with no assignee.",
        spec: TICKET_LINES.restoreV2,
      },
      testNote:
        "A passing test cannot approve this. Harbor's test checks that tasks get unassigned, not whether they should.",
      rejectCorrection: [
        "Keep task assignees when a project is archived.",
        "Remove the unassign step from archiveProject() and its test.",
        "Restore should bring tasks back as they were, per PLT-212.",
      ].join("\n"),
      revision: "d05a6b3",
      agentReply: [
        "Reverted. archiveProject() no longer touches tasks, and I removed the unassign test.",
        "",
        "Restore now brings tasks back with their assignees. Pushed d05a6b3. Nothing else changed.",
      ].join("\n"),
    },
  },
  {
    id: "callers",
    pile: "judgment",
    kind: "evidence",
    title: "Every caller of listProjects() now skips archived projects",
    category: "Possible break for code that calls this",
    whyHere:
      "Harbor changed a shared function. Other parts of the app call listProjects(), and nothing shows whether they expect archived projects. There is not enough evidence to judge.",
    closesWith:
      "Ask Harbor what the rest of the codebase does. If that leaves a question about how the product should behave, you can ask a person. Or keep it open on purpose.",
    file: "src/projects/listProjects.ts",
    changed: "listProjects() filters out archived projects for every caller. Before, it returned every project.",
    check: {
      name: "other callers of listProjects()",
      result: "missing",
      detail: "No test calls listProjects() from anywhere but the sidebar.",
    },
    evidence: {
      codeQuestion: "Who else calls listProjects(), and what do they expect?",
      research: {
        reply: [
          "Research pass on listProjects(). I searched the repo for every caller.",
          "",
          "1. Sidebar: wants archived projects hidden. Fine.",
          "2. Weekly digest email (jobs/weeklyDigest.ts): now skips archived projects. Reads as intended.",
          "3. Plan limits (billing/planLimits.ts): counts projects against the Free plan's 10-project limit. Archived projects no longer count, so a Free team could archive projects to make room.",
          "",
          "I did not change anything. Number 3 is a product question, not a code one.",
        ].join("\n"),
        summary: "Two callers are fine. One raises a product question about billing.",
        findings: [
          { where: "Sidebar", note: "Wants archived projects hidden. Fine.", concern: false },
          {
            where: "Weekly digest email",
            note: "Now skips archived projects. Reads as intended.",
            concern: false,
          },
          {
            where: "Plan limits",
            file: "src/billing/planLimits.ts",
            note: "Counts projects toward the Free plan's 10-project limit. Archived projects stop counting, so a Free team could archive to make room.",
            concern: true,
          },
        ],
      },
      personQuestionBefore: "Should an archived project still count anywhere, like plan limits or reports?",
      personQuestionAfter: "Should archived projects count toward the Free plan's 10-project limit?",
      suggestedWho: ["Whoever owns plans and billing", "Product lead"],
      evidenceNeeded:
        "Which callers expect archived projects, and whether archived projects count toward plan limits.",
    },
  },
];

export const itemMap = Object.fromEntries(items.map((item) => [item.id, item])) as Record<
  string,
  ReviewItem
>;

export const conceptNotes: ConceptNote[] = [
  {
    id: "note-archived",
    kind: "New concept",
    title: "A project can be archived",
    body: "Projects are now active or archived. Archived means hidden and restorable. Delete still exists and is still permanent. Stored as projects.archived_at; empty means active.",
    file: "db/migrations/0042_project_archive.sql",
  },
  {
    id: "note-table",
    kind: "New table",
    title: "project_archive_events",
    body: "One row each time someone archives or restores a project: which project, who, which action, and when. Nothing reads it yet.",
    file: "db/migrations/0042_project_archive.sql",
  },
];

function line(
  kind: FileDoc["lines"][number]["kind"],
  text: string,
  newNo?: number,
  marks?: string[],
): FileDoc["lines"][number] {
  return { kind, text, newNo, marks };
}

const archiveHead = [
  line("ctx", 'import { db } from "../db";', 1),
  line("ctx", 'import { logArchiveEvent } from "./archiveEvents";', 2),
  line("ctx", "", 3),
  line("add", "export async function archiveProject(projectId: string, actorId: string) {", 4, ["note-archived"]),
  line("add", "  await db", 5, ["note-archived"]),
  line("add", '    .updateTable("projects")', 6, ["note-archived"]),
  line("add", "    .set({ archived_at: new Date() })", 7, ["note-archived"]),
  line("add", '    .where("id", "=", projectId)', 8),
  line("add", "    .execute();", 9),
];

const archiveTail = (start: number) => [
  line("add", '  await logArchiveEvent(projectId, actorId, "archive");', start, ["note-table"]),
  line("add", "}", start + 1),
  line("add", "", start + 2),
  line("add", "export async function restoreProject(projectId: string, actorId: string) {", start + 3, ["restore"]),
  line("add", "  await db", start + 4, ["restore"]),
  line("add", '    .updateTable("projects")', start + 5, ["restore"]),
  line("add", "    .set({ archived_at: null })", start + 6, ["restore"]),
  line("add", '    .where("id", "=", projectId)', start + 7, ["restore"]),
  line("add", "    .execute();", start + 8),
  line("add", '  await logArchiveEvent(projectId, actorId, "restore");', start + 9, ["restore"]),
  line("add", "}", start + 10),
];

const unassign = [
  "  // Keep My Tasks clean: archived work should not sit on anyone.",
  "  await db",
  '    .updateTable("tasks")',
  "    .set({ assignee_id: null })",
  '    .where("project_id", "=", projectId)',
  '    .where("done", "=", false)',
  "    .execute();",
];

export const files: FileDoc[] = [
  {
    path: "src/projects/archive.ts",
    language: "TypeScript",
    kind: "diff",
    status: "added",
    lines: [
      line("hunk", "@@ a3f9c10 src/projects/archive.ts (new file) @@"),
      ...archiveHead,
      ...unassign.map((text, index) => line("add", text, 10 + index, ["unassign"])),
      ...archiveTail(17),
    ],
    variant: {
      revision: "d05a6b3",
      lines: [
        line("hunk", "@@ d05a6b3 src/projects/archive.ts (your decision: keep assignees) @@"),
        ...archiveHead,
        ...unassign.map((text) => line("del", text, undefined, ["unassign"])),
        ...archiveTail(10),
      ],
    },
  },
  {
    path: "src/projects/listProjects.ts",
    language: "TypeScript",
    kind: "diff",
    status: "modified",
    lines: [
      line("hunk", "@@ a3f9c10 src/projects/listProjects.ts @@"),
      line("ctx", 'import { db } from "../db";', 1),
      line("ctx", "", 2),
      line("ctx", "export async function listProjects(teamId: string) {", 3, ["callers"]),
      line("ctx", "  return db", 4),
      line("ctx", '    .selectFrom("projects")', 5),
      line("ctx", '    .where("team_id", "=", teamId)', 6),
      line("add", '    .where("archived_at", "is", null)', 7, ["sidebar", "callers"]),
      line("ctx", '    .orderBy("name")', 8),
      line("ctx", "    .selectAll()", 9),
      line("ctx", "    .execute();", 10),
      line("ctx", "}", 11),
    ],
  },
  {
    path: "src/search/searchProjects.ts",
    language: "TypeScript",
    kind: "diff",
    status: "unchanged",
    lines: [
      line("hunk", "@@ not changed on a3f9c10 · src/search/searchProjects.ts @@"),
      line("ctx", 'import { db } from "../db";', 1),
      line("ctx", "", 2),
      line("ctx", "export async function searchProjects(teamId: string, query: string) {", 3, ["search"]),
      line("ctx", "  return db", 4),
      line("ctx", '    .selectFrom("projects")', 5),
      line("ctx", '    .where("team_id", "=", teamId)', 6, ["search"]),
      line("ctx", '    .where("name", "ilike", `%${query}%`)', 7, ["search"]),
      line("ctx", "    .limit(20)", 8),
      line("ctx", "    .selectAll()", 9),
      line("ctx", "    .execute();", 10),
      line("ctx", "}", 11),
    ],
    variant: {
      revision: "b72e0f1",
      lines: [
        line("hunk", "@@ b72e0f1 src/search/searchProjects.ts (your correction) @@"),
        line("ctx", 'import { db } from "../db";', 1),
        line("ctx", "", 2),
        line("ctx", "export async function searchProjects(teamId: string, query: string) {", 3),
        line("ctx", "  return db", 4),
        line("ctx", '    .selectFrom("projects")', 5),
        line("ctx", '    .where("team_id", "=", teamId)', 6),
        line("add", '    .where("archived_at", "is", null)', 7, ["search"]),
        line("ctx", '    .where("name", "ilike", `%${query}%`)', 8),
        line("ctx", "    .limit(20)", 9),
        line("ctx", "    .selectAll()", 10),
        line("ctx", "    .execute();", 11),
        line("ctx", "}", 12),
      ],
    },
  },
  {
    path: "src/components/ProjectSettings.tsx",
    language: "TypeScript JSX",
    kind: "diff",
    status: "modified",
    lines: [
      line("hunk", "@@ a3f9c10 src/components/ProjectSettings.tsx @@"),
      line("ctx", "export function DangerZone({ project, canAdmin }: Props) {", 41),
      line("ctx", "  if (!canAdmin) return null;", 42),
      line("ctx", "  return (", 43),
      line("ctx", '    <section className="danger-zone">', 44),
      line("add", "      {project.archived_at ? (", 45, ["restore"]),
      line("add", "        <Button onClick={() => restore(project.id)}>Restore project</Button>", 46, ["restore"]),
      line("add", "      ) : (", 47),
      line("add", "        <Button onClick={() => archive(project.id)}>Archive project</Button>", 48, ["note-archived"]),
      line("add", "      )}", 49),
      line("ctx", '      <Button variant="destructive" onClick={() => remove(project.id)}>', 50),
      line("ctx", "        Delete project", 51),
      line("ctx", "      </Button>", 52),
      line("ctx", "    </section>", 53),
      line("ctx", "  );", 54),
      line("ctx", "}", 55),
    ],
  },
  {
    path: "src/projects/archive.test.ts",
    language: "TypeScript",
    kind: "diff",
    status: "added",
    lines: [
      line("hunk", "@@ a3f9c10 src/projects/archive.test.ts (new file) @@"),
      line("add", 'it("archived project leaves the sidebar", async () => {', 1, ["sidebar"]),
      line("add", '  await archiveProject(q3.id, admin.id);', 2, ["sidebar"]),
      line("add", '  expect(await sidebarNames(team)).not.toContain("Q3 launch");', 3, ["sidebar"]),
      line("add", "});", 4),
      line("add", "", 5),
      line("add", 'it("restore puts the project back in the sidebar", async () => {', 6, ["restore"]),
      line("add", '  await archiveProject(q3.id, admin.id);', 7, ["restore"]),
      line("add", '  await restoreProject(q3.id, admin.id);', 8, ["restore"]),
      line("add", '  expect(await sidebarNames(team)).toContain("Q3 launch");', 9, ["restore"]),
      line("add", "});", 10),
      line("add", "", 11),
      line("add", 'it("archiving unassigns open tasks", async () => {', 12, ["unassign"]),
      line("add", '  await archiveProject(q3.id, admin.id);', 13, ["unassign"]),
      line("add", "  expect(await openTasks(q3.id)).toSatisfyAll((t) => t.assignee_id === null);", 14, ["unassign"]),
      line("add", "});", 15),
    ],
    variant: {
      revision: "d05a6b3",
      lines: [
        line("hunk", "@@ d05a6b3 src/projects/archive.test.ts (your decision: keep assignees) @@"),
        line("add", 'it("archived project leaves the sidebar", async () => {', 1, ["sidebar"]),
        line("add", '  await archiveProject(q3.id, admin.id);', 2, ["sidebar"]),
        line("add", '  expect(await sidebarNames(team)).not.toContain("Q3 launch");', 3, ["sidebar"]),
        line("add", "});", 4),
        line("add", "", 5),
        line("add", 'it("restore puts the project back in the sidebar", async () => {', 6, ["restore"]),
        line("add", '  await archiveProject(q3.id, admin.id);', 7, ["restore"]),
        line("add", '  await restoreProject(q3.id, admin.id);', 8, ["restore"]),
        line("add", '  expect(await sidebarNames(team)).toContain("Q3 launch");', 9, ["restore"]),
        line("add", "});", 10),
        line("del", "", undefined),
        line("del", 'it("archiving unassigns open tasks", async () => {', undefined, ["unassign"]),
        line("del", '  await archiveProject(q3.id, admin.id);', undefined, ["unassign"]),
        line("del", "  expect(await openTasks(q3.id)).toSatisfyAll((t) => t.assignee_id === null);", undefined, ["unassign"]),
        line("del", "});", undefined),
      ],
    },
  },
  {
    path: "db/migrations/0042_project_archive.sql",
    language: "SQL",
    kind: "diff",
    status: "added",
    lines: [
      line("hunk", "@@ a3f9c10 db/migrations/0042_project_archive.sql (new file) @@"),
      line("add", "ALTER TABLE projects ADD COLUMN archived_at timestamptz;", 1, ["note-archived"]),
      line("add", "", 2),
      line("add", "CREATE TABLE project_archive_events (", 3, ["note-table"]),
      line("add", "  id bigserial PRIMARY KEY,", 4, ["note-table"]),
      line("add", "  project_id bigint NOT NULL REFERENCES projects(id),", 5, ["note-table"]),
      line("add", "  actor_id bigint NOT NULL REFERENCES users(id),", 6, ["note-table"]),
      line("add", "  action text NOT NULL CHECK (action IN ('archive', 'restore')),", 7, ["note-table"]),
      line("add", "  at timestamptz NOT NULL DEFAULT now()", 8, ["note-table"]),
      line("add", ");", 9),
    ],
  },
  {
    path: "src/billing/planLimits.ts",
    language: "TypeScript",
    kind: "diff",
    status: "unchanged",
    revealedBy: "callers",
    lines: [
      line("hunk", "@@ not changed · found by Harbor's research pass @@"),
      line("ctx", 'import { listProjects } from "../projects/listProjects";', 1, ["callers"]),
      line("ctx", "", 2),
      line("ctx", "const FREE_PROJECT_LIMIT = 10;", 3, ["callers"]),
      line("ctx", "", 4),
      line("ctx", "export async function canCreateProject(team: Team) {", 5),
      line("ctx", '  if (team.plan !== "free") return true;', 6),
      line("ctx", "  const projects = await listProjects(team.id);", 7, ["callers"]),
      line("ctx", "  return projects.length < FREE_PROJECT_LIMIT;", 8, ["callers"]),
      line("ctx", "}", 9),
    ],
  },
  {
    path: "tickets/PLT-212.md",
    language: "Markdown",
    kind: "doc",
    status: "unchanged",
    lines: [],
  },
];

export const fileMap = Object.fromEntries(files.map((file) => [file.path, file])) as Record<
  string,
  FileDoc
>;

export const baseTerminal = [
  "harbor@tasklane agent/archive-projects",
  "$ pnpm test src/projects/archive.test.ts",
  "",
  " RUN  src/projects/archive.test.ts",
  "",
  " ✓ archived project leaves the sidebar             14ms",
  " ✓ restore puts the project back in the sidebar    11ms",
  " ✓ archiving unassigns open tasks                   9ms",
  "",
  " Tests  3 passed",
  " Not covered  search · other callers of listProjects()",
  "",
  " revision a3f9c10",
].join("\n");

export const initialAgentThread: AgentMessage[] = [
  {
    id: "you-ask",
    role: "you",
    at: "9:12 AM",
    text: TASK.ask,
  },
  {
    id: "harbor-done",
    role: "agent",
    at: "10:04 AM",
    text: [
      "Done on agent/archive-projects at a3f9c10.",
      "",
      "Admins can archive and restore a project from settings. Archived projects leave the sidebar. I added an archived_at column, an archive log table, and 3 tests.",
      "",
      "Two things I'm unsure about: I unassign open tasks on archive, which you didn't ask for. And listProjects() now hides archived projects for every caller; I didn't check the others.",
    ].join("\n"),
  },
];
