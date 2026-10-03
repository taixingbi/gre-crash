import fs from "fs";
import path from "path";
import type { PublicQuestion, Question, Section, WritingDoc } from "./types";

const contentDir = path.join(process.cwd(), "content");

let bankCache: Question[] | null = null;
let writingCache: WritingDoc | null = null;

export const QUANT_CATEGORIES = [
  "Arithmetic / Percent / Ratio / Rate",
  "Algebra / Equations / Functions",
  "Number Properties / Remainder / Digits",
  "Geometry / Coordinate Geometry",
  "Statistics / Data Interpretation",
  "Probability / Counting",
];

export const VERBAL_CATEGORIES = [
  "Text Completion - Single-Blank",
  "Text Completion - Multi-Blank",
  "Sentence Equivalence",
  "Short Reading",
  "Long Reading / Argument",
];

export function loadQuestions(): Question[] {
  if (process.env.NODE_ENV === "production" && bankCache) return bankCache;
  const file = path.join(contentDir, "questions.json");
  if (!fs.existsSync(file)) return [];
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { questions: Question[] };
  bankCache = parsed.questions;
  return bankCache;
}

export function loadWriting(): WritingDoc {
  if (writingCache) return writingCache;
  const file = path.join(contentDir, "writing.json");
  if (!fs.existsSync(file)) return { template: "", prompts: [] };
  writingCache = JSON.parse(fs.readFileSync(file, "utf8")) as WritingDoc;
  return writingCache;
}

export function questionImagePath(id: string) {
  return path.join(contentDir, "pages", `${id}.png`);
}

export function findQuestion(id: string, generated: Question[] = []) {
  return generated.find((question) => question.id === id) ?? loadQuestions().find((question) => question.id === id) ?? null;
}

export function toPublic(question: Question): PublicQuestion {
  return {
    id: question.id,
    section: question.section,
    category: question.category,
    number: question.number,
    questionType: question.questionType,
    choices: question.choices,
    choiceItems: question.choiceItems,
    prompt: question.prompt,
    table: question.table,
    hasImage: question.hasImage,
    stem: question.stem,
    parseStatus: question.parseStatus,
    aiGenerated: question.aiGenerated,
  };
}

export function diagnosticQuestions() {
  const questions = loadQuestions();
  const picked: Question[] = [];
  for (const category of [...QUANT_CATEGORIES, ...VERBAL_CATEGORIES]) {
    const match = questions.find((question) => question.category === category);
    if (match) picked.push(match);
  }
  return picked;
}

export function isDiagnosticId(id: string) {
  return diagnosticQuestions().some((question) => question.id === id);
}

export function categoriesFor(section: Section) {
  return section === "quant" ? QUANT_CATEGORIES : VERBAL_CATEGORIES;
}
