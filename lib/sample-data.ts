import type {
  AgentMessage,
  FileDoc,
  Requirement,
  Revision,
} from "@/lib/types";

export const TASK = {
  id: "checkout-retry-copy",
  title: "Checkout retry copy",
  repo: "northwind-checkout",
  branch: "agent/checkout-retry-copy",
  agent: "Harbor",
  finishedAt: "Oct 4, 9:40 AM",
  codeRevision: "a4c91e2",
  specId: "checkout-retry",
  specVersion: "3.2",
  priorReview: {
    reviewer: "Maya Chen",
    at: "Oct 1, 4:15 PM",
    summary:
      "R1 recorded as supported on 7b21d0a against spec 3.1. R2 through R5 were not in that review. The record does not cover a4c91e2 or spec 3.2.",
  },
} as const;

export const OWNERS = {
  spec: { name: "Priya Shah", role: "PM" },
  architecture: { name: "Jordan Lee", role: "code owner" },
  behavior: { name: "Sam Okonkwo", role: "QA" },
} as const;

export const revisions: Revision[] = [
  {
    id: "a4c91e2",
    author: "Harbor",
    at: "Oct 4, 9:40 AM",
    summary:
      "Rewrote the retry banner and added a retry branch for suspected_fraud.",
  },
  {
    id: "7b21d0a",
    author: "Maya Chen",
    at: "Oct 1, 4:15 PM",
    summary: "Kept the card form mounted after a soft decline.",
  },
];

export const revisedRevision: Revision = {
  id: "c8e11aa",
  author: "Harbor",
  at: "After the R2 correction",
  summary:
    "Retry notice says the charge was not completed and names the next action.",
};

export const specHistory = [
  {
    version: "3.2",
    at: "Oct 3",
    author: "Priya Shah",
    note: "The notice must not claim success. Hard declines stay terminal. Announcement and focus are required.",
  },
  {
    version: "3.1",
    at: "Sep 28",
    author: "Priya Shah",
    note: "After a decline, the customer can correct the card without a reload.",
  },
];

const passMount: Requirement["evidence"]["checks"][number] = {
  id: "mount",
  name: "form stays mounted after a soft decline",
  result: "pass",
  detail: "PAN and expiry remain after insufficient_funds. The form node is the same instance.",
};

const passClear: Requirement["evidence"]["checks"][number] = {
  id: "clear",
  name: "notice clears after the next charge succeeds",
  result: "pass",
  detail: "A second attempt routes to confirmation with no retry banner.",
};

const failCopy: Requirement["evidence"]["checks"][number] = {
  id: "copy",
  name: "retry notice does not claim the payment succeeded",
  result: "fail",
  detail:
    'Banner text matched /successful/. Received "Payment successful — we\'ll retry shortly".',
};

const passCopy: Requirement["evidence"]["checks"][number] = {
  id: "copy",
  name: "retry notice does not claim the payment succeeded",
  result: "pass",
  detail:
    'Banner is "Charge not completed". Detail names update-the-card or try-again.',
};

export const requirements: Requirement[] = [
  {
    id: "R1",
    title: "Keep the card form editable after a decline",
    flagged: false,
    evidenceClass: "supports",
    classRationale:
      "CheckoutForm.tsx still skips a reload on a soft decline and keeps the values the customer typed. Harbor did not edit this path on a4c91e2.",
    file: "checkout/CheckoutForm.tsx",
    evidence: {
      specVersion: "3.2",
      specText:
        "After a declined payment, the customer can correct the card without a full page reload. Field values the customer already entered remain.",
      codeNote:
        "onSubmit stores the declined charge and does not call router.refresh(). Unchanged since 7b21d0a.",
      revisionIds: ["7b21d0a", "a4c91e2"],
      checks: [passMount],
      behavior:
        "A decline on visa ••4242 leaves the PAN and expiry in the fields. Pay stays enabled on the same form.",
    },
    focusedCheck: {
      name: "form stays mounted after a soft decline",
      result: "pass",
      output: [
        "$ pnpm test checkout/retry-copy.test.ts -t \"form stays mounted\"",
        "",
        " ✓ form stays mounted after a soft decline                     11ms",
        "   PAN and expiry still on the same form node.",
        "",
        " revision a4c91e2 · spec checkout-retry 3.2",
        " Focused check passed. No other requirement was executed.",
      ].join("\n"),
    },
    canResolveIndependently: true,
    independentReason:
      "The mount behavior is covered by an existing test on this revision.",
    defaultDomain: "behavior",
    openQuestion: "Does the form stay mounted after a soft decline on a4c91e2?",
    evidenceNeeded: "The passing mount test and a behavior note for visa ••4242.",
  },
  {
    id: "R2",
    title: "Retry notice must not claim the payment succeeded",
    flagged: true,
    evidenceClass: "confirmed_mismatch",
    classRationale:
      "Spec 3.2 says the charge was not completed and names the next action. The banner on a4c91e2 says the payment succeeded. The copy check fails.",
    file: "checkout/RetryNotice.tsx",
    evidence: {
      specVersion: "3.2",
      specText:
        "The notice states that the charge was not completed and names the next action: update the card or try again. It must not say the payment succeeded.",
      codeNote:
        'title is "Payment successful — we\'ll retry shortly". Harbor replaced the failure copy on a4c91e2 and called it friendlier.',
      revisionIds: ["a4c91e2"],
      checks: [failCopy],
      behavior:
        "The banner reads as a success confirmation while charge.status is still declined. Nothing was captured.",
    },
    revised: {
      revision: "c8e11aa",
      summary:
        "Harbor replaced the success claim with copy that matches spec 3.2.",
      specVersion: "3.2",
      specText:
        "The notice states that the charge was not completed and names the next action: update the card or try again. It must not say the payment succeeded.",
      codeNote:
        'title is "Charge not completed". detail is "Update the card or try again. Nothing was captured."',
      behavior:
        "The banner no longer reads as success. The charge state is still declined, and the next action is visible.",
      checks: [passCopy],
      affected: [
        {
          id: "R1",
          note: "c8e11aa does not touch CheckoutForm.tsx. A support record on a4c91e2 still applies. It is not re-approved by this revision.",
        },
        {
          id: "R5",
          note: "Notice-clear behavior is unchanged. Do not treat the copy fix as support for R5.",
        },
        {
          id: "R4",
          note: "Still no announcement trace and no focus move. The copy fix does not meet R4.",
        },
        {
          id: "R3",
          note: "The suspected_fraud branch is untouched.",
        },
      ],
      focusedCheck: {
        name: "retry notice does not claim the payment succeeded",
        result: "pass",
        output: [
          "$ pnpm test checkout/retry-copy.test.ts -t \"does not claim\"",
          "",
          " ✓ retry notice does not claim the payment succeeded            8ms",
          '   Banner: "Charge not completed"',
          '   Detail: "Update the card or try again. Nothing was captured."',
          "",
          " revision c8e11aa · spec checkout-retry 3.2",
          " Focused check passed. R1, R3, R4, and R5 were not executed and are not approved.",
        ].join("\n"),
      },
    },
    focusedCheck: {
      name: "retry notice does not claim the payment succeeded",
      result: "fail",
      output: [
        "$ pnpm test checkout/retry-copy.test.ts -t \"does not claim\"",
        "",
        " × retry notice does not claim the payment succeeded           18ms",
        "   AssertionError: banner text matched /successful/",
        '   Received: "Payment successful — we\'ll retry shortly"',
        "   Spec checkout-retry 3.2 forbids a success claim while the charge is declined.",
        "",
        " revision a4c91e2 · spec checkout-retry 3.2",
        " Focused check failed. R2 is still unmet.",
      ].join("\n"),
    },
    canResolveIndependently: true,
    independentReason:
      "The mismatch is a copy assertion. You can recheck it with the linked test after Harbor revises the notice.",
    defaultDomain: "behavior",
    openQuestion:
      "Does the retry notice on the current revision avoid claiming the payment succeeded?",
    evidenceNeeded:
      "A passing run of the copy assertion against the revision under review.",
  },
  {
    id: "R3",
    title: "Offer retry only for soft declines",
    flagged: true,
    evidenceClass: "possible_intentional",
    classRationale:
      "Spec 3.2 keeps suspected_fraud terminal. a4c91e2 returns retry for that code, with a comment pointing at an Oct 2 chat. The chat is not an approval, and no test covers the branch.",
    file: "checkout/useRetryPolicy.ts",
    evidence: {
      specVersion: "3.2",
      specText:
        "Offer retry only for issuer soft declines (insufficient_funds, card_velocity). Hard declines (suspected_fraud, stolen_card) show a terminal error and no retry.",
      codeNote:
        "retryDecision returns retry for suspected_fraud. The comment cites an Oct 2 chat and says the change is not in spec 3.2.",
      revisionIds: ["a4c91e2"],
      checks: [
        {
          id: "fraud",
          name: "suspected_fraud stays terminal",
          result: "missing",
          detail: "No test in retry-copy.test.ts covers suspected_fraud or stolen_card.",
        },
      ],
      behavior:
        "A suspected_fraud response renders RetryNotice instead of the terminal error. stolen_card is still terminal.",
    },
    focusedCheck: {
      name: "suspected_fraud stays terminal",
      result: "inconclusive",
      output: [
        "$ pnpm test checkout/retry-copy.test.ts -t \"suspected_fraud\"",
        "",
        " No test covers suspected_fraud.",
        " Behavior note: a suspected_fraud response renders RetryNotice, not the terminal error.",
        " The Oct 2 chat comment is not an approval of a spec change.",
        "",
        " revision a4c91e2 · spec checkout-retry 3.2",
        " Focused check inconclusive. R3 stays unresolved until authorization or a correction.",
      ].join("\n"),
    },
    canResolveIndependently: false,
    independentReason:
      "Changing which declines can retry is a spec decision. Authorization has to come from the PM or designer. A local test cannot approve it.",
    defaultDomain: "spec",
    openQuestion:
      "Is the suspected_fraud retry an authorized change to checkout-retry, or should Harbor restore the terminal error?",
    evidenceNeeded:
      "Either a named approver and the approved requirement version, or a correction that removes the fraud-hold retry.",
  },
  {
    id: "R4",
    title: "Announce the notice and move focus",
    flagged: true,
    evidenceClass: "insufficient",
    classRationale:
      "The notice uses aria-live=\"polite\" and never moves focus. No screen-reader trace and no focus assertion are attached to a4c91e2, so the requirement cannot be marked met.",
    file: "checkout/RetryNotice.tsx",
    evidence: {
      specVersion: "3.2",
      specText:
        "When the notice appears, assistive tech announces it immediately, then focus moves to the first invalid field.",
      codeNote:
        "The banner is role=\"status\" with aria-live=\"polite\". There is no focus() call and no assertive live region.",
      revisionIds: ["a4c91e2"],
      checks: [
        {
          id: "a11y",
          name: "notice is announced and focus moves to the first invalid field",
          result: "missing",
          detail: "The test file does not mention announcement or focus.",
        },
      ],
      behavior: "No screen-reader trace was captured on a4c91e2.",
    },
    focusedCheck: {
      name: "notice is announced and focus moves to the first invalid field",
      result: "inconclusive",
      output: [
        "$ pnpm test checkout/retry-copy.test.ts -t \"announced\"",
        "",
        " No test named for announcement or focus.",
        " No screen-reader trace is attached to a4c91e2.",
        " aria-live=\"polite\" is present. focus() is not called.",
        "",
        " revision a4c91e2 · spec checkout-retry 3.2",
        " Focused check inconclusive. Do not mark R4 met.",
      ].join("\n"),
    },
    canResolveIndependently: false,
    independentReason:
      "A missing accessibility trace needs a behavior check from QA, or a new test that does not exist on this revision. You cannot confirm announcement from the source alone.",
    defaultDomain: "behavior",
    openQuestion:
      "Does the retry notice get announced immediately, and does focus land on the first invalid field?",
    evidenceNeeded:
      "A screen-reader trace or a test that asserts an immediate announcement and a focus move to the first invalid field.",
  },
  {
    id: "R5",
    title: "Clear the notice after a successful retry",
    flagged: false,
    evidenceClass: "supports",
    classRationale:
      "A succeeded charge clears retry state before routing to confirmation. The linked test passes on a4c91e2.",
    file: "checkout/CheckoutForm.tsx",
    evidence: {
      specVersion: "3.2",
      specText:
        "After the next attempt succeeds, remove the retry notice. Do not leave a failure banner on the confirmation step.",
      codeNote:
        "When charge.status is succeeded, onSubmit calls setRetry(null) and then router.push(\"/confirmation\").",
      revisionIds: ["a4c91e2", "7b21d0a"],
      checks: [passClear],
      behavior:
        "The second attempt on the same form lands on confirmation with no banner.",
    },
    focusedCheck: {
      name: "notice clears after the next charge succeeds",
      result: "pass",
      output: [
        "$ pnpm test checkout/retry-copy.test.ts -t \"notice clears\"",
        "",
        " ✓ notice clears after the next charge succeeds                 9ms",
        "   Confirmation renders with no retry banner.",
        "",
        " revision a4c91e2 · spec checkout-retry 3.2",
        " Focused check passed. No other requirement was executed.",
      ].join("\n"),
    },
    canResolveIndependently: true,
    independentReason: "The clear-on-success path has a passing test on a4c91e2.",
    defaultDomain: "behavior",
    openQuestion: "Does the retry notice disappear after the next charge succeeds?",
    evidenceNeeded: "The passing clear test on a4c91e2.",
  },
];

export const requirementMap = Object.fromEntries(
  requirements.map((requirement) => [requirement.id, requirement]),
) as Record<string, Requirement>;

function line(
  kind: FileDoc["lines"][number]["kind"],
  text: string,
  newNo?: number,
  marks?: string[],
): FileDoc["lines"][number] {
  return { kind, text, newNo, marks };
}

export const files: FileDoc[] = [
  {
    path: "checkout/RetryNotice.tsx",
    language: "TypeScript JSX",
    kind: "diff",
    revisedWhen: ["R2"],
    lines: [
      line("hunk", "@@ a4c91e2 checkout/RetryNotice.tsx @@"),
      line("ctx", 'import type { Charge } from "./types";', 1),
      line("ctx", "", 2),
      line("ctx", "type Props = {", 3),
      line("ctx", "  charge: Charge | null;", 4),
      line("ctx", "  onEdit: () => void;", 5),
      line("ctx", "};", 6),
      line("ctx", "", 7),
      line("ctx", "export function RetryNotice({ charge, onEdit }: Props) {", 8),
      line("ctx", '  if (!charge || charge.status === "succeeded") return null;', 9),
      line("ctx", "", 10),
      line("del", '  const title = "Payment failed";'),
      line("del", '  const detail = "Update the card or try again. Nothing was captured.";'),
      line("add", '  const title = "Payment successful — we\'ll retry shortly";', 11, ["R2"]),
      line("add", '  const detail = "Your card was saved for the next attempt.";', 12, ["R2"]),
      line("ctx", "", 13),
      line("ctx", "  return (", 14),
      line("ctx", '    <div role="status" aria-live="polite" className="retry-banner">', 15, ["R4"]),
      line("ctx", "      <h2>{title}</h2>", 16, ["R4"]),
      line("ctx", "      <p>{detail}</p>", 17, ["R4"]),
      line("ctx", '      <button type="button" onClick={onEdit}>', 18),
      line("ctx", "        Edit card", 19),
      line("ctx", "      </button>", 20),
      line("ctx", "    </div>", 21),
      line("ctx", "  );", 22),
      line("ctx", "}", 23),
    ],
    revisedLines: [
      line("hunk", "@@ c8e11aa checkout/RetryNotice.tsx (recheck against a4c91e2) @@"),
      line("ctx", 'import type { Charge } from "./types";', 1),
      line("ctx", "", 2),
      line("ctx", "type Props = {", 3),
      line("ctx", "  charge: Charge | null;", 4),
      line("ctx", "  onEdit: () => void;", 5),
      line("ctx", "};", 6),
      line("ctx", "", 7),
      line("ctx", "export function RetryNotice({ charge, onEdit }: Props) {", 8),
      line("ctx", '  if (!charge || charge.status === "succeeded") return null;', 9),
      line("ctx", "", 10),
      line("del", '  const title = "Payment successful — we\'ll retry shortly";'),
      line("del", '  const detail = "Your card was saved for the next attempt.";'),
      line("add", '  const title = "Charge not completed";', 11, ["R2"]),
      line("add", '  const detail = "Update the card or try again. Nothing was captured.";', 12, ["R2"]),
      line("ctx", "", 13),
      line("ctx", "  return (", 14),
      line("ctx", '    <div role="status" aria-live="polite" className="retry-banner">', 15, ["R4"]),
      line("ctx", "      <h2>{title}</h2>", 16, ["R4"]),
      line("ctx", "      <p>{detail}</p>", 17, ["R4"]),
      line("ctx", '      <button type="button" onClick={onEdit}>', 18),
      line("ctx", "        Edit card", 19),
      line("ctx", "      </button>", 20),
      line("ctx", "    </div>", 21),
      line("ctx", "  );", 22),
      line("ctx", "}", 23),
    ],
  },
  {
    path: "checkout/useRetryPolicy.ts",
    language: "TypeScript",
    kind: "diff",
    revisedWhen: [],
    lines: [
      line("hunk", "@@ a4c91e2 checkout/useRetryPolicy.ts @@"),
      line("ctx", 'const SOFT_DECLINES = new Set(["insufficient_funds", "card_velocity"]);', 1),
      line("ctx", "", 2),
      line("ctx", 'export function retryDecision(code: string): "retry" | "terminal" {', 3),
      line("add", '  if (code === "suspected_fraud") {', 4, ["R3"]),
      line("add", "    // Oct 2 chat: product asked to retry fraud holds — not in spec 3.2", 5, ["R3"]),
      line("add", '    return "retry";', 6, ["R3"]),
      line("add", "  }", 7, ["R3"]),
      line("ctx", '  if (SOFT_DECLINES.has(code)) return "retry";', 8),
      line("ctx", '  return "terminal";', 9),
      line("ctx", "}", 10),
    ],
  },
  {
    path: "checkout/CheckoutForm.tsx",
    language: "TypeScript JSX",
    kind: "diff",
    revisedWhen: [],
    lines: [
      line("hunk", "@@ unchanged on a4c91e2 · behavior from 7b21d0a @@"),
      line("ctx", '"use client";', 1),
      line("ctx", "", 2),
      line("ctx", 'import { useState } from "react";', 3),
      line("ctx", 'import { useRouter } from "next/navigation";', 4),
      line("ctx", 'import { CardFields } from "./CardFields";', 5),
      line("ctx", 'import { RetryNotice } from "./RetryNotice";', 6),
      line("ctx", 'import { initialCard, submitCharge, type Charge } from "./charge";', 7),
      line("ctx", "", 8),
      line("ctx", "export function CheckoutForm() {", 9),
      line("ctx", "  const router = useRouter();", 10),
      line("ctx", "  const [card, setCard] = useState(initialCard);", 11),
      line("ctx", "  const [retry, setRetry] = useState<Charge | null>(null);", 12),
      line("ctx", "", 13),
      line("ctx", "  async function onSubmit() {", 14),
      line("ctx", "    const charge = await submitCharge(card);", 15),
      line("ctx", '    if (charge.status === "succeeded") {', 16, ["R5"]),
      line("ctx", "      setRetry(null);", 17, ["R5"]),
      line("ctx", '      router.push("/confirmation");', 18, ["R5"]),
      line("ctx", "      return;", 19),
      line("ctx", "    }", 20),
      line("ctx", "    // Keep the form mounted. Do not router.refresh().", 21, ["R1"]),
      line("ctx", "    setRetry(charge);", 22, ["R1"]),
      line("ctx", "  }", 23),
      line("ctx", "", 24),
      line("ctx", "  return (", 25),
      line("ctx", "    <form onSubmit={onSubmit}>", 26),
      line("ctx", "      <CardFields value={card} onChange={setCard} />", 27),
      line("ctx", "      <RetryNotice charge={retry} onEdit={() => setRetry(null)} />", 28),
      line("ctx", '      <button type="submit">Pay</button>', 29),
      line("ctx", "    </form>", 30),
      line("ctx", "  );", 31),
      line("ctx", "}", 32),
    ],
  },
  {
    path: "checkout/retry-copy.test.ts",
    language: "TypeScript",
    kind: "diff",
    revisedWhen: [],
    lines: [
      line("hunk", "@@ checkout/retry-copy.test.ts · results from a4c91e2 @@"),
      line("ctx", 'import { render } from "@testing-library/react";', 1),
      line("ctx", 'import { CheckoutForm } from "./CheckoutForm";', 2),
      line("ctx", 'import { decline, succeed } from "./test-charge";', 3),
      line("ctx", "", 4),
      line("ctx", 'it("form stays mounted after a soft decline", async () => {', 5, ["R1"]),
      line("ctx", "  const form = render(<CheckoutForm />);", 6),
      line("ctx", '  await decline(form, "insufficient_funds");', 7),
      line("ctx", '  expect(form.getByLabelText("Card number")).toHaveValue("4242");', 8),
      line("ctx", "});", 9),
      line("ctx", "", 10),
      line("ctx", 'it("notice clears after the next charge succeeds", async () => {', 11, ["R5"]),
      line("ctx", "  const form = render(<CheckoutForm />);", 12),
      line("ctx", '  await decline(form, "insufficient_funds");', 13),
      line("ctx", "  await succeed(form);", 14),
      line("ctx", '  expect(form.queryByRole("status")).toBeNull();', 15),
      line("ctx", "});", 16),
      line("ctx", "", 17),
      line("ctx", 'it("retry notice does not claim the payment succeeded", async () => {', 18, ["R2"]),
      line("ctx", "  const form = render(<CheckoutForm />);", 19),
      line("ctx", '  await decline(form, "insufficient_funds");', 20),
      line("ctx", "  const banner = form.getByRole(\"status\");", 21),
      line("ctx", "  expect(banner).not.toHaveTextContent(/successful/i);", 22),
      line("ctx", "  expect(banner).toHaveTextContent(/try again/i);", 23),
      line("ctx", "});", 24),
    ],
  },
  {
    path: "spec/checkout-retry.md",
    language: "Markdown",
    kind: "doc",
    revisedWhen: [],
    lines: [],
    doc: `# Checkout retry

Version 3.2 · Priya Shah · Oct 3, 2026
Supersedes 3.1. Applies to the card form in northwind-checkout.

## R1 · Form stays editable

After a declined payment, the customer can correct the card without a full page reload. Field values the customer already entered remain.

## R2 · Notice does not claim success

The notice states that the charge was not completed and names the next action: update the card or try again. It must not say the payment succeeded.

## R3 · Retry only for soft declines

Offer retry only for issuer soft declines (\`insufficient_funds\`, \`card_velocity\`). Hard declines (\`suspected_fraud\`, \`stolen_card\`) show a terminal error and no retry.

## R4 · Announce, then move focus

When the notice appears, assistive tech announces it immediately, then focus moves to the first invalid field.

## R5 · Clear the notice after success

After the next attempt succeeds, remove the retry notice. Do not leave a failure banner on the confirmation step.
`,
  },
];

export const fileMap = Object.fromEntries(files.map((file) => [file.path, file])) as Record<
  string,
  FileDoc
>;

export const baseTerminal = [
  "harbor@checkout agent/checkout-retry-copy",
  "$ pnpm test checkout/retry-copy.test.ts",
  "",
  " RUN  checkout/retry-copy.test.ts",
  "",
  " ✓ form stays mounted after a soft decline                     12ms",
  " ✓ notice clears after the next charge succeeds                 9ms",
  " × retry notice does not claim the payment succeeded           18ms",
  "   AssertionError: banner text matched /successful/",
  '   Received: "Payment successful — we\'ll retry shortly"',
  "   Spec checkout-retry 3.2 forbids a success claim while the charge is declined.",
  "",
  " Test files  1 failed",
  " Tests  1 failed | 2 passed | 2 not written",
  "   not written  suspected_fraud stays terminal",
  "   not written  notice is announced and focus moves to the first invalid field",
  "",
  " revision a4c91e2 · spec checkout-retry 3.2",
].join("\n");

export const initialAgentThread: AgentMessage[] = [
  {
    id: "harbor-done",
    role: "agent",
    at: "9:40 AM",
    text: [
      "Finished checkout retry copy on agent/checkout-retry-copy at a4c91e2.",
      "",
      "I rewrote the retry banner and allowed a retry when the issuer returns suspected_fraud. The form-mount path from 7b21d0a is unchanged.",
      "",
      "The spec on this branch is still checkout-retry 3.2. I did not edit it.",
    ].join("\n"),
  },
];

export function harborReply(requirementId: string): string {
  if (requirementId === "R2") {
    return [
      "Got the correction for R2.",
      "",
      "I changed RetryNotice so the banner says the charge was not completed, and the detail tells the customer to update the card or try again. Nothing in the copy says the payment succeeded.",
      "",
      "I left the form-mount and notice-clear checks alone. Pushed c8e11aa for you to recheck. I did not mark any other requirement supported.",
    ].join("\n");
  }
  return [
    `Got the correction for ${requirementId}.`,
    "",
    "I have not pushed a revision. Point me at an approved spec version, or confirm I should restore the previous behavior.",
  ].join("\n");
}

export function correctionDraft(requirement: Requirement): string {
  const preserve = requirement.evidence.checks
    .filter((check) => check.result === "pass")
    .map((check) => `- ${check.name}`);
  const keep =
    preserve.length > 0
      ? preserve.join("\n")
      : "- Do not regress the form-mount or notice-clear checks.";
  return [
    `Correction for ${requirement.id} on ${TASK.codeRevision}`,
    "",
    requirement.title,
    "",
    `Spec ${TASK.specId} ${requirement.evidence.specVersion}:`,
    requirement.evidence.specText,
    "",
    requirement.classRationale,
    "",
    "Keep these checks passing:",
    keep,
    "",
    "Do not mark any other requirement supported.",
  ].join("\n");
}
