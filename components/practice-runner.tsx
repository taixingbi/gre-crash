"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { choiceAnswerLetters, QuestionBody } from "@/components/question-body";
import { TutorChat } from "@/components/tutor-chat";
import { submitAnswerAction, tagWrongAction, toggleBookmarkAction } from "@/lib/actions";
import type { ErrorTag, PublicQuestion } from "@/lib/types";

const tags: ErrorTag[] = ["concept", "careless", "vocabulary", "logic", "time"];

export function PracticeRunner({
  question,
  bookmarked,
  alreadyDone = false,
  nextHref,
  nextLabel,
  position,
  aiEnabled,
}: {
  question: PublicQuestion;
  bookmarked: boolean;
  alreadyDone?: boolean;
  nextHref: string;
  nextLabel: string;
  position: { current: number; total: number } | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const started = useRef(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);
  const [selected, setSelected] = useState<string[]>([]);
  const [numeric, setNumeric] = useState("");
  const [numerator, setNumerator] = useState("");
  const [denominator, setDenominator] = useState("");
  const fraction = /as a fraction/i.test(`${question.prompt || ""}\n${question.stem || ""}`);
  const [result, setResult] = useState<{ correct: boolean; answer: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [marked, setMarked] = useState(bookmarked);
  const [tagged, setTagged] = useState(false);

  const fractionValue = numerator.trim() && denominator.trim() ? `${numerator.trim()}/${denominator.trim()}` : "";
  const answerValue = question.questionType === "numeric" ? (fraction ? fractionValue : numeric.trim()) : selected.join("");

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
      });
      router.refresh();
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

  const progress = position && position.total > 0 ? Math.round((position.current / position.total) * 100) : 0;
  const statedDirections = /select the two answer choices|select one entry for the blank|for each blank select one entry|consider each of the choices separately|select all that apply/i.test(
    `${question.prompt || ""}\n${question.stem || ""}`,
  );

  return (
    <div className="flex flex-col gap-4 p-4 lg:h-screen lg:flex-row lg:items-stretch lg:p-6">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-sm lg:h-full">
      <div className="flex items-center gap-3 border-b border-[#e4ddd0] px-5 py-3">
        <p className="min-w-0 flex-1 truncate text-sm text-muted">
          {question.section === "quant" ? "Quant" : "Verbal"} · {question.category}
          {question.aiGenerated ? " · similar question" : ""}
        </p>
        <span className="shrink-0 text-sm text-muted">{position ? `${position.current}/${position.total}` : `Question ${question.number || ""}`}</span>
        {alreadyDone && !result ? <span className="shrink-0 rounded-md bg-[#eceae6] px-2 py-1 text-xs font-medium text-muted">Done</span> : null}
        <button
          type="button"
          className={`shrink-0 rounded-md px-3 py-1.5 text-sm ${marked ? "bg-[#eceae6] text-muted" : "border border-[#e4ddd0]"}`}
          onClick={async () => {
            setMarked(await toggleBookmarkAction(question.id));
            router.refresh();
          }}
        >
          {marked ? "Bookmarked" : "Bookmark"}
        </button>
      </div>
      {position ? (
        <div className="h-0.5 bg-[#efeae0]" aria-hidden="true">
          <div className="h-full bg-pine" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
      <QuestionBody question={question} selected={selected} onToggle={toggle} disabled={Boolean(result)} plain answer={result?.answer} />

      {question.questionType === "numeric" && fraction ? (
        <div className="flex flex-col items-start gap-1">
          <p className="text-sm text-muted">Your answer</p>
          <input
            aria-label="Numerator"
            value={numerator}
            onChange={(event) => setNumerator(event.target.value)}
            disabled={Boolean(result)}
            className="h-10 w-28 border border-ink bg-white text-center text-base"
          />
          <div className="h-px w-36 bg-ink" />
          <input
            aria-label="Denominator"
            value={denominator}
            onChange={(event) => setDenominator(event.target.value)}
            disabled={Boolean(result)}
            className="h-10 w-28 border border-ink bg-white text-center text-base"
          />
        </div>
      ) : question.questionType === "numeric" ? (
        <label className="block text-sm">
          Your answer
          <input
            value={numeric}
            onChange={(event) => setNumeric(event.target.value)}
            disabled={Boolean(result)}
            className="mt-1 w-40 rounded-md border border-line bg-white px-3 py-2"
          />
        </label>
      ) : null}

      {question.questionType === "multi" && !statedDirections ? (
        <p className="text-sm text-muted">Select all that apply.</p>
      ) : null}

      {error ? <p className="text-sm text-clay">{error}</p> : null}
      {result ? (
        <div className="space-y-3 border-t border-[#e4ddd0] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-lg font-semibold ${result.correct ? "text-pine" : "text-clay"}`}>
                {result.correct ? "Correct" : "Incorrect"}
              </p>
              {choiceAnswerLetters(
                result.answer,
                (question.choiceItems?.length ? question.choiceItems : question.choices.map((choice) => ({ letter: choice.slice(0, 1), text: "" }))).map((item) => item.letter),
              ) ? null : (
                <p className="text-sm">Answer: {result.answer}</p>
              )}
            </div>
            <Link href={nextHref} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-paper">
              {nextLabel}
            </Link>
          </div>
          {!result.correct && !tagged ? (
            <div className="space-y-2">
              <p className="text-sm">What kind of miss was this?</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-md border border-line bg-card px-3 py-1.5 text-sm capitalize"
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
        </div>
      ) : null}
      </div>
      {!result ? (
      <div className="flex justify-end border-t border-[#e4ddd0] px-5 py-3">
        <button
          type="button"
          disabled={pending || answerValue.length === 0}
          onClick={submit}
          className="rounded-xl bg-violet px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Checking…" : "Submit answer"}
        </button>
      </div>
      ) : null}
      </div>
      <TutorChat questionId={question.id} section={question.section} selected={answerValue} enabled={aiEnabled} />
    </div>
  );
}
