"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { WritingTutor } from "@/components/writing-tutor";
import { essayPhrases } from "@/lib/essay-phrases";
import { essayWords } from "@/lib/essay-words";
import { deleteEssayAction, saveEssayAction, scoreEssayAction, updateEssayAction, type ActionState } from "@/lib/actions";
import type { EssayRubric, WritingSubmission } from "@/lib/types";

const initial: ActionState = {};
const boxes = ["My position", "Reason 1", "Example 1", "Reason 2", "Counterargument", "Response"];

function wordCount(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function rubricText(rubric: EssayRubric) {
  return `Thesis: ${rubric.thesis}\nOrganization: ${rubric.organization}\nEvidence: ${rubric.evidence}\nCounterargument: ${rubric.counterargument}\n\n${rubric.advice}`;
}

export function WritingDesk({
  day,
  planDate,
  theme,
  prompt,
  task,
  template,
  canGrade,
  essays,
}: {
  day: number;
  planDate: string;
  theme: string;
  prompt: string;
  task: string;
  template: string;
  canGrade: boolean;
  essays: WritingSubmission[];
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="flex flex-col gap-4 p-4 lg:h-screen lg:flex-row lg:items-stretch lg:p-6">
      <WritingPanel day={day} planDate={planDate} theme={theme} prompt={prompt} task={task} template={template} canGrade={canGrade} essays={essays} onDraftChange={setDraft} />
      <WritingTutor prompt={prompt} task={task} draft={draft} enabled={canGrade} />
    </div>
  );
}

function WritingPanel({
  day,
  planDate,
  theme,
  prompt,
  task,
  template,
  canGrade,
  essays,
  onDraftChange,
}: {
  day: number;
  planDate: string;
  theme: string;
  prompt: string;
  task: string;
  template: string;
  canGrade: boolean;
  essays: WritingSubmission[];
  onDraftChange: (draft: string) => void;
}) {
  const storageKey = `gre-essay-draft:${planDate}`;
  const [scoreState, scoreAction, scorePending] = useActionState(scoreEssayAction, initial);
  const [saveState, saveAction, savePending] = useActionState(saveEssayAction, initial);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [essay, setEssay] = useState("");
  const [rubric, setRubric] = useState<EssayRubric | undefined>();
  const [scoredText, setScoredText] = useState("");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const essayRef = useRef(essay);
  essayRef.current = essay;

  function publish(nextNotes: Record<string, string>, nextEssay: string) {
    const plan = boxes
      .map((label) => (nextNotes[label]?.trim() ? `${label}: ${nextNotes[label].trim()}` : ""))
      .filter(Boolean)
      .join("\n");
    onDraftChange([plan, nextEssay.trim()].filter(Boolean).join("\n\n"));
  }

  useEffect(() => {
    let nextEssay = "";
    let nextNotes: Record<string, string> = {};
    let nextRubric: EssayRubric | undefined;
    try {
      const raw = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(`gre-essay-draft:${day}`);
      if (raw) {
        const saved = JSON.parse(raw) as { essay?: string; notes?: Record<string, string>; rubric?: EssayRubric };
        nextEssay = typeof saved.essay === "string" ? saved.essay : "";
        nextNotes = saved.notes && typeof saved.notes === "object" ? saved.notes : {};
        nextRubric = saved.rubric;
      }
    } catch {
      // A damaged draft should not block a new essay.
    }
    if (!nextEssay.trim()) {
      const prior = essays.find((item) => item.day === day);
      if (prior) {
        nextEssay = prior.essay;
        nextRubric = prior.rubric;
      }
    }
    setEssay(nextEssay);
    setNotes(nextNotes);
    setRubric(nextRubric);
    setScoredText(nextRubric ? nextEssay.trim() : "");
    publish(nextNotes, nextEssay);
    setHydratedKey(storageKey);
    // Restore this day's draft when the day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ essay, notes, rubric }));
  }, [hydratedKey, storageKey, essay, notes, rubric]);

  useEffect(() => {
    if (!scoreState.rubric) return;
    setRubric(scoreState.rubric);
    setScoredText(essayRef.current.trim());
  }, [scoreState.rubric]);

  function writeEssay(next: string) {
    setEssay(next);
    if (next.trim() !== scoredText) setRubric(undefined);
    publish(notes, next);
  }

  return (
    <section id="writing" className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-line bg-white p-5 shadow-sm lg:h-full">
      <p className="text-sm text-muted">Writing · Day {day}</p>
      <h2 className="font-serif text-2xl">{theme}</h2>
      <p className="leading-7">{prompt}</p>
      <p className="text-sm text-muted">{task}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {boxes.map((label) => (
          <label key={label} className="text-sm">
            {label}
            <input
              value={notes[label] ?? ""}
              onChange={(event) => {
                const next = { ...notes, [label]: event.target.value };
                setNotes(next);
                publish(next, essay);
              }}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2"
            />
          </label>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Four-paragraph template</summary>
        <div className="mt-3 max-h-72 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-6 text-muted">{template}</pre>
        </div>
      </details>
      <details open>
        <summary className="cursor-pointer text-sm font-semibold">Useful phrases</summary>
        <div className="mt-3 max-h-80 space-y-4 overflow-y-auto pr-1">
          {essayPhrases(day).map((group) => (
            <section key={group.title}>
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <div className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <div key={item.phrase} className="rounded-md bg-paper px-3 py-2 text-sm leading-6">
                    <p className="font-medium">{item.phrase}</p>
                    <p className="text-muted">{item.meaning}</p>
                    <p>{item.example}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
      <details open>
        <summary className="cursor-pointer text-sm font-semibold">Common words</summary>
        <p className="mt-3 text-sm leading-6 text-muted">Simple, reliable words for GRE and TOEFL essays. They vary your vocabulary without awkward phrasing.</p>
        <div className="mt-3 max-h-80 space-y-4 overflow-y-auto pr-1">
          {essayWords(day).map((group) => (
            <section key={group.title}>
              <h3 className="text-sm font-semibold">{group.title}</h3>
              <div className="mt-2 space-y-2">
                {group.items.map((item) => (
                  <div key={item.word} className="rounded-md bg-paper px-3 py-2 text-sm leading-6">
                    <p className="font-medium">{item.word}</p>
                    <p className="text-muted">{item.meaning} · instead of {item.replacement}</p>
                    <p>{item.example}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
      <form action={saveAction} className="space-y-3">
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="prompt" value={prompt} />
        <input type="hidden" name="rubric" value={rubric ? JSON.stringify(rubric) : ""} />
        <textarea
          name="essay"
          rows={12}
          value={essay}
          onChange={(event) => writeEssay(event.target.value)}
          placeholder="Write the essay here. Aim for 25 minutes."
          className="w-full rounded-md border border-line bg-paper px-3 py-2 leading-6"
        />
        <p className="text-right text-sm text-muted">{wordCount(essay)} words</p>
        {scoreState.error ? <p className="text-sm text-clay">{scoreState.error}</p> : null}
        {saveState.error ? <p className="text-sm text-clay">{saveState.error}</p> : null}
        {rubric ? <p className="whitespace-pre-wrap text-sm leading-6">{rubricText(rubric)}</p> : null}
        {saveState.message ? <p className="text-sm text-muted">{saveState.message}</p> : null}
        <div className="flex gap-2">
          {canGrade ? (
            <button type="submit" formAction={scoreAction} disabled={scorePending || savePending || wordCount(essay) === 0} className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper disabled:opacity-40">
              {scorePending ? "Scoring…" : "Score"}
            </button>
          ) : (
            <p className="text-sm text-muted">Essay scoring is on the 90-day pass.</p>
          )}
          <button type="submit" disabled={savePending || scorePending || wordCount(essay) === 0} className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40">
            {savePending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      {essays.some((item) => item.day === day) ? (
        <div className="border-t border-line pt-4">
          <SavedEssays essays={essays.filter((item) => item.day === day)} canGrade={canGrade} />
        </div>
      ) : null}
    </section>
  );
}

export function SavedEssays({ essays, canGrade = false }: { essays: WritingSubmission[]; canGrade?: boolean }) {
  if (!essays.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Saved essays</h3>
      {essays.map((essay) => (
        <EssayRow key={essay.id} essay={essay} canGrade={canGrade} />
      ))}
    </div>
  );
}

function EssayRow({ essay, canGrade }: { essay: WritingSubmission; canGrade: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(essay.essay);
  const [state, action, pending] = useActionState(updateEssayAction, initial);
  const [scoreState, scoreAction, scorePending] = useActionState(scoreEssayAction, initial);
  useEffect(() => {
    if (state.message) setEditing(false);
  }, [state.message]);
  const shown = scoreState.rubric ?? essay.rubric;
  return (
    <details className="rounded-md border border-line bg-paper px-3 py-2">
      <summary className="cursor-pointer text-sm">
        <span className="font-semibold">Day {essay.day}</span>
        <span className="text-muted"> · {formatWhen(essay.createdAt)} · {wordCount(essay.essay)} words</span>
        <span className="mt-1 block text-muted">
          {shown
            ? `Thesis ${shown.thesis} · Organization ${shown.organization} · Evidence ${shown.evidence} · Counterargument ${shown.counterargument}`
            : "Not scored"}
        </span>
      </summary>
      {editing ? (
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={essay.id} />
          <textarea
            name="essay"
            value={draft}
            rows={8}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full rounded-md border border-line bg-card px-3 py-2 text-sm leading-6"
          />
          <p className="text-right text-sm text-muted">{wordCount(draft)} words</p>
          {state.error ? <p className="text-sm text-clay">{state.error}</p> : null}
          {scoreState.error ? <p className="text-sm text-clay">{scoreState.error}</p> : null}
          <div className="flex gap-2">
            {canGrade ? (
              <button type="submit" formAction={scoreAction} disabled={scorePending || pending || wordCount(draft) === 0} className="rounded-md bg-pine px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-40">
                {scorePending ? "Scoring…" : "Score"}
              </button>
            ) : null}
            <button type="submit" disabled={pending || scorePending || wordCount(draft) === 0} className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold disabled:opacity-40">
              {pending ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-line px-3 py-1.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{essay.essay}</p>
          {shown?.advice ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted">{shown.advice}</p> : null}
          {scoreState.error ? <p className="mt-3 text-sm text-clay">{scoreState.error}</p> : null}
          <div className="mt-3 flex gap-2">
            {canGrade ? <ScoreButton action={scoreAction} pending={scorePending} id={essay.id} essay={essay.essay} /> : null}
            <button
              type="button"
              onClick={() => {
                setDraft(essay.essay);
                setEditing(true);
              }}
              className="rounded-md border border-line px-3 py-1.5 text-sm"
            >
              Edit
            </button>
            <form action={deleteEssayAction}>
              <input type="hidden" name="id" value={essay.id} />
              <button
                type="submit"
                className="rounded-md border border-line px-3 py-1.5 text-sm text-clay"
                onClick={(event) => {
                  if (!window.confirm("Delete this essay?")) event.preventDefault();
                }}
              >
                Delete
              </button>
            </form>
          </div>
        </>
      )}
    </details>
  );
}

function ScoreButton({
  action,
  pending,
  id,
  essay,
}: {
  action: (payload: FormData) => void;
  pending: boolean;
  id: string;
  essay: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="essay" value={essay} />
      <button type="submit" disabled={pending || wordCount(essay) === 0} className="rounded-md bg-pine px-3 py-1.5 text-sm font-semibold text-paper disabled:opacity-40">
        {pending ? "Scoring…" : "Score"}
      </button>
    </form>
  );
}

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
