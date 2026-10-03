import { randomUUID } from "crypto";
import { cacheGet, cacheSet } from "./data";
import type { EssayRubric, Question, RubricScore } from "./types";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const scores = new Set<RubricScore>(["Good", "Needs work", "Weak"]);

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

function questionBrief(question: Question, selected: string) {
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
    `Correct answer: ${question.answer}`,
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
  return complete(
    [
      {
        role: "system",
        content: `You are a GRE tutor beside one question. Answer only the student's latest question about it. Stay short. If they write in Chinese, answer in Chinese. Do not invent numbers.\n\n${questionBrief(question, selected)}`,
      },
      ...history,
      { role: "user", content: message.slice(0, 500) },
    ],
    { temperature: 0.2, maxTokens: 500 },
  );
}

export async function explainQuestion(question: Question, selected: string, kind: "why_correct" | "why_wrong" | "faster" | "zh") {
  const key = `${question.id}:${kind}:${selected}:v2`;
  const cached = await cacheGet(key);
  if (cached) return cached;
  const instruction = {
    why_correct: "Explain why the correct answer is right. Mention the trap in one sentence.",
    why_wrong: "Explain why the student's answer is wrong and what it confused.",
    faster: "Give a faster solution in at most five short steps.",
    zh: "用中文解释为什么正确答案对，以及学生的答案错在哪里。",
  }[kind];
  const text = await complete(
    [
      { role: "system", content: "You are a GRE tutor. Be concrete and short." },
      { role: "user", content: `${instruction}\n\n${questionBrief(question, selected)}` },
    ],
    { temperature: 0, maxTokens: 500 },
  );
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
