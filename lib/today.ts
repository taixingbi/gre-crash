import { accountTier, getProfile, listAttempts, listGenerated, listPlans, listWrongs, savePlan } from "./data";
import { dateKey, daysBetween } from "./dates";
import { buildStudyPlan } from "./plan";
import { categoriesFor, loadQuestions, loadWriting } from "./questions";
import { courseDates, selectedPlanDate, studyDates } from "./study-day";
import type { Attempt, PlanItem, Profile, StudyPlan } from "./types";

export async function ensureTodayPlan(userId: string): Promise<StudyPlan | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;
  const tier = await accountTier(userId);
  const dates = tier === "admin" ? courseDates(profile.createdAt, profile.testDate) : studyDates(profile.createdAt);
  return ensurePlan(userId, profile, await selectedPlanDate(profile.createdAt, dates));
}

function questionIds(plan: StudyPlan) {
  return plan.items.flatMap((item) => (item.kind === "question" ? [item.questionId] : []));
}

function overlaps(left: StudyPlan, right: StudyPlan) {
  const ids = new Set(questionIds(left));
  return questionIds(right).some((id) => ids.has(id));
}

function workedOn(plan: StudyPlan, attempts: Attempt[]) {
  const ids = new Set(questionIds(plan));
  return attempts.some((attempt) => dateKey(attempt.createdAt) === plan.planDate && ids.has(attempt.questionId));
}

async function makePlan(userId: string, profile: Profile, planDate: string, blockedIds: string[], attempts: Attempt[]) {
  const tier = await accountTier(userId);
  const writing = loadWriting();
  const dayIndex = Math.max(1, daysBetween(dateKey(profile.createdAt), planDate) + 1);
  const writingDay = ((dayIndex - 1) % 10) + 1;
  const prompt = writing.prompts.find((item) => item.day === writingDay) ?? writing.prompts[0];
  return buildStudyPlan({
    userId,
    planDate,
    tier,
    profile,
    questions: [...loadQuestions(), ...(await listGenerated(userId))],
    attempts,
    wrongs: await listWrongs(userId),
    writingTitle: prompt ? `Day ${prompt.day} · ${prompt.theme}` : "Issue essay",
    blockedIds,
  });
}

async function createPlan(userId: string, profile: Profile, planDate: string, blockedIds: string[], attempts: Attempt[]) {
  const plan = await makePlan(userId, profile, planDate, blockedIds, attempts);
  await savePlan(plan);
  return plan;
}

async function repairCopies(userId: string, profile: Profile, plans: StudyPlan[], attempts: Attempt[]) {
  const current = [...plans].sort((a, b) => a.planDate.localeCompare(b.planDate));
  for (let index = 0; index < current.length; index += 1) {
    const plan = current[index];
    const earlier = current.slice(0, index).find((other) => overlaps(plan, other));
    if (!earlier) continue;
    const target = !workedOn(plan, attempts) ? plan : !workedOn(earlier, attempts) ? earlier : null;
    if (!target) continue;
    const blocked = current.flatMap((other) => (other.planDate === target.planDate ? [] : questionIds(other)));
    const rebuilt = await makePlan(userId, profile, target.planDate, blocked, attempts);
    const before = questionIds(target).slice().sort().join("\n");
    const after = questionIds(rebuilt).slice().sort().join("\n");
    if (before === after) continue;
    await savePlan(rebuilt);
    const slot = current.findIndex((item) => item.planDate === target.planDate);
    current[slot] = rebuilt;
  }
  return current;
}

function categoryRank(item: Extract<PlanItem, { kind: "question" }>) {
  const categories = categoriesFor(item.section);
  const at = categories.indexOf(item.category);
  return (item.section === "quant" ? 0 : 100) + (at < 0 ? categories.length : at);
}

// A saved plan keeps a question in the slot it was given. If that question has since moved to another
// section or category, put it with the questions of its current category instead of leaving it at the top.
function groupByCategory(items: PlanItem[]) {
  const writing = items.filter((item) => item.kind === "writing");
  const questions = items.flatMap((item, index) => (item.kind === "question" ? [{ item, index }] : []));
  questions.sort((a, b) => categoryRank(a.item) - categoryRank(b.item) || a.index - b.index);
  return [...questions.map((entry) => entry.item), ...writing];
}

// Saved plans can name questions that have since left the bank; drop those so the sidebar never links to a 404.
async function applyLiveQuestions(userId: string, plan: StudyPlan): Promise<StudyPlan> {
  const byId = new Map([...loadQuestions(), ...(await listGenerated(userId))].map((question) => [question.id, question]));
  const items = plan.items.flatMap((item): PlanItem[] => {
    if (item.kind !== "question") return [item];
    const live = byId.get(item.questionId);
    if (!live) return [];
    return [{ ...item, section: live.section, category: live.category }];
  });
  return { ...plan, items: groupByCategory(items) };
}

async function ensurePlan(userId: string, profile: Profile, planDate: string): Promise<StudyPlan> {
  const attempts = await listAttempts(userId);
  const plans = await repairCopies(userId, profile, await listPlans(userId), attempts);
  const existing = plans.find((plan) => plan.planDate === planDate);
  if (existing) return applyLiveQuestions(userId, existing);
  const blocked = plans.flatMap((plan) => questionIds(plan));
  return applyLiveQuestions(userId, await createPlan(userId, profile, planDate, blocked, attempts));
}
