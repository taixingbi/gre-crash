import { dateKey, daysBetween } from "./dates";
import { categoriesFor } from "./questions";
import type { Attempt, PlanItem, Profile, Question, Section, StudyPlan, Tier, WrongQuestion } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function latestAttempts(attempts: Attempt[]) {
  const latest = new Map<string, Attempt>();
  const ordered = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const attempt of ordered) latest.set(attempt.questionId, attempt);
  return latest;
}

function quotas(section: Section, count: number, mode: "static" | "adaptive", dayIndex: number, attempts: Attempt[]) {
  const categories = categoriesFor(section);
  const weights = categories.map((category, index) => {
    if (mode === "static") {
      return { category, weight: index === (dayIndex - 1) % categories.length ? 3 : 1 };
    }
    const rows = attempts.filter((attempt) => attempt.section === section && attempt.category === category);
    if (rows.length < 3) return { category, weight: 1.25 };
    const accuracy = rows.filter((attempt) => attempt.correct).length / rows.length;
    return { category, weight: 0.45 + (1 - accuracy) };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  const assigned = weights.map((item) => ({
    category: item.category,
    count: Math.floor((item.weight / total) * count),
  }));
  let remaining = count - assigned.reduce((sum, item) => sum + item.count, 0);
  const order = [...weights].sort((a, b) => b.weight - a.weight);
  for (const item of order) {
    if (remaining <= 0) break;
    const slot = assigned.find((entry) => entry.category === item.category);
    if (!slot) continue;
    slot.count += 1;
    remaining -= 1;
  }
  return assigned;
}

function pickSection(
  section: Section,
  count: number,
  mode: "static" | "adaptive",
  dayIndex: number,
  questions: Question[],
  attempts: Attempt[],
  wrongs: WrongQuestion[],
) {
  const latest = latestAttempts(attempts);
  const seen = new Set(attempts.map((attempt) => attempt.questionId));
  const wrongsById = new Map(wrongs.filter((wrong) => !wrong.resolvedAt).map((wrong) => [wrong.questionId, wrong]));
  const chosen: Question[] = [];
  const used = new Set<string>();

  const take = (pool: Question[], needed: number) => {
    const ranked = pool
      .filter((question) => !used.has(question.id))
      .sort((a, b) => priority(a) - priority(b) || a.number - b.number);
    for (const question of ranked.slice(0, needed)) {
      chosen.push(question);
      used.add(question.id);
    }
  };

  const priority = (question: Question) => {
    const wrong = wrongsById.get(question.id);
    if (mode === "adaptive" && wrong && (wrong.tag === "concept" || wrong.tag === "logic")) return 0;
    if (!seen.has(question.id)) return 1;
    if (mode === "adaptive" && wrong) return 2;
    if (latest.get(question.id)?.correct === false) return 3;
    return 4;
  };

  for (const slot of quotas(section, count, mode, dayIndex, attempts)) {
    const before = chosen.length;
    take(
      questions.filter((question) => question.section === section && question.category === slot.category && !question.aiGenerated),
      slot.count,
    );
    if (chosen.length - before < slot.count) {
      take(
        questions.filter((question) => question.section === section && !question.aiGenerated),
        slot.count - (chosen.length - before),
      );
    }
  }
  return chosen;
}

export function buildStudyPlan(input: {
  userId: string;
  planDate: string;
  tier: Tier;
  profile: Profile;
  questions: Question[];
  attempts: Attempt[];
  wrongs: WrongQuestion[];
  writingTitle: string;
}): StudyPlan {
  const mode = input.tier === "pass_90" || input.tier === "admin" ? "adaptive" : "static";
  const dayIndex = Math.max(1, daysBetween(dateKey(input.profile.createdAt), input.planDate) + 1);
  const daysLeft = input.profile.testDate ? daysBetween(input.planDate, input.profile.testDate) : null;
  const writingDay = ((dayIndex - 1) % 10) + 1;
  const includeWriting = input.tier !== "free";
  const hours = input.profile.hoursPerDay || 2;

  let quantCount = 3;
  let verbalCount = 2;
  if (input.tier !== "free") {
    const writingMinutes = includeWriting && hours >= 1 ? 30 : 0;
    const budget = Math.max(30, hours * 60 - writingMinutes);
    const cap = hours >= 3 ? 20 : 15;
    quantCount = clamp(Math.round((budget * 0.55) / 1.5), 6, cap);
    verbalCount = clamp(Math.round((budget * 0.45) / 1.25), 6, cap);
  }

  const quant = pickSection("quant", quantCount, mode, dayIndex, input.questions, input.attempts, input.wrongs);
  const verbal = pickSection("verbal", verbalCount, mode, dayIndex, input.questions, input.attempts, input.wrongs);
  const items: PlanItem[] = [
    ...quant.map((question) => ({
      kind: "question" as const,
      questionId: question.id,
      section: question.section,
      category: question.category,
    })),
    ...verbal.map((question) => ({
      kind: "question" as const,
      questionId: question.id,
      section: question.section,
      category: question.category,
    })),
  ];
  if (includeWriting) {
    items.push({ kind: "writing", day: writingDay, title: input.writingTitle });
  }

  const minutes = Math.round(quant.length * 1.5 + verbal.length * 1.25 + (includeWriting ? 30 : 0));
  const label =
    daysLeft !== null && daysLeft >= 0 && daysLeft < 10
      ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} until the GRE`
      : mode === "static"
        ? `Day ${Math.min(dayIndex, 10)} of 10`
        : `Day ${dayIndex}`;

  return {
    userId: input.userId,
    planDate: input.planDate,
    mode,
    label,
    minutes,
    items,
  };
}
