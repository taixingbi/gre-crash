"use client";

import { useActionState, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { WritingTutor } from "@/components/writing-tutor";
import { essayPhrases } from "@/lib/essay-phrases";
import { essayTemplateExample, templateFrames } from "@/lib/essay-template";
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

type Draft = {
  essay: string;
  notes: Record<string, string>;
  rubric?: EssayRubric;
};

function draftFromEssays(day: number, essays: WritingSubmission[]): Draft {
  const prior = essays.find((item) => item.day === day);
  return prior ? { essay: prior.essay, notes: {}, rubric: prior.rubric } : { essay: "", notes: {} };
}

function draftFromStorage(storageKey: string, day: number, essays: WritingSubmission[]): Draft {
  try {
    const raw = window.localStorage.getItem(storageKey) ?? window.localStorage.getItem(`gre-essay-draft:${day}`);
    if (raw) {
      const saved = JSON.parse(raw) as { essay?: string; notes?: Record<string, string>; rubric?: EssayRubric };
      const essay = typeof saved.essay === "string" ? saved.essay : "";
      const notes = saved.notes && typeof saved.notes === "object" ? saved.notes : {};
      if (essay.trim() || Object.values(notes).some((value) => value?.trim())) {
        return { essay, notes, rubric: saved.rubric };
      }
    }
  } catch {
    // A damaged draft should not block a new essay.
  }
  return draftFromEssays(day, essays);
}

function subscribeMounted() {
  return () => {};
}

function composeDraft(notes: Record<string, string>, essay: string) {
  const plan = boxes
    .map((label) => (notes[label]?.trim() ? `${label}: ${notes[label].trim()}` : ""))
    .filter(Boolean)
    .join("\n");
  return [plan, essay.trim()].filter(Boolean).join("\n\n");
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
  const mounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const loaded = useMemo(
    () => (mounted ? draftFromStorage(storageKey, day, essays) : draftFromEssays(day, essays)),
    [mounted, storageKey, day, essays],
  );
  const [notes, setNotes] = useState<Record<string, string> | null>(null);
  const [essay, setEssay] = useState<string | null>(null);
  const [rubric, setRubric] = useState<EssayRubric | undefined | null>(null);
  const [scoredText, setScoredText] = useState<string | null>(null);
  const [scoreState, scoreAction, scorePending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await scoreEssayAction(prev, formData);
    if (result.rubric) {
      setRubric(result.rubric);
      setScoredText(String(formData.get("essay") ?? "").trim());
    }
    return result;
  }, initial);
  const [saveState, saveAction, savePending] = useActionState(saveEssayAction, initial);
  const notesValue = notes ?? loaded.notes;
  const essayValue = essay ?? loaded.essay;
  const activeRubric = rubric === null ? loaded.rubric : rubric;
  const rubricFor = scoredText ?? (loaded.rubric ? loaded.essay.trim() : "");
  const displayRubric = activeRubric && essayValue.trim() === rubricFor ? activeRubric : undefined;

  useEffect(() => {
    onDraftChange(composeDraft(notesValue, essayValue));
  }, [notesValue, essayValue, onDraftChange]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ essay: essayValue, notes: notesValue, rubric: displayRubric }));
  }, [mounted, storageKey, essayValue, notesValue, displayRubric]);

  function writeEssay(next: string) {
    setEssay(next);
    if (next.trim() !== rubricFor) setRubric(undefined);
    onDraftChange(composeDraft(notesValue, next));
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
              value={notesValue[label] ?? ""}
              onChange={(event) => {
                const next = { ...notesValue, [label]: event.target.value };
                setNotes(next);
                onDraftChange(composeDraft(next, essayValue));
              }}
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2"
            />
          </label>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Four-paragraph template</summary>
        <div className="mt-3 max-h-80 space-y-4 overflow-y-auto pr-1">
          {essayTemplateExample(day).map((part, index) => (
            <div key={part.title} className="space-y-2">
              <p className="text-sm font-semibold">{templateFrames[index].title}</p>
              <p className="text-sm leading-6 text-muted">{templateFrames[index].frame}</p>
              <p className="text-sm font-semibold">Example</p>
              <p className="text-sm leading-6">{part.text}</p>
            </div>
          ))}
          <pre className="whitespace-pre-wrap border-t border-line pt-3 font-sans text-sm leading-6 text-muted">{template.slice(template.indexOf("Target timing"))}</pre>
        </div>
      </details>
      <details>
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
      <details>
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
        <input type="hidden" name="rubric" value={displayRubric ? JSON.stringify(displayRubric) : ""} />
        <textarea
          name="essay"
          rows={12}
          value={essayValue}
          onChange={(event) => writeEssay(event.target.value)}
          placeholder="Write the essay here. Aim for 25 minutes."
          className="w-full rounded-md border border-line bg-paper px-3 py-2 leading-6"
        />
        <p className="text-right text-sm text-muted">{wordCount(essayValue)} words</p>
        {scoreState.error ? <p className="text-sm text-clay">{scoreState.error}</p> : null}
        {saveState.error ? <p className="text-sm text-clay">{saveState.error}</p> : null}
        {displayRubric ? <p className="whitespace-pre-wrap text-sm leading-6">{rubricText(displayRubric)}</p> : null}
        {saveState.message ? <p className="text-sm text-muted">{saveState.message}</p> : null}
        <div className="flex gap-2">
          {canGrade ? (
            <button type="submit" formAction={scoreAction} disabled={scorePending || savePending || wordCount(essayValue) === 0} className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper disabled:opacity-40">
              {scorePending ? "Scoring…" : "Score"}
            </button>
          ) : (
            <p className="text-sm text-muted">Essay scoring is on the 90-day pass.</p>
          )}
          <button type="submit" disabled={savePending || scorePending || wordCount(essayValue) === 0} className="rounded-md border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40">
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
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await updateEssayAction(prev, formData);
    if (result.message) setEditing(false);
    return result;
  }, initial);
  const [scoreState, scoreAction, scorePending] = useActionState(scoreEssayAction, initial);
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
