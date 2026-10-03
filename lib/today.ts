import { tierFromSubscription } from "./access";
import { getPlan, getProfile, getSubscription, listAttempts, listGenerated, listWrongs, savePlan } from "./data";
import { dateKey, daysBetween, todayKey } from "./dates";
import { buildStudyPlan } from "./plan";
import { loadQuestions, loadWriting } from "./questions";
import type { StudyPlan } from "./types";

export async function ensureTodayPlan(userId: string): Promise<StudyPlan | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;
  const planDate = todayKey();
  const existing = await getPlan(userId, planDate);
  if (existing) return existing;
  const tier = tierFromSubscription(await getSubscription(userId));
  const writing = loadWriting();
  const dayIndex = Math.max(1, daysBetween(dateKey(profile.createdAt), planDate) + 1);
  const writingDay = ((dayIndex - 1) % 10) + 1;
  const prompt = writing.prompts.find((item) => item.day === writingDay) ?? writing.prompts[0];
  const plan = buildStudyPlan({
    userId,
    planDate,
    tier,
    profile,
    questions: [...loadQuestions(), ...(await listGenerated(userId))],
    attempts: await listAttempts(userId),
    wrongs: await listWrongs(userId),
    writingTitle: prompt ? `Day ${prompt.day} · ${prompt.theme}` : "Issue essay",
  });
  await savePlan(plan);
  return plan;
}
