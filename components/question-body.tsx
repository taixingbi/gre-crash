"use client";

import type { ChoiceItem, PublicQuestion } from "@/lib/types";

function formatData(data: string) {
  return data
    .replace(/\s+\d+\s*ø/g, "")
    .replace(/\s+(?=Number of |Total Revenue |Average|Movie Has |\*\s*arithmetic)/g, "\n")
    .replace(/\s+(?=[A-G]\s+\$)/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function present(prompt: string) {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  const at = Math.max(
    cleaned.lastIndexOf(" When "),
    cleaned.lastIndexOf(" If "),
    cleaned.lastIndexOf(" What "),
    cleaned.lastIndexOf(" Which "),
    cleaned.lastIndexOf(" For the "),
    cleaned.lastIndexOf(" Suppose "),
  );
  if (at > 40 && cleaned.includes("?")) {
    return { data: formatData(cleaned.slice(0, at)), question: cleaned.slice(at).trim() };
  }
  return { data: null, question: cleaned };
}

function choiceGroups(prompt: string, items: ChoiceItem[]) {
  const blanks = ["(i)", "(ii)", "(iii)"].filter((blank) => prompt.includes(blank)).length;
  if (blanks >= 2 && items.length >= blanks * 2 && items.length % blanks === 0) {
    const size = items.length / blanks;
    return ["(i)", "(ii)", "(iii)"].slice(0, blanks).map((blank, index) => ({
      label: `Blank ${blank}`,
      items: items.slice(index * size, (index + 1) * size),
    }));
  }
  return [{ label: "", items }];
}

export function QuestionBody({
  question,
  selected,
  onToggle,
  disabled,
}: {
  question: PublicQuestion;
  selected: string[];
  onToggle: (letter: string) => void;
  disabled: boolean;
}) {
  const items = question.choiceItems?.length
    ? question.choiceItems
    : question.choices.map((choice) => ({ letter: choice.slice(0, 1), text: choice.length > 1 ? choice.slice(2).trim() : "" }));
  const { data, question: prompt } = present(question.prompt || question.stem || "");
  const groups = choiceGroups(prompt, items);
  const table = question.table;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-card p-5">
        {table && table.rows.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              {table.caption ? <caption className="mb-3 text-left font-serif text-lg">{table.caption}</caption> : null}
              {table.headers?.some(Boolean) ? (
                <thead>
                  <tr>
                    {table.headers.map((header, index) => (
                      <th key={index} className="border border-line px-2 py-2 text-left align-bottom font-semibold leading-5">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody>
                {table.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="border border-line px-2 py-1.5 align-top">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-muted">{data}</p>
        ) : null}
        <p className="text-lg leading-8">{prompt || "This question has no extracted text."}</p>
      </div>
      {question.questionType === "numeric" ? null : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label || "choices"} className="space-y-2">
              {group.label ? <p className="text-sm text-muted">{group.label}</p> : null}
              {group.items.map((choice) => {
                const active = selected.includes(choice.letter);
                return (
                  <button
                    key={choice.letter}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggle(choice.letter)}
                    className={`flex w-full gap-3 rounded-md border px-3 py-2.5 text-left text-sm leading-6 ${active ? "border-pine bg-pine text-paper" : "border-line bg-card"}`}
                  >
                    <span className="font-semibold">{choice.letter}</span>
                    {choice.text ? <span>{choice.text}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
