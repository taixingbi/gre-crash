import { randomUUID } from "crypto";
import { createSupabaseAdmin, createSupabaseServer } from "./supabase";
import type {
  Attempt,
  ErrorTag,
  EssayRubric,
  Profile,
  Question,
  StudyPlan,
  Subscription,
  WritingSubmission,
  WrongQuestion,
} from "./types";

async function client() {
  const supabase = await createSupabaseServer();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function profileFromRow(row: Record<string, unknown>): Profile {
  return {
    userId: String(row.id),
    testDate: (row.test_date as string | null) ?? null,
    currentQuant: (row.current_quant as number | null) ?? null,
    currentVerbal: (row.current_verbal as number | null) ?? null,
    targetScore: (row.target_score as number | null) ?? null,
    hoursPerDay: Number(row.hours_per_day ?? 2),
    weakAreas: (row.weak_areas as string[]) ?? [],
    diagnosticDone: Boolean(row.diagnostic_done),
    createdAt: String(row.created_at),
  };
}

export const remoteDb = {
  async currentUser() {
    const supabase = await client();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    return { id: data.user.id, email: data.user.email };
  },
  async signUp(email: string, password: string) {
    const supabase = await client();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    return { error: undefined };
  },
  async signIn(email: string, password: string) {
    const supabase = await client();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: undefined };
  },
  async signOut() {
    const supabase = await client();
    await supabase.auth.signOut();
  },
  async getProfile(userId: string) {
    const supabase = await client();
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    return data ? profileFromRow(data) : null;
  },
  async saveProfile(profile: Profile) {
    const supabase = await client();
    const { error } = await supabase.from("profiles").upsert({
      id: profile.userId,
      test_date: profile.testDate,
      current_quant: profile.currentQuant,
      current_verbal: profile.currentVerbal,
      target_score: profile.targetScore,
      hours_per_day: profile.hoursPerDay,
      weak_areas: profile.weakAreas,
      diagnostic_done: profile.diagnosticDone,
      created_at: profile.createdAt,
    });
    if (error) throw new Error(error.message);
  },
  async attempts(userId: string) {
    const supabase = await client();
    const { data, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(
      (row): Attempt => ({
        id: row.id,
        userId: row.user_id,
        questionId: row.question_id,
        section: row.section,
        category: row.category,
        selected: row.selected,
        correct: row.correct,
        seconds: row.seconds,
        createdAt: row.created_at,
      }),
    );
  },
  async addAttempt(attempt: Attempt) {
    const supabase = await client();
    const { error } = await supabase.from("attempts").insert({
      id: attempt.id,
      user_id: attempt.userId,
      question_id: attempt.questionId,
      section: attempt.section,
      category: attempt.category,
      selected: attempt.selected,
      correct: attempt.correct,
      seconds: attempt.seconds,
      created_at: attempt.createdAt,
    });
    if (error) throw new Error(error.message);
    if (attempt.correct) {
      await supabase
        .from("wrong_questions")
        .update({ resolved_at: attempt.createdAt })
        .eq("user_id", attempt.userId)
        .eq("question_id", attempt.questionId)
        .is("resolved_at", null);
    }
  },
  async bookmarks(userId: string) {
    const supabase = await client();
    const { data, error } = await supabase.from("bookmarks").select("question_id").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.question_id as string);
  },
  async toggleBookmark(userId: string, questionId: string) {
    const supabase = await client();
    const { data } = await supabase
      .from("bookmarks")
      .select("question_id")
      .eq("user_id", userId)
      .eq("question_id", questionId)
      .maybeSingle();
    if (data) {
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("question_id", questionId);
      return false;
    }
    const { error } = await supabase.from("bookmarks").insert({ user_id: userId, question_id: questionId });
    if (error) throw new Error(error.message);
    return true;
  },
  async wrongs(userId: string) {
    const supabase = await client();
    const { data, error } = await supabase.from("wrong_questions").select("*").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(
      (row): WrongQuestion => ({
        userId: row.user_id,
        questionId: row.question_id,
        tag: row.tag,
        resolvedAt: row.resolved_at,
      }),
    );
  },
  async tagWrong(userId: string, questionId: string, tag: ErrorTag) {
    const supabase = await client();
    const { error } = await supabase.from("wrong_questions").upsert({
      user_id: userId,
      question_id: questionId,
      tag,
      resolved_at: null,
    });
    if (error) throw new Error(error.message);
  },
  async getPlan(userId: string, planDate: string) {
    const supabase = await client();
    const { data } = await supabase
      .from("study_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", planDate)
      .maybeSingle();
    if (!data) return null;
    return {
      userId: data.user_id,
      planDate: data.plan_date,
      mode: data.mode,
      label: data.label,
      minutes: data.minutes,
      items: data.items,
    } as StudyPlan;
  },
  async savePlan(plan: StudyPlan) {
    const supabase = await client();
    const { error } = await supabase.from("study_plans").upsert({
      user_id: plan.userId,
      plan_date: plan.planDate,
      mode: plan.mode,
      label: plan.label,
      minutes: plan.minutes,
      items: plan.items,
    });
    if (error) throw new Error(error.message);
  },
  async addWriting(userId: string, day: number, essay: string, rubric: EssayRubric) {
    const supabase = await client();
    const submission: WritingSubmission = {
      id: randomUUID(),
      userId,
      day,
      essay,
      rubric,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from("writing_submissions").insert({
      id: submission.id,
      user_id: userId,
      day,
      essay,
      rubric,
      created_at: submission.createdAt,
    });
    if (error) throw new Error(error.message);
    return submission;
  },
  async subscription(userId: string) {
    const supabase = await client();
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
    if (!data) return null;
    return {
      userId: data.user_id,
      plan: data.plan,
      accessUntil: data.access_until,
      stripeSessionId: data.stripe_session_id,
    } as Subscription;
  },
  async setSubscription(subscription: Subscription) {
    const admin = createSupabaseAdmin();
    if (!admin) throw new Error("SUPABASE_SECRET_KEY is required to record a payment.");
    const { error } = await admin.from("subscriptions").upsert({
      user_id: subscription.userId,
      plan: subscription.plan,
      access_until: subscription.accessUntil,
      stripe_session_id: subscription.stripeSessionId,
    });
    if (error) throw new Error(error.message);
  },
  async cacheGet(key: string) {
    const supabase = await client();
    const { data } = await supabase.from("ai_caches").select("content").eq("cache_key", key).maybeSingle();
    return (data?.content as string | undefined) ?? null;
  },
  async cacheSet(key: string, content: string) {
    const supabase = await client();
    await supabase.from("ai_caches").upsert({ cache_key: key, content });
  },
  async generated(userId: string) {
    const supabase = await client();
    const { data, error } = await supabase.from("generated_questions").select("payload").eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.payload as Question);
  },
  async addGenerated(userId: string, question: Question) {
    const supabase = await client();
    const { error } = await supabase.from("generated_questions").insert({
      id: question.id,
      user_id: userId,
      payload: question,
    });
    if (error) throw new Error(error.message);
  },
};
