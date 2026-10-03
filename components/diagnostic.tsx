"use client";

import { useState } from "react";
import { QuestionBody } from "@/components/question-body";
import { finishDiagnosticAction, submitAnswerAction } from "@/lib/actions";
import type { PublicQuestion } from "@/lib/types";

export function Diagnostic({ questions }: { questions: PublicQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [numeric, setNumeric] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const question = questions[index];
  if (!question) return null;
  const value = question.questionType === "numeric" ? numeric.trim() : selected.join("");

  return (
    <div className="space-y-4 rounded-lg border border-line bg-card p-5">
      <p className="text-sm text-muted">
        Diagnostic {index + 1} of {questions.length} · {question.category}
      </p>
      <QuestionBody
        question={question}
        selected={selected}
        disabled={false}
        onToggle={(letter) =>
          setSelected((current) =>
            question.questionType === "single"
              ? [letter]
              : current.includes(letter)
                ? current.filter((item) => item !== letter)
                : [...current, letter].sort(),
          )
        }
      />
      {question.questionType === "numeric" ? (
        <input
          value={numeric}
          onChange={(event) => setNumeric(event.target.value)}
          className="w-40 rounded-md border border-line px-3 py-2"
        />
      ) : null}
      {note ? <p className="text-sm">{note}</p> : null}
      <button
        type="button"
        disabled={pending || value.length === 0}
        className="rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
        onClick={async () => {
          setPending(true);
          const response = await submitAnswerAction({ questionId: question.id, selected: value, seconds: 60 });
          setPending(false);
          if ("error" in response && response.error) {
            setNote(response.error);
            return;
          }
          if (index + 1 >= questions.length) {
            await finishDiagnosticAction();
            return;
          }
          setIndex(index + 1);
          setSelected([]);
          setNumeric("");
          setNote("correct" in response && response.correct ? "Correct. Next one." : "Recorded. Next one.");
        }}
      >
        {index + 1 === questions.length ? "Finish diagnostic" : "Submit and continue"}
      </button>
    </div>
  );
}
