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

function mathText(value: string) {
  return value.replace(/[\u2223\u2225\u2502\u2503\uff5c]/g, "|");
}

function cleanGiven(raw: string) {
  const marks = [...raw.matchAll(/(?:^|\n)\s*\d+\.\s+/g)];
  const body = marks.length ? raw.slice((marks.at(-1)?.index ?? 0) + (marks.at(-1)?.[0].length ?? 0)) : raw;
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line || line.length < 2) return false;
      if (/quantitat|section\s+\d|part\s+\d|第|内部教研/i.test(line)) return false;
      if (/\b(algebra|arithmetic|geometry|probability|statistics|number properties)\b/i.test(line)) return false;
      if (/^\d{2,3}\b/.test(line) || /^[A-E]\.\s+/.test(line)) return false;
      return true;
    });
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function splitQuantities(block: string) {
  const left: string[] = [];
  const right: string[] = [];
  for (const line of block.split("\n")) {
    const parts = line
      .trim()
      .split(/\s{3,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      left.push(parts[0]);
      right.push(parts.slice(1).join(" "));
    } else if (parts.length === 1) {
      left.push(parts[0]);
    }
  }
  return { quantityA: left.join(" "), quantityB: right.join(" ") };
}

function parseComparison(stem: string) {
  const start = stem.search(/Quantity\s+A/);
  if (start < 0) return null;
  const afterA = stem.slice(start);
  const bAt = afterA.search(/Quantity\s+B/);
  if (bAt < 0) return null;
  const afterB = afterA.slice(bAt).replace(/^Quantity\s+B/, "");
  const choiceAt = afterB.search(/\n\s*[A-D]\.\s+/);
  const block = (choiceAt >= 0 ? afterB.slice(0, choiceAt) : afterB.slice(0, 400)).trim();
  const quantities = splitQuantities(block);
  if (!quantities.quantityA || !quantities.quantityB) return null;
  return { given: cleanGiven(stem.slice(0, start)), ...quantities };
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

function passageFromStem(stem: string) {
  const blank = stem.search(/_{3,}/);
  if (blank < 0) return null;
  const marks = [...stem.slice(0, blank).matchAll(/(?:^|\n)\s*\d+\.\s+/g)];
  const mark = marks.at(-1);
  const start = mark ? (mark.index ?? 0) + mark[0].length : Math.max(0, blank - 500);
  const after = stem.slice(blank);
  const end = after.search(/[.?!]/);
  return stem
    .slice(start, blank + (end >= 0 ? end + 1 : 8))
    .replace(/\s+/g, " ")
    .trim();
}

function cleanItems(items: ChoiceItem[], stem: string) {
  return items.map((item) => {
    const line = stem.match(new RegExp(`(?:^|\\n)\\s*${item.letter}\\.\\s+([^\\n]+)`));
    const fromStem = line?.[1].trim() ?? "";
    const fromItem = item.text.replace(/\s+that$/, "");
    const text = fromStem && !fromStem.includes("\ufffd") ? fromStem : fromItem;
    return { ...item, text };
  });
}

function FractionText({ text }: { text: string }) {
  const parts = text.split(/(\b[A-Za-z0-9()]{1,12}\/[A-Za-z0-9()]{1,12}\b)/g);
  return parts.map((part, index) => {
    const match = part.match(/^([A-Za-z0-9()]+)\/([A-Za-z0-9()]+)$/);
    if (!match) return <span key={index}>{part}</span>;
    return (
      <span key={index} className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.92em] leading-none">
        <span className="border-b border-current px-0.5 pb-px">{match[1]}</span>
        <span className="px-0.5 pt-px">{match[2]}</span>
      </span>
    );
  });
}

function PromptLine({ text }: { text: string }) {
  const parts = text.split(/_{2,}/);
  if (parts.length === 1) {
    return (
      <p className="text-lg leading-8">
        <FractionText text={text} />
      </p>
    );
  }
  return (
    <p className="text-lg leading-8">
      {parts.map((part, index) => (
        <span key={index}>
          <FractionText text={part} />
          {index < parts.length - 1 ? <span className="inline-block w-24 border-b-2 border-ink align-baseline" /> : null}
        </span>
      ))}
    </p>
  );
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

function numericCell(value: string) {
  return /^\$?[\d,]+(\.\d+)?%?$/.test(value.trim());
}

export function QuestionBody({
  question,
  selected,
  onToggle,
  disabled,
  plain = false,
}: {
  question: PublicQuestion;
  selected: string[];
  onToggle: (letter: string) => void;
  disabled: boolean;
  plain?: boolean;
}) {
  const stem = question.stem || "";
  const items = cleanItems(
    question.choiceItems?.length
      ? question.choiceItems
      : question.choices.map((choice) => ({ letter: choice.slice(0, 1), text: choice.length > 1 ? choice.slice(2).trim() : "" })),
    stem,
  );
  const comparison = parseComparison(stem);
  const passage = comparison ? null : passageFromStem(stem);
  const { data, question: prompt } = present(passage || (comparison ? "" : question.prompt || stem));
  const groups = choiceGroups(prompt, items);
  const table = question.table;

  return (
    <div className="space-y-5">
      <div className={plain ? "text-ink" : "rounded-lg border border-line bg-card p-5 text-ink"}>
        {table && table.rows.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              {table.caption ? <caption className="mb-3 text-left text-base font-semibold">{table.caption}</caption> : null}
              {table.headers?.some(Boolean) ? (
                <thead>
                  <tr className="bg-[#f3efe6]">
                    {table.headers.map((header, index) => (
                      <th key={index} className={`border border-ink/80 px-2 py-2 align-bottom text-xs font-semibold leading-4 ${index === 0 ? "w-12 text-left" : "text-center"}`}>
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
                      <td
                        key={cellIndex}
                        className={`border border-ink/80 px-2 py-1.5 text-center align-middle ${numericCell(cell) ? "whitespace-nowrap tabular-nums" : "text-left"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : data ? (
          <p className="mb-4 whitespace-pre-wrap text-sm leading-6">{data}</p>
        ) : null}
        {comparison ? (
          <div className="mx-auto max-w-xl text-center">
            {comparison.given ? <p className="mb-6 text-lg leading-8">{mathText(comparison.given)}</p> : null}
            <div className="grid grid-cols-2 border border-ink text-left">
              <div className="border-r border-ink px-4 py-4 text-center">
                <p className="text-sm font-semibold">Quantity A</p>
                <p className="mt-4 text-lg leading-7"><FractionText text={mathText(comparison.quantityA)} /></p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-sm font-semibold">Quantity B</p>
                <p className="mt-4 text-lg leading-7"><FractionText text={mathText(comparison.quantityB)} /></p>
              </div>
            </div>
          </div>
        ) : (
          <PromptLine text={prompt || "This question has no extracted text."} />
        )}
      </div>
      {question.questionType === "numeric" ? null : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label || "choices"} className="space-y-1">
              {group.label ? <p className="text-sm font-semibold">{group.label}</p> : null}
              {group.items.map((choice) => {
                const active = selected.includes(choice.letter);
                return (
                  <button
                    key={choice.letter}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggle(choice.letter)}
                    className={`flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left text-base leading-7 disabled:opacity-70 ${active ? "bg-[#f3f1ff]" : "hover:bg-paper"}`}
                  >
                    <span className={`mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${active ? "border-violet" : "border-ink"}`}>
                      {active ? <span className="h-2 w-2 rounded-full bg-violet" /> : null}
                    </span>
                    <span>
                      <span className="mr-2 font-semibold">{choice.letter}.</span>
                      <FractionText text={choice.text} />
                    </span>
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
