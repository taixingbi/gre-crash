import { createHash, randomUUID } from "crypto";
import { cacheGet, cacheSet } from "./data";
import type { EssayRubric, Question, RubricScore } from "./types";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const scores = new Set<RubricScore>(["Good", "Needs work", "Weak"]);

const PLAIN_MATH =
  "Write every number and formula as plain text. Fractions look like 26/27. Variables look like s or 2s-4. Do not use LaTeX or any backslash.";

function plainMath(text: string) {
  return text
    .replace(/\\frac\s*\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\\(([\s\S]*?)\\\)/g, "$1")
    .replace(/\\\[([\s\S]*?)\\\]/g, "$1")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\leq|\\le(?![a-zA-Z])/g, "≤")
    .replace(/\\geq|\\ge(?![a-zA-Z])/g, "≥")
    .replace(/\\neq/g, "≠")
    .replace(/\\pm/g, "±")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\\/g, "")
    .replace(/[^\S\n]{2,}/g, " ");
}

export function aiConfigured() {
  return Boolean(process.env.FUNCTION_URL && process.env.INFERENCE_API_KEY);
}

export async function complete(messages: ChatMessage[], options: { temperature: number; maxTokens: number }) {
  const base = process.env.FUNCTION_URL;
  const key = process.env.INFERENCE_API_KEY;
  if (!base || !key) throw new Error("Nova Pro is not configured.");
  const url = new URL("v1/chat/completions", base.endsWith("/") ? base : `${base}/`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "nova-pro",
      messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }),
  });
  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Nova Pro returned ${response.status}.`);
  }
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Nova Pro returned an empty answer.");
  return text;
}

function isReading(category: string) {
  return /short reading|long reading/i.test(category);
}

function questionBrief(question: Question, selected: string, hideAnswer = false) {
  const prompt = question.prompt || question.stem;
  const choiceLines = question.choiceItems?.length
    ? question.choiceItems.map((item) => `${item.letter}. ${item.text}`).join("\n")
    : question.choices.join(", ") || "numeric entry";
  const table = question.table
    ? [question.table.caption || "", (question.table.headers || []).join(" | "), ...question.table.rows.map((row) => row.join(" | "))]
        .filter(Boolean)
        .join("\n")
    : "";
  return [
    `Section: ${question.section}`,
    `Category: ${question.category}`,
    prompt ? `Question:\n${prompt}` : "Question text was not extracted.",
    table ? `Table:\n${table}` : "",
    "Do not invent numbers that are not in the question or table.",
    `Choices:\n${choiceLines}`,
    hideAnswer ? "" : `Correct answer: ${question.answer}`,
    `Student answer: ${selected || "(none)"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function tutorReply(question: Question, selected: string, turns: { role: "user" | "assistant"; content: string }[], message: string) {
  const history = turns.slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.content.slice(0, 1500),
  }));
  const raw = await complete(
    [
      {
        role: "system",
        content: `You are a GRE tutor beside one question. Answer only the student's latest question about it. Stay short. If they write in Chinese, answer in Chinese. If you name the answer, use only the correct-answer letters in the brief. Do not invent numbers. ${PLAIN_MATH}\n\n${questionBrief(question, selected)}`,
      },
      ...history,
      { role: "user", content: message.slice(0, 500) },
    ],
    { temperature: 0.2, maxTokens: 500 },
  );
  return plainMath(raw);
}

export async function explainQuestion(
  question: Question,
  selected: string,
  kind: "why_correct" | "why_wrong" | "faster" | "zh" | "translate" | "choices" | "logic" | "why_fit" | "eliminate",
) {
  const reading = kind === "choices" && isReading(question.category);
  const revision = createHash("sha1").update(`${question.category}\n${question.prompt || question.stem}`).digest("hex").slice(0, 8);
  const key = `${question.id}:${question.answer}:${kind}:${selected}:${revision}:${reading ? "reading-v2" : kind === "choices" ? "v6" : "v5"}`;
  const cached = await cacheGet(key);
  if (cached) return cached;
  const instruction = {
    why_correct: "Explain why the correct answer is right. Mention the trap in one sentence.",
    why_wrong: "Explain why the student's answer is wrong and what it confused.",
    faster: "Give a faster solution in at most five short steps.",
    zh: "用中文解释为什么正确答案对，以及学生的答案错在哪里。",
    translate: "把题干译成通顺的中文。填空题译出整句并标出空格在说什么；阅读题译关键句，不要逐词硬译。先不要公布答案。",
    choices: reading
      ? "This is a reading question. Each choice is a claim, not a vocabulary word.\nFor each choice, write exactly two lines and no labels:\nA. the claim in very simple words\none short sentence saying what that claim means\nBlank line before the next letter.\nDo not use [[ ]]. Do not write \"Meaning:\" or \"Example:\". Do not say which choice is correct.\nExample of the format:\nA. the studies counted too little change\nThey say the spiral varies less than it really does."
      : "For each answer choice that has a word, use exactly these three lines and no labels:\n[[word]]\none very simple definition\none very short everyday sentence that uses the word\nPut a blank line between choices. Never write \"Meaning:\" or \"Example:\". Do not say which choice is correct.\nExample of the format:\n[[calm]]\nnot excited or upset\nThe lake is calm today.",
    logic: "Point out the logic clue that decides the answer: contrast, cause, concession, restatement, or the author's attitude. Do not give the answer yet.",
    why_fit: "Explain why the correct-answer letters in the brief fit the clue. Name the closest trap in one sentence. Do not name a different pair.",
    eliminate: "Say why each wrong choice fails. Name the correct answer only briefly.",
  }[kind];
  const raw = await complete(
    [
      { role: "system", content: `You are a GRE tutor. Be concrete and short. If you name the answer, use only the correct-answer letters in the brief. ${PLAIN_MATH}` },
      { role: "user", content: `${instruction}\n\n${questionBrief(question, selected, reading)}` },
    ],
    { temperature: 0, maxTokens: kind === "choices" ? 900 : 500 },
  );
  const cleaned = plainMath(raw);
  const text = kind === "choices" ? cleaned.replace(/^\s*(?:Meaning|Example):\s*/gim, "") : cleaned;
  await cacheSet(key, text);
  return text;
}

export async function similarQuestion(question: Question, userId: string): Promise<Question> {
  const raw = await complete(
    [
      {
        role: "system",
        content:
          'Write one new GRE-style question in the same category. Reply with JSON only: {"stem":"","choices":["A. ..."],"answer":"A","questionType":"single"}',
      },
      { role: "user", content: questionBrief(question, "") },
    ],
    { temperature: 0.4, maxTokens: 700 },
  );
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as {
    stem?: string;
    choices?: string[];
    answer?: string;
    questionType?: Question["questionType"];
  };
  return {
    id: `gen-${userId.slice(0, 8)}-${randomUUID().slice(0, 8)}`,
    section: question.section,
    category: question.category,
    number: 0,
    questionType: parsed.questionType === "multi" || parsed.questionType === "numeric" ? parsed.questionType : "single",
    choices: parsed.choices?.length ? parsed.choices : ["A", "B", "C", "D", "E"],
    answer: (parsed.answer || "A").trim(),
    hasImage: false,
    stem: parsed.stem || "Similar question",
    parseStatus: "ai",
    aiGenerated: true,
  };
}

export async function essayTutorReply(input: {
  prompt: string;
  task: string;
  draft: string;
  turns: { role: "user" | "assistant"; content: string }[];
  message: string;
}) {
  const history = input.turns.slice(-8).map((turn) => ({
    role: turn.role,
    content: turn.content.slice(0, 1500),
  }));
  const raw = await complete(
    [
      {
        role: "system",
        content: `You are a GRE Issue essay coach sitting beside the student's draft. Answer only their latest question. Help them choose a position, tighten the thesis, add a concrete example, or answer a concession. Do not write the full essay unless they explicitly ask for a draft paragraph. If they write in Chinese, answer in Chinese. Stay short and specific.\n\nPrompt:\n${input.prompt || "(none)"}\n\nTask:\n${input.task || "(none)"}\n\nStudent notes and draft:\n${input.draft || "(nothing written yet)"}`,
      },
      ...history,
      { role: "user", content: input.message },
    ],
    { temperature: 0.3, maxTokens: 700 },
  );
  return plainMath(raw);
}

export async function gradeEssay(prompt: string, essay: string): Promise<EssayRubric> {
  const raw = await complete(
    [
      {
        role: "system",
        content:
          'Score a GRE Issue essay. Reply with JSON only: {"thesis":"Good"|"Needs work"|"Weak","organization":"Good"|"Needs work"|"Weak","evidence":"Good"|"Needs work"|"Weak","counterargument":"Good"|"Needs work"|"Weak","advice":"specific revision notes"}',
      },
      { role: "user", content: `Prompt:\n${prompt}\n\nEssay:\n${essay}` },
    ],
    { temperature: 0, maxTokens: 700 },
  );
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Partial<EssayRubric>;
  const score = (value: unknown): RubricScore => (scores.has(value as RubricScore) ? (value as RubricScore) : "Needs work");
  return {
    thesis: score(parsed.thesis),
    organization: score(parsed.organization),
    evidence: score(parsed.evidence),
    counterargument: score(parsed.counterargument),
    advice: parsed.advice || "Revise the thesis, one example, and the concession.",
  };
}
