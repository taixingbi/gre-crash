"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { QuestionBody } from "@/components/question-body";
import { TutorChat } from "@/components/tutor-chat";
import { submitAnswerAction, tagWrongAction, toggleBookmarkAction } from "@/lib/actions";
import type { ErrorTag, PublicQuestion } from "@/lib/types";

const tags: ErrorTag[] = ["concept", "careless", "vocabulary", "logic", "time"];

export function PracticeRunner({
  question,
  bookmarked,
  nextHref,
  nextLabel,
  position,
  aiEnabled,
}: {
  question: PublicQuestion;
  bookmarked: boolean;
  nextHref: string;
  nextLabel: string;
  position: { current: number; total: number } | null;
  aiEnabled: boolean;
}) {
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const [selected, setSelected] = useState<string[]>([]);
  const [numeric, setNumeric] = useState("");
  const [result, setResult] = useState<{ correct: boolean; answer: string; review?: boolean } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [marked, setMarked] = useState(bookmarked);
  const [tagged, setTagged] = useState(false);

  const answerValue = question.questionType === "numeric" ? numeric.trim() : selected.join("");

  async function submit() {
    setPending(true);
    setError("");
    const response = await submitAnswerAction({
      questionId: question.id,
      selected: answerValue,
      seconds: started.current ? (Date.now() - started.current) / 1000 : 1,
    });
    setPending(false);
    if ("error" in response && response.error) {
      setError(response.error);
      return;
    }
    if ("answer" in response && typeof response.correct === "boolean" && response.answer) {
      setResult({
        correct: response.correct,
        answer: response.answer,
        review: "review" in response && response.review === true,
      });
    }
  }

  function toggle(choice: string) {
    if (result) return;
    if (question.questionType === "single") {
      setSelected([choice]);
      return;
    }
    setSelected((current) => (current.includes(choice) ? current.filter((item) => item !== choice) : [...current, choice].sort()));
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 px-6 py-8 lg:px-10">
      <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {question.section === "quant" ? "Quant" : "Verbal"} · {question.category}
            {question.aiGenerated ? " · similar question" : ""}
          </p>
          <h1 className="font-serif text-3xl">
            Question {question.number || "new"}
            {position ? <span className="ml-3 text-lg text-muted">{position.current} of {position.total}</span> : null}
          </h1>
        </div>
        <button
          type="button"
          className="rounded-md border border-line px-3 py-1.5 text-sm"
          onClick={async () => setMarked(await toggleBookmarkAction(question.id))}
        >
          {marked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>

      <QuestionBody question={question} selected={selected} onToggle={toggle} disabled={Boolean(result)} />

      {question.questionType === "numeric" ? (
        <label className="block text-sm">
          Your answer
          <input
            value={numeric}
            onChange={(event) => setNumeric(event.target.value)}
            disabled={Boolean(result)}
            className="mt-1 w-40 rounded-md border border-line bg-card px-3 py-2"
          />
        </label>
      ) : null}

      {question.questionType === "multi" ? (
        <p className="text-sm text-muted">Select every correct letter shown on the question.</p>
      ) : null}

      {!result ? (
        <button
          type="button"
          disabled={pending || answerValue.length === 0}
          onClick={submit}
          className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {pending ? "Checking…" : "Submit answer"}
        </button>
      ) : (
        <div className="space-y-4 rounded-lg border border-line bg-card p-5">
          <p className={`font-serif text-2xl ${result.review ? "text-ink" : result.correct ? "text-pine" : "text-clay"}`}>
            {result.review ? "Check this key" : result.correct ? "Correct" : "Incorrect"}
          </p>
          <p className="text-sm">Answer: {result.answer}</p>
          {!result.correct && !result.review && !tagged ? (
            <div className="space-y-2">
              <p className="text-sm">What kind of miss was this?</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-md border border-line px-3 py-1.5 text-sm capitalize"
                    onClick={async () => {
                      await tagWrongAction(question.id, tag);
                      setTagged(true);
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <Link href={nextHref} className="inline-block rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-paper">
            {nextLabel}
          </Link>
        </div>
      )}

      {error ? <p className="text-sm text-clay">{error}</p> : null}
      </div>
      </div>
      <TutorChat questionId={question.id} selected={answerValue} enabled={aiEnabled} />
    </div>
  );
}
