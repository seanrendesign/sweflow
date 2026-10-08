import type { AgentMessage, ConceptNote, FileDoc, ReviewItem } from "@/lib/types";

export const TASK = {
  title: "Checkout retry copy",
  repo: "northwind-checkout",
  branch: "agent/checkout-retry-copy",
  agent: "Harbor",
  askedAt: "Oct 4, 8:55 AM",
  finishedAt: "Oct 4, 9:40 AM",
  baseRevision: "a4c91e2",
  specId: "checkout-retry",
  specFile: "spec/checkout-retry.md",
  ask: "Can you make the retry banner after a declined card friendlier, and let people try again?",
  finished: [
    "Rewrote the retry banner so it sounds friendlier.",
    "Added useRetryPolicy, which decides per decline code whether the customer gets a retry.",
    "Left the card form alone. It already stays mounted after a decline.",
    "Ran retry-copy.test.ts: 2 pass, 1 fails on the new wording, 2 are not written yet.",
  ],
  unsure: [
    "I let suspected_fraud declines retry, based on an Oct 2 chat. Spec 3.2 says they are terminal.",
    "I did not check how the banner is announced to screen readers or where focus goes.",
  ],
} as const;

export const SPEC = {
  current: "3.2",
  proposed: "3.3",
  R1: "After a declined payment, the customer can correct the card without a full page reload. Field values the customer already entered remain.",
  R2: "The notice states that the charge was not completed and names the next action: update the card or try again. It must not say the payment succeeded.",
  R3: "Offer retry only for issuer soft declines (insufficient_funds, card_velocity). Hard declines (suspected_fraud, stolen_card) show a terminal error and no retry.",
  R3proposed:
    "Offer retry for issuer soft declines (insufficient_funds, card_velocity) and for suspected_fraud holds. stolen_card shows a terminal error and no retry.",
  R4: "When the notice appears, assistive tech announces it immediately, then focus moves to the first invalid field.",
  R5: "After the next attempt succeeds, remove the retry notice. Do not leave a failure banner on the confirmation step.",
};

const specLine = (id: keyof typeof SPEC) => ({
  source: `${TASK.specId} ${SPEC.current} · ${id}`,
  text: SPEC[id],
});

export const items: ReviewItem[] = [
  {
    id: "R1",
    pile: "confirm",
    kind: "confirm",
    title: "Keep the card form editable after a decline",
    category: `Spec line · ${TASK.specId} ${SPEC.current}`,
    whyHere:
      "Harbor did not touch this path, and the mount test passes on a4c91e2. The evidence matches the spec line.",
    closesWith: "Confirm it. That records R1 only, on this revision.",
    file: "checkout/CheckoutForm.tsx",
    changed:
      "Nothing on a4c91e2. onSubmit keeps the declined charge in state and does not call router.refresh(), so the form stays mounted.",
    check: {
      name: "form stays mounted after a soft decline",
      result: "pass",
      detail: "After insufficient_funds on visa ••4242, the card number and expiry are still in the fields. Pay stays enabled.",
    },
    written: specLine("R1"),
    related: {
      id: "R5",
      note: "R1 is what happens right after the decline: the form stays and keeps what the customer typed. R5 is what happens after the next attempt succeeds: the notice goes away.",
    },
  },
  {
    id: "R5",
    pile: "confirm",
    kind: "confirm",
    title: "Clear the notice after a successful retry",
    category: `Spec line · ${TASK.specId} ${SPEC.current}`,
    whyHere:
      "A succeeded charge clears the retry state before going to confirmation, and the clear test passes on a4c91e2.",
    closesWith: "Confirm it. That records R5 only, on this revision.",
    file: "checkout/CheckoutForm.tsx",
    changed:
      'Nothing on a4c91e2. When charge.status is succeeded, onSubmit calls setRetry(null), then router.push("/confirmation").',
    check: {
      name: "notice clears after the next charge succeeds",
      result: "pass",
      detail: "The second attempt on the same form lands on confirmation with no retry banner.",
    },
    written: specLine("R5"),
    related: {
      id: "R1",
      note: "R5 is what happens after the next attempt succeeds: the notice goes away. R1 is what happens right after the decline: the form stays editable.",
    },
  },
  {
    id: "R2",
    pile: "judgment",
    kind: "correct",
    title: "Retry notice must not claim the payment succeeded",
    category: "Spec line the evidence contradicts",
    whyHere:
      "Harbor's friendlier copy says the payment succeeded while the charge is still declined. Spec 3.2 forbids that, and the copy test fails.",
    closesWith: "Send Harbor a correction, then recheck its fix with one focused check.",
    file: "checkout/RetryNotice.tsx",
    changed: 'The banner title is now "Payment successful — we\'ll retry shortly". Harbor called it friendlier.',
    check: {
      name: "retry notice does not claim the payment succeeded",
      result: "fail",
      detail: 'Banner text matched /successful/. Received "Payment successful — we\'ll retry shortly".',
    },
    written: specLine("R2"),
    correct: {
      expected: "The banner says the charge was not completed and names the next action.",
      actual: "“Payment successful — we'll retry shortly” while nothing was captured.",
      correctionDraft: [
        "The retry banner on a4c91e2 says the payment succeeded. Nothing was captured.",
        "Spec checkout-retry 3.2: the notice says the charge was not completed and names the next action: update the card or try again.",
        "",
        "Friendly is fine, but it cannot claim success.",
        "Keep the form-mount and notice-clear checks passing. Do not change anything else.",
      ].join("\n"),
      revision: "c8e11aa",
      revisionSummary: 'Banner is "Charge not completed". Detail: "Update the card or try again. Nothing was captured."',
      agentReply: [
        "Got the correction for R2.",
        "",
        "I changed RetryNotice so the banner says the charge was not completed, and the detail tells the customer to update the card or try again. Nothing in the copy says the payment succeeded.",
        "",
        "I left the form-mount and notice-clear checks alone. Pushed c8e11aa for you to recheck.",
      ].join("\n"),
      focusedCheck: {
        name: "retry notice does not claim the payment succeeded",
        output: [
          '$ pnpm test checkout/retry-copy.test.ts -t "does not claim"',
          "",
          " ✓ retry notice does not claim the payment succeeded            8ms",
          '   Banner: "Charge not completed"',
          '   Detail: "Update the card or try again. Nothing was captured."',
          "",
          " revision c8e11aa · spec checkout-retry 3.2",
          " Focused check passed. Only R2 was rechecked.",
        ].join("\n"),
      },
      fixedBehavior: "“Charge not completed. Update the card or try again.” No success claim.",
    },
  },
  {
    id: "R3",
    pile: "judgment",
    kind: "product",
    title: "Offer retry only for soft declines",
    category: "Behavior change the spec does not allow",
    whyHere:
      "Harbor made a product choice on its own: suspected_fraud declines now get a retry. Spec 3.2 says hard declines are terminal. The code comment points at an Oct 2 chat, which is not an approval.",
    closesWith:
      "Accept Harbor's behavior and the spec moves to 3.3, or keep the old behavior and Harbor restores the terminal error. Either way your decision is recorded.",
    file: "checkout/useRetryPolicy.ts",
    changed: 'retryDecision() returns "retry" for suspected_fraud. stolen_card is still terminal.',
    check: {
      name: "suspected_fraud stays terminal",
      result: "missing",
      detail: "No test covers suspected_fraud or stolen_card.",
    },
    product: {
      example: "Example: the issuer returns suspected_fraud on visa ••4242.",
      before: {
        label: `Spec ${TASK.specId} ${SPEC.current} · before Harbor's change`,
        behavior:
          "The customer sees the terminal error, “This card can't be used. Try a different card.” There is no retry button.",
        spec: SPEC.R3,
      },
      after: {
        label: `Spec ${TASK.specId} ${SPEC.proposed} · Harbor's behavior`,
        behavior:
          "The customer sees the retry notice and can try the same card again. stolen_card still shows the terminal error.",
        spec: SPEC.R3proposed,
      },
      testNote:
        "No test covers this, and a test could not approve it anyway. Whether fraud holds can retry is a product call.",
      rejectCorrection: [
        "Restore the terminal error for suspected_fraud.",
        "Spec checkout-retry 3.2 keeps hard declines terminal. The Oct 2 chat is not an approval.",
        "Remove the suspected_fraud branch from retryDecision() and add a test that it stays terminal.",
      ].join("\n"),
      revision: "f2d9b47",
      agentReply: [
        "Restored. retryDecision() no longer special-cases suspected_fraud, so it is terminal again.",
        "",
        "I added a test: suspected_fraud stays terminal. Pushed f2d9b47. Nothing else changed.",
      ].join("\n"),
    },
  },
  {
    id: "R4",
    pile: "judgment",
    kind: "evidence",
    title: "Announce the notice and move focus",
    category: "Accessibility behavior with no evidence",
    whyHere:
      'The banner uses aria-live="polite" and never moves focus. No screen-reader trace and no focus test exist on a4c91e2. Harbor said it did not check. There is not enough evidence to judge.',
    closesWith:
      "Ask Harbor how the rest of the codebase does this. If it is a question about how checkout should behave, you can ask a person. Or keep it open on purpose.",
    file: "checkout/RetryNotice.tsx",
    changed: 'Nothing. The banner is role="status" with aria-live="polite". There is no focus() call.',
    check: {
      name: "notice is announced and focus moves to the first invalid field",
      result: "missing",
      detail: "The test file does not mention announcement or focus.",
    },
    written: specLine("R4"),
    evidence: {
      codeQuestion: "How do other notices in this codebase announce themselves and move focus?",
      runningLabel: "Harbor is reading how other checkout notices announce and move focus…",
      research: {
        reply: [
          "Research pass on notices. I changed nothing.",
          "",
          '1. Address form errors (checkout/address/ErrorSummary.tsx) use role="alert" and call focusFirstInvalid() from checkout/a11y.ts. That is the pattern spec 3.2 describes.',
          '2. The promo code toast uses aria-live="polite" with no focus move. It is not an error, so polite fits there.',
          "3. RetryNotice copies the toast pattern, not the error pattern. That is likely why R4 is unmet.",
          "",
          "I can switch RetryNotice to the ErrorSummary pattern, but only a screen-reader trace shows what customers actually hear.",
        ].join("\n"),
        toast: "Harbor's research is back. Checkout already has an error pattern RetryNotice does not use.",
        summary: "Checkout already has an error pattern. RetryNotice does not use it.",
        findings: [
          {
            where: "Address form errors",
            file: "checkout/address/ErrorSummary.tsx",
            note: 'role="alert" plus focusFirstInvalid(). This is what spec 3.2 asks for.',
            concern: true,
          },
          {
            where: "Promo code toast",
            note: 'aria-live="polite", no focus move. Fine for a non-error.',
            concern: false,
          },
          {
            where: "RetryNotice",
            note: "Copies the toast pattern, not the error pattern. Likely why R4 is unmet.",
            concern: true,
          },
        ],
      },
      personQuestionBefore:
        "Does the retry notice get announced right away, and does focus land on the first invalid field?",
      personQuestionAfter:
        'If RetryNotice uses role="alert" and focusFirstInvalid() like the address errors, is that the behavior you want? Can you capture a screen-reader trace?',
      suggestedWho: ["Sam Okonkwo · QA"],
      evidenceNeeded:
        "A screen-reader trace or a test that asserts an immediate announcement and a focus move to the first invalid field.",
    },
  },
];

export const itemMap = Object.fromEntries(items.map((item) => [item.id, item])) as Record<
  string,
  ReviewItem
>;

export const conceptNotes: ConceptNote[] = [
  {
    id: "note-policy",
    kind: "New concept",
    title: "useRetryPolicy",
    body: "A new hook decides, per decline code, whether the customer gets a retry or a terminal error. Before, every decline showed the same banner.",
    file: "checkout/useRetryPolicy.ts",
  },
  {
    id: "note-decline",
    kind: "New classification",
    title: "Soft vs hard declines",
    body: "Decline codes are now split in two. Soft: insufficient_funds, card_velocity. Hard: suspected_fraud, stolen_card. The codebase had no such split before.",
    file: "checkout/useRetryPolicy.ts",
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

const noticeHead = [
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
];

const noticeTail = [
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
];

const policyHead = [
  line("add", 'const SOFT_DECLINES = new Set(["insufficient_funds", "card_velocity"]);', 1, ["note-decline"]),
  line("add", 'const HARD_DECLINES = new Set(["suspected_fraud", "stolen_card"]);', 2, ["note-decline"]),
  line("add", "", 3),
  line("add", 'export function retryDecision(code: string): "retry" | "terminal" {', 4, ["note-policy"]),
];

const fraudBranch = [
  '  if (code === "suspected_fraud") {',
  "    // Oct 2 chat: product asked to retry fraud holds — not in spec 3.2",
  '    return "retry";',
  "  }",
];

const policyTail = (start: number) => [
  line("add", '  if (SOFT_DECLINES.has(code)) return "retry";', start, ["note-decline"]),
  line("add", '  if (HARD_DECLINES.has(code)) return "terminal";', start + 1, ["note-decline", "R3"]),
  line("add", '  return "terminal";', start + 2),
  line("add", "}", start + 3),
  line("add", "", start + 4),
  line("add", "export function useRetryPolicy(charge: Charge | null) {", start + 5, ["note-policy"]),
  line("add", "  return charge ? retryDecision(charge.declineCode) : null;", start + 6, ["note-policy"]),
  line("add", "}", start + 7),
];

export const files: FileDoc[] = [
  {
    path: "checkout/RetryNotice.tsx",
    language: "TypeScript JSX",
    kind: "diff",
    status: "modified",
    lines: [
      line("hunk", "@@ a4c91e2 checkout/RetryNotice.tsx @@"),
      ...noticeHead,
      line("del", '  const title = "Payment failed";'),
      line("del", '  const detail = "Update the card or try again. Nothing was captured.";'),
      line("add", '  const title = "Payment successful — we\'ll retry shortly";', 11, ["R2"]),
      line("add", '  const detail = "Your card was saved for the next attempt.";', 12, ["R2"]),
      ...noticeTail,
    ],
    variant: {
      revision: "c8e11aa",
      lines: [
        line("hunk", "@@ c8e11aa checkout/RetryNotice.tsx (your correction) @@"),
        ...noticeHead,
        line("del", '  const title = "Payment successful — we\'ll retry shortly";'),
        line("del", '  const detail = "Your card was saved for the next attempt.";'),
        line("add", '  const title = "Charge not completed";', 11, ["R2"]),
        line("add", '  const detail = "Update the card or try again. Nothing was captured.";', 12, ["R2"]),
        ...noticeTail,
      ],
    },
  },
  {
    path: "checkout/useRetryPolicy.ts",
    language: "TypeScript",
    kind: "diff",
    status: "added",
    lines: [
      line("hunk", "@@ a4c91e2 checkout/useRetryPolicy.ts (new file) @@"),
      ...policyHead,
      ...fraudBranch.map((text, index) => line("add", text, 5 + index, ["R3"])),
      ...policyTail(9),
    ],
    variant: {
      revision: "f2d9b47",
      lines: [
        line("hunk", "@@ f2d9b47 checkout/useRetryPolicy.ts (your decision: fraud holds stay terminal) @@"),
        ...policyHead,
        ...fraudBranch.map((text) => line("del", text, undefined, ["R3"])),
        ...policyTail(5),
      ],
    },
  },
  {
    path: "checkout/CheckoutForm.tsx",
    language: "TypeScript JSX",
    kind: "diff",
    status: "unchanged",
    lines: [
      line("hunk", "@@ unchanged on a4c91e2 · checkout/CheckoutForm.tsx @@"),
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
    status: "unchanged",
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
      line("ctx", '  const banner = form.getByRole("status");', 21),
      line("ctx", "  expect(banner).not.toHaveTextContent(/successful/i);", 22),
      line("ctx", "  expect(banner).toHaveTextContent(/try again/i);", 23),
      line("ctx", "});", 24),
    ],
  },
  {
    path: "checkout/address/ErrorSummary.tsx",
    language: "TypeScript JSX",
    kind: "diff",
    status: "unchanged",
    revealedBy: "R4",
    lines: [
      line("hunk", "@@ not changed · found by Harbor's research pass @@"),
      line("ctx", 'import { useEffect } from "react";', 1),
      line("ctx", 'import { focusFirstInvalid } from "../a11y";', 2, ["R4"]),
      line("ctx", "", 3),
      line("ctx", "export function ErrorSummary({ errors }: Props) {", 4),
      line("ctx", "  useEffect(() => {", 5),
      line("ctx", "    if (errors.length) focusFirstInvalid();", 6, ["R4"]),
      line("ctx", "  }, [errors]);", 7),
      line("ctx", "", 8),
      line("ctx", "  if (!errors.length) return null;", 9),
      line("ctx", "  return (", 10),
      line("ctx", '    <div role="alert" className="error-summary">', 11, ["R4"]),
      line("ctx", "      <h2>Check these fields</h2>", 12),
      line("ctx", "      <ul>{errors.map((e) => <li key={e.field}>{e.message}</li>)}</ul>", 13),
      line("ctx", "    </div>", 14),
      line("ctx", "  );", 15),
      line("ctx", "}", 16),
    ],
  },
  {
    path: "spec/checkout-retry.md",
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
    id: "you-ask",
    role: "you",
    at: "8:55 AM",
    text: TASK.ask,
  },
  {
    id: "harbor-done",
    role: "agent",
    at: "9:40 AM",
    text: [
      "Done on agent/checkout-retry-copy at a4c91e2.",
      "",
      "I rewrote the retry banner to sound friendlier and added useRetryPolicy, which decides per decline code whether to offer a retry. The card form already stayed mounted after a decline, so I left it alone.",
      "",
      "The copy test fails on the new wording; I think the test is out of date. Two things I'm unsure about: I let suspected_fraud retry because of an Oct 2 chat, and I didn't check screen-reader announcement or focus.",
    ].join("\n"),
  },
];
