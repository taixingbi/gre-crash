"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { askAiAction, askTutorAction } from "@/lib/actions";

type Turn = { role: "user" | "assistant"; content: string; href?: string };

function speak(word: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  window.speechSynthesis.speak(utterance);
}

function TutorText({ content }: { content: string }) {
  const parts = content.split(/\[\[(.+?)\]\]/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="inline-flex items-center gap-1 font-semibold">
            {part}
            <button type="button" aria-label={`Pronounce ${part}`} onClick={() => speak(part)} className="text-muted hover:text-ink">
              <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
                <path d="M2 6.5h2.2L8 3.2v9.6L4.2 9.5H2v-3z" fill="currentColor" />
                <path d="M10 6.2a2.8 2.8 0 0 1 0 3.6M11.6 4.6a5 5 0 0 1 0 6.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </p>
  );
}

const quantStarters = [
  ["why_correct", "Why is the answer right?"],
  ["why_wrong", "Why is mine wrong?"],
  ["faster", "Faster method"],
  ["zh", "用中文解释"],
] as const;

const verbalStarters = [
  ["translate", "翻译"],
  ["choices", "What the choices mean"],
  ["logic", "Logic clue"],
  ["why_fit", "Why this answer"],
  ["eliminate", "Rule out the others"],
] as const;

type PromptKind = (typeof quantStarters)[number][0] | (typeof verbalStarters)[number][0];

export function TutorChat({
  questionId,
  section,
  selected,
  enabled,
}: {
  questionId: string;
  section: "quant" | "verbal";
  selected: string;
  enabled: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [width, setWidth] = useState<number | null>(null);
  const [wide, setWide] = useState(false);
  const [open, setOpen] = useState(true);
  const bottom = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  function widthLimit() {
    return window.innerWidth * 0.5;
  }

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [turns, pending]);

  useEffect(() => {
    const box = field.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setWide(media.matches);
      const saved = Number(window.localStorage.getItem("gre-tutor-width"));
      const limit = window.innerWidth * 0.5;
      if (saved >= 280 && saved <= limit) setWidth(saved);
      setOpen(window.localStorage.getItem("gre-tutor-open") !== "closed");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  function setTutorOpen(next: boolean) {
    setOpen(next);
    window.localStorage.setItem("gre-tutor-open", next ? "open" : "closed");
  }

  function resize(event: ReactPointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    const right = panel.current?.getBoundingClientRect().right ?? window.innerWidth;
    handle.setPointerCapture(event.pointerId);
    const nextWidth = (clientX: number) => Math.min(widthLimit(), Math.max(280, right - clientX));
    const move = (pointer: PointerEvent) => setWidth(nextWidth(pointer.clientX));
    const stop = (pointer: PointerEvent) => {
      const next = nextWidth(pointer.clientX);
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

  const starters = section === "verbal" ? verbalStarters : quantStarters;

  async function ask(message: string, kind?: PromptKind) {
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
      setError("AI Tutor could not answer. Try again.");
    } finally {
      setPending(false);
    }
  }

  const prompts = (
    <div className="flex flex-wrap gap-2">
      {starters.map(([kind, label]) => (
        <button
          key={kind}
          type="button"
          disabled={pending}
          onClick={() => ask(label, kind)}
          className="rounded-full border border-violet/30 bg-[#f3f1ff] px-3 py-1.5 text-left text-sm text-ink"
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        disabled={pending}
        className="rounded-full border border-violet/30 bg-[#f3f1ff] px-3 py-1.5 text-sm"
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
  );

  return (
    <>
      {open ? null : (
        <button
          type="button"
          onClick={() => setTutorOpen(true)}
          className="sticky top-4 hidden shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-sm font-semibold lg:inline-flex"
        >
          <span className="text-violet">AI</span> Tutor
        </button>
      )}
      <aside
        ref={panel}
        className={`${open ? "flex" : "flex lg:hidden"} relative w-full flex-col rounded-3xl border border-line bg-white shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:w-[30vw] lg:max-w-[50vw] lg:shrink-0`}
        style={wide && open && width ? { width } : undefined}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI Tutor"
          onPointerDown={resize}
          className="absolute top-0 left-0 hidden h-full w-2 cursor-col-resize lg:block"
        />
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold"><span className="text-violet">AI</span> Tutor</h2>
          <button type="button" onClick={() => setTutorOpen(false)} className="hidden text-xs font-semibold tracking-[0.14em] text-muted uppercase hover:text-ink lg:inline">
            Hide
          </button>
        </div>
        {enabled ? (
          <div className="border-b border-line px-4 py-3">
            {turns.length === 0 ? <p className="mb-3 text-sm font-medium">Ask about this question.</p> : null}
            {prompts}
          </div>
        ) : null}
        <div className="max-h-[28rem] overflow-y-auto px-4 py-4">
          {enabled ? null : <p className="text-sm text-muted">AI Tutor unlocks with the 30-day pass.</p>}
          {turns.length > 0 || pending || error ? (
            <div className="space-y-4">
              {turns.map((turn, index) =>
                turn.role === "user" ? (
                  <div key={index} className="flex justify-end">
                    <p className="max-w-[85%] rounded-3xl bg-[#eceae4] px-4 py-2.5 text-sm leading-6 whitespace-pre-wrap">{turn.content}</p>
                  </div>
                ) : (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">T</span>
                    <div className="min-w-0 text-sm leading-6">
                      <TutorText content={turn.content} />
                      {turn.href ? (
                        <Link href={turn.href} className="mt-2 inline-block font-semibold text-pine">
                          Open the similar question
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ),
              )}
              {pending ? (
                <div className="flex items-center gap-3 text-sm text-muted">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">T</span>
                  Thinking…
                </div>
              ) : null}
              {error ? <p className="text-sm text-clay">{error}</p> : null}
              <div ref={bottom} />
            </div>
          ) : null}
        </div>
        {enabled ? (
          <form
            className="p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <div className="flex items-end gap-2 rounded-3xl border border-violet/40 bg-paper px-3 py-2">
              <textarea
                ref={field}
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Ask anything"
                className="max-h-40 min-h-8 min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm leading-6 outline-none"
              />
              <button
                type="submit"
                disabled={pending || draft.trim().length === 0}
                aria-label="Send"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-30"
              >
                ↑
              </button>
            </div>
          </form>
        ) : null}
      </aside>
    </>
  );
}
