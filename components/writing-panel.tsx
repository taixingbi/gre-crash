"use client";

import { useActionState } from "react";
import { submitEssayAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};
const boxes = ["My position", "Reason 1", "Example 1", "Reason 2", "Counterargument", "Response"];

export function WritingPanel({
  day,
  theme,
  prompt,
  task,
  template,
  canGrade,
}: {
  day: number;
  theme: string;
  prompt: string;
  task: string;
  template: string;
  canGrade: boolean;
}) {
  const [state, action, pending] = useActionState(submitEssayAction, initial);
  return (
    <section id="writing" className="space-y-4 rounded-lg border border-line bg-card p-5">
      <p className="text-sm text-muted">Writing · Day {day}</p>
      <h2 className="font-serif text-2xl">{theme}</h2>
      <p className="leading-7">{prompt}</p>
      <p className="text-sm text-muted">{task}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {boxes.map((label) => (
          <label key={label} className="text-sm">
            {label}
            <input className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2" />
          </label>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm font-semibold">Four-paragraph template</summary>
        <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-muted">{template}</pre>
      </details>
      {canGrade ? (
        <form action={action} className="space-y-3">
          <input type="hidden" name="day" value={day} />
          <input type="hidden" name="prompt" value={prompt} />
          <textarea
            name="essay"
            rows={12}
            placeholder="Write the essay here. Aim for 25 minutes."
            className="w-full rounded-md border border-line bg-paper px-3 py-2 leading-6"
          />
          {state.error ? <p className="text-sm text-clay">{state.error}</p> : null}
          {state.message ? <p className="whitespace-pre-wrap text-sm leading-6">{state.message}</p> : null}
          <button type="submit" disabled={pending} className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper">
            {pending ? "Reading…" : "Score this essay"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">The outline is yours to use. Essay scoring is on the 90-day pass.</p>
      )}
    </section>
  );
}
