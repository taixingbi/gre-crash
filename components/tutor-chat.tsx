"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { askAiAction, askTutorAction } from "@/lib/actions";

type Turn = { role: "user" | "assistant"; content: string; href?: string };

const starters = [
  ["why_correct", "Why is the answer right?"],
  ["why_wrong", "Why is mine wrong?"],
  ["faster", "Faster method"],
  ["zh", "用中文解释"],
] as const;

export function TutorChat({
  questionId,
  selected,
  enabled,
}: {
  questionId: string;
  selected: string;
  enabled: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [width, setWidth] = useState(384);
  const [wide, setWide] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [turns, pending]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setWide(media.matches);
      const saved = Number(window.localStorage.getItem("gre-tutor-width"));
      if (saved >= 280 && saved <= 640) setWidth(saved);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  function resize(event: ReactPointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const move = (pointer: PointerEvent) => {
      setWidth(Math.min(640, Math.max(280, window.innerWidth - pointer.clientX)));
    };
    const stop = (pointer: PointerEvent) => {
      const next = Math.min(640, Math.max(280, window.innerWidth - pointer.clientX));
      setWidth(next);
      window.localStorage.setItem("gre-tutor-width", String(next));
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
  }

  async function pushAssistant(text: string, href?: string) {
    setTurns((current) => [...current, { role: "assistant", content: text, href }]);
  }

  async function ask(message: string, kind?: (typeof starters)[number][0]) {
    const text = message.trim();
    if (!text || pending) return;
    setError("");
    setDraft("");
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((current) => [...current, { role: "user", content: text }]);
    setPending(true);
    try {
      const response = kind
        ? await askAiAction({ questionId, kind, selected })
        : await askTutorAction({ questionId, selected, turns: history, message: text });
      if (response.error) {
        setError(response.error);
        return;
      }
      if (response.text) {
        const href = "href" in response && typeof response.href === "string" ? response.href : undefined;
        await pushAssistant(response.text, href);
      }
    } catch {
      setError("The tutor could not answer. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <aside
      className="relative flex h-[28rem] w-full flex-col border-t border-line bg-card lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:border-t-0 lg:border-l"
      style={wide ? { width } : undefined}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize tutor"
        onPointerDown={resize}
        className="absolute top-0 left-0 hidden h-full w-2 cursor-col-resize lg:block"
      />
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-serif text-xl">Tutor</h2>
        <p className="text-sm text-muted">Ask about this question.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {enabled ? (
          <div className="flex flex-wrap gap-2">
            {starters.map(([kind, label]) => (
              <button
                key={kind}
                type="button"
                disabled={pending}
                onClick={() => ask(label, kind)}
                className="rounded-md border border-line bg-paper px-3 py-1.5 text-left text-sm"
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-line bg-paper px-3 py-1.5 text-sm"
              onClick={async () => {
                setError("");
                setPending(true);
                const response = await askAiAction({ questionId, kind: "similar", selected });
                setPending(false);
                if (response.error) setError(response.error);
                if (response.text) {
                  setTurns((current) => [
                    ...current,
                    { role: "user", content: "Similar question" },
                    { role: "assistant", content: response.text || "", href: "href" in response && typeof response.href === "string" ? response.href : undefined },
                  ]);
                }
              }}
            >
              Similar question
            </button>
          </div>
        ) : (
          <p className="text-sm text-muted">The tutor unlocks with the 30-day pass.</p>
        )}
        {turns.map((turn, index) => (
          <div key={index} className={turn.role === "user" ? "ml-8 rounded-md bg-pine px-3 py-2 text-sm text-paper" : "mr-4 text-sm leading-6"}>
            <p className="whitespace-pre-wrap">{turn.content}</p>
            {turn.href ? (
              <Link href={turn.href} className="mt-2 inline-block font-semibold text-pine">
                Open the similar question
              </Link>
            ) : null}
          </div>
        ))}
        {pending ? <p className="text-sm text-muted">Thinking…</p> : null}
        {error ? <p className="text-sm text-clay">{error}</p> : null}
        <div ref={bottom} />
      </div>
      {enabled ? (
        <form
          className="flex gap-2 border-t border-line p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void ask(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a follow-up"
            className="min-w-0 flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm"
          />
          <button type="submit" disabled={pending || draft.trim().length === 0} className="rounded-md bg-pine px-3 py-2 text-sm font-semibold text-paper disabled:opacity-50">
            Send
          </button>
        </form>
      ) : null}
    </aside>
  );
}
