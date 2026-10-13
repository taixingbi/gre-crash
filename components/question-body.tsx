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

function stripBookletNumbers(text: string) {
  return text.replace(/(^|\n)\s*\d{1,2}\.(?=\s*[A-Za-z])/g, "$1");
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
      if (!/[.?!]/.test(line) && line.length < 80 && /\b(algebra|arithmetic|geometry|probability|statistics|number properties)\b/i.test(line)) return false;
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
    const fromItem = item.text.replace(/\s+that$/, "").trim();
    const lines = [...stem.matchAll(new RegExp(`(?:^|\\n)\\s*${item.letter}\\.\\s+([^\\n]+)`, "g"))]
      .map((match) => match[1].trim())
      .filter((line) => line && !line.includes("\ufffd"));
    const same = lines.find((line) => fromItem && (line.startsWith(fromItem.slice(0, 24)) || fromItem.startsWith(line.slice(0, 24))));
    if (same && same.length > fromItem.length) return { ...item, text: same };
    if (fromItem) return { ...item, text: fromItem };
    return { ...item, text: lines[0] ?? "" };
  });
}

const SUBSCRIPT: Record<string, string> = { "₁": "1", "₂": "2", "₃": "3", "₄": "4", "ₙ": "n", "ᵢ": "i" };

function withSubscripts(part: string) {
  const bits = part.split(/([₁₂₃₄ₙᵢ])/g);
  if (bits.length === 1) return part;
  return bits.map((bit, index) =>
    SUBSCRIPT[bit] ? (
      <sub key={index} className="text-[0.75em]">
        {SUBSCRIPT[bit]}
      </sub>
    ) : (
      bit
    ),
  );
}

function FractionText({ text }: { text: string }) {
  const normalized = text.replace(/x\u0304|x\u0305/g, "\u0000bar\u0000");
  const parts = normalized.split(
    /(\u0000bar\u0000|√\([A-Za-z0-9π()²³+\-]+\/[A-Za-z0-9π()²³+\-]+\)|√\d+|(?:[A-Za-z0-9π()²³+\-]+)\/(?:[A-Za-z0-9π()²³+\-]+))/g,
  );
  return parts.map((part, index) => {
    if (!part) return null;
    if (part === "\u0000bar\u0000") {
      return (
        <span key={index} className="inline-block px-px leading-none [text-decoration:overline]">
          x
        </span>
      );
    }
    const radical = part.match(/^√\(([A-Za-z0-9π()²³+\-]+)\/([A-Za-z0-9π()²³+\-]+)\)$/);
    if (radical) {
      return (
        <span key={index} className="mx-0.5 inline-flex items-stretch align-middle">
          <span className="flex items-end pr-px text-[1.15em] leading-none">√</span>
          <span className="inline-flex flex-col items-center border-t border-current text-[0.92em] leading-none">
            <span className="px-1 pb-px">{radical[1]}</span>
            <span className="border-t border-current px-1 pt-px">{radical[2]}</span>
          </span>
        </span>
      );
    }
    const root = part.match(/^√(\d+)$/);
    if (root) {
      return (
        <span key={index} className="mx-0.5 inline-flex items-end align-middle">
          <span className="text-[1.15em] leading-none">√</span>
          <span className="border-t border-current px-0.5 leading-none">{root[1]}</span>
        </span>
      );
    }
    const match = part.match(/^([A-Za-z0-9π()²³+\-]+)\/([A-Za-z0-9π()²³+\-]+)$/);
    if (!match) return <span key={index}>{withSubscripts(part)}</span>;
    let numerator = match[1];
    let denominator = match[2];
    const wrapped = numerator.startsWith("(") && !numerator.includes(")") && denominator.endsWith(")") && !denominator.includes("(");
    if (wrapped) {
      numerator = numerator.slice(1);
      denominator = denominator.slice(0, -1);
    }
    const fraction = (
      <span className="mx-0.5 inline-flex flex-col items-center align-middle text-[0.92em] leading-none">
        <span className="border-b border-current px-0.5 pb-px">{numerator}</span>
        <span className="px-0.5 pt-px">{denominator}</span>
      </span>
    );
    if (!wrapped) return <span key={index}>{fraction}</span>;
    return (
      <span key={index} className="mr-1 inline-flex items-center align-middle">
        <span className="text-[1.45em] leading-none">(</span>
        <span className="mx-px inline-flex flex-col items-center text-[0.78em] leading-none">
          <span className="border-b border-current px-0.5 pb-px">{numerator}</span>
          <span className="px-0.5 pt-px">{denominator}</span>
        </span>
        <span className="text-[1.45em] leading-none">)</span>
      </span>
    );
  });
}

const SINGLE_DIRECTION = "Select one entry for the blank. Fill the blank in the way that best completes the text.";
const MULTI_DIRECTION = "For each blank select one entry from the corresponding column of choices. Fill all blanks in the way that best completes the text.";
const EQUIVALENCE_DIRECTION =
  "Select the two answer choices that, when used to complete the sentence, fit the meaning of the sentence as a whole and produce completed sentences that are alike in meaning.";

const DIRECTIONS = [
  new RegExp(`^${EQUIVALENCE_DIRECTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?`, "i"),
  new RegExp(`^${MULTI_DIRECTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?`, "i"),
  new RegExp(`^${SINGLE_DIRECTION.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?`, "i"),
  /^Consider each of the choices separately and select all that apply\.?/i,
  /^Questions\s+\d+\s+to\s+\d+\s+are based on (?:this|the following) (?:passage|data)\.?/i,
];

const DIRECTION_TAILS = [
  /^Fill all blanks in the way that best completes the text\.?/i,
  /^Fill the blank in the way that best completes the text\.?/i,
  /^best completes the text\.?/i,
  /^alike in meaning\.?/i,
];

function withoutTrailingDirection(body: string) {
  const trailing = body.search(
    /\s+(?:Select one entry for the blank\.|For each blank select one entry from the corresponding column of choices\.|Select the two answer choices that,|Consider each of the choices separately)/i,
  );
  return trailing > 20 ? body.slice(0, trailing).trim() : body;
}

function splitDirection(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  for (const pattern of DIRECTIONS) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    return { direction: match[0].trim(), body: withoutTrailingDirection(cleaned.slice(match[0].length).trim()) };
  }
  for (const tail of DIRECTION_TAILS) {
    const match = cleaned.match(tail);
    if (!match) continue;
    const body = withoutTrailingDirection(cleaned.slice(match[0].length).trim());
    const blanks = (body.match(/\([ivx]+\)/gi) || []).length;
    const direction = /alike in meaning/i.test(match[0]) ? EQUIVALENCE_DIRECTION : blanks >= 2 ? MULTI_DIRECTION : SINGLE_DIRECTION;
    return { direction, body };
  }
  return { direction: null as string | null, body: cleaned };
}

function PromptLine({ text }: { text: string }) {
  const parts = text.split(/_{2,}/);
  if (parts.length === 1) {
    return (
      <p className="text-base leading-7">
        <FractionText text={text} />
      </p>
    );
  }
  return (
    <p className="text-base leading-7">
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

export function choiceAnswerLetters(answer: string, letters: string[]) {
  const compact = answer.replace(/\s+/g, "").toUpperCase();
  const known = new Set(letters.map((letter) => letter.toUpperCase()));
  if (!/^[A-I]+$/.test(compact) || ![...compact].every((letter) => known.has(letter))) return null;
  return new Set(compact);
}

function ChoiceRow({
  letter,
  text,
  active,
  disabled,
  multiple,
  mark,
  onToggle,
}: {
  letter: string;
  text: string;
  active: boolean;
  disabled: boolean;
  multiple: boolean;
  mark: "correct" | "miss" | null;
  onToggle: (letter: string) => void;
}) {
  const words = text.trim() || letter;

  function copyWords(event: React.MouseEvent<HTMLSpanElement>) {
    const range = document.createRange();
    range.selectNodeContents(event.currentTarget);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    void navigator.clipboard.writeText(words).catch(() => {
      document.execCommand("copy");
    });
  }

  const ring = mark === "correct" ? "border-pine" : mark === "miss" ? "border-clay" : active ? "border-violet" : "border-ink";
  const dot = mark === "correct" ? "bg-pine" : mark === "miss" ? "bg-clay" : "bg-violet";
  const row = mark === "correct" ? "bg-[#e7f3ec]" : mark === "miss" ? "bg-[#f8ece9]" : active ? "bg-[#f3f1ff]" : "";
  const filled = mark === "correct" || mark === "miss" || active;

  return (
    <div className={`flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left text-base leading-7 ${row}`}>
      <button
        type="button"
        role={multiple ? "checkbox" : "radio"}
        aria-checked={filled}
        aria-label={`${letter}. ${words}${mark === "correct" ? ", correct" : ""}`}
        disabled={disabled}
        onClick={() => onToggle(letter)}
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center"
      >
        <span className={`grid h-[18px] w-[18px] place-items-center border-2 ${multiple ? "rounded-[3px]" : "rounded-full"} ${ring}`}>
          {filled ? <span className={`${multiple ? "h-2.5 w-2.5 rounded-[2px]" : "h-2 w-2 rounded-full"} ${dot}`} /> : null}
        </span>
      </button>
      <span onDoubleClick={copyWords} className="select-text pt-0.5">
        <span className="mr-2 font-semibold">{letter}.</span>
        <FractionText text={text} />
      </span>
      {mark === "correct" ? <span className="ml-auto shrink-0 pt-0.5 text-sm font-semibold text-pine">Correct</span> : null}
    </div>
  );
}

export function QuestionBody({
  question,
  selected,
  onToggle,
  disabled,
  plain = false,
  answer = null,
}: {
  question: PublicQuestion;
  selected: string[];
  onToggle: (letter: string) => void;
  disabled: boolean;
  plain?: boolean;
  answer?: string | null;
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
  const { data, question: prompt } = present(stripBookletNumbers(passage || (comparison ? "" : question.prompt || stem)));
  const { direction, body } = splitDirection(prompt);
  const groups = choiceGroups(body, items);
  const correctLetters = answer ? choiceAnswerLetters(answer, items.map((item) => item.letter)) : null;
  const table = question.table;
  const shortLead = !table?.rows.length || table.rows.every((row) => (row[0] ?? "").trim().length <= 6);
  const figureHasText = Boolean(question.figure) && /as a fraction/i.test(`${data || ""} ${body}`);

  return (
    <div className="space-y-5">
      <div className={plain ? "text-ink" : "rounded-lg border border-line bg-card p-5 text-ink"}>
        {question.figure ? (
          <img src={`/api/questions/${question.id}/figure?v=16`} alt="" className="mx-auto mb-5 max-h-[40rem] max-w-full" />
        ) : null}
        {table && table.rows.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            {table.caption ? <p className={`mb-3 text-base font-semibold whitespace-pre-line ${shortLead ? "text-left" : "text-center"}`}>{table.caption}</p> : null}
            <table className={`${shortLead ? "w-full" : "mx-auto w-max max-w-full"} border-collapse text-sm`}>
              {table.headers?.some(Boolean) ? (
                <thead>
                  <tr className="bg-[#f3efe6]">
                    {table.headers.map((header, index) => (
                      <th key={index} className={`border border-ink/80 px-2 py-2 align-bottom text-xs font-semibold leading-4 whitespace-pre-line ${index === 0 ? `${shortLead ? "w-12" : "px-3 whitespace-nowrap"} text-left` : "text-center"}`}>
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
                        className={`border border-ink/80 px-2 py-1.5 align-middle ${cellIndex === 0 && !shortLead ? "whitespace-nowrap px-3 text-left" : ""} ${numericCell(cell) ? "whitespace-nowrap text-center tabular-nums" : "text-left"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {data && !figureHasText ? (
          <p className="mb-4 whitespace-pre-wrap text-base leading-7"><FractionText text={data} /></p>
        ) : null}
        {comparison ? (
          <div className="mx-auto max-w-xl text-center">
            {comparison.given ? (
              <p className="mb-6 text-base leading-7">
                <FractionText text={mathText(stripBookletNumbers(comparison.given))} />
              </p>
            ) : null}
            <div className="grid grid-cols-2 border border-ink text-left">
              <div className="border-r border-ink px-4 py-4 text-center">
                <p className="text-sm font-semibold">Quantity A</p>
                <p className="mt-4 text-base leading-7"><FractionText text={mathText(comparison.quantityA)} /></p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-sm font-semibold">Quantity B</p>
                <p className="mt-4 text-base leading-7"><FractionText text={mathText(comparison.quantityB)} /></p>
              </div>
            </div>
          </div>
        ) : figureHasText ? null : (
          <div>
            {direction ? <p className="mb-4 rounded-md bg-[#f3efe6] px-3 py-2 text-sm leading-6">{direction}</p> : null}
            <PromptLine text={body || "This question has no extracted text."} />
          </div>
        )}
      </div>
      {question.questionType === "numeric" ? null : (
        <div className={groups.length > 1 ? `grid items-start gap-x-6 gap-y-4 ${groups.length === 2 ? "sm:grid-cols-2" : "lg:grid-cols-3"}` : "space-y-4"}>
          {groups.map((group) => (
            <div key={group.label || "choices"} role={question.questionType === "multi" ? "group" : "radiogroup"} className="space-y-1">
              {group.label ? <p className="text-sm font-semibold">{group.label}</p> : null}
              {group.items.map((choice) => {
                const picked = selected.includes(choice.letter);
                const correct = correctLetters?.has(choice.letter.toUpperCase()) ?? false;
                return (
                  <ChoiceRow
                    key={choice.letter}
                    letter={choice.letter}
                    text={choice.text}
                    active={picked}
                    disabled={disabled}
                    multiple={question.questionType === "multi"}
                    mark={correct ? "correct" : correctLetters && picked ? "miss" : null}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
