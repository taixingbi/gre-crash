"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { hasFullAccess, FREE_DAILY_LIMIT } from "./access";
import { aiConfigured, essayTutorReply, explainQuestion, gradeEssay, similarQuestion, tutorReply } from "./ai";
import {
  addAttempt,
  addGenerated,
  accountTier,
  addWriting,
  deleteWriting,
  getWriting,
  updateWriting,
  currentUser,
  getProfile,
  listAttempts,
  listGenerated,
  saveProfile,
  setSubscription,
  signIn,
  signOut,
  signUp,
  tagWrong,
  toggleBookmark,
} from "./data";
import { dateKey, todayKey } from "./dates";
import { courseDates, studyDates } from "./study-day";
import { findQuestion, isDiagnosticId, loadWriting } from "./questions";
import type { ErrorTag, EssayRubric, Profile, RubricScore } from "./types";

export type ActionState = { error?: string; message?: string; rubric?: EssayRubric };

function numberOrNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function signUpAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@") || password.length < 6) {
    return { error: "Use a real email and a password of at least 6 characters." };
  }
  const result = await signUp(email, password);
  if ("error" in result && result.error) return { error: result.error };
  redirect("/onboarding");
}

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const result = await signIn(email, password);
  if ("error" in result && result.error) return { error: result.error };
  const user = await currentUser();
  const profile = user ? await getProfile(user.id) : null;
  redirect(profile ? "/today" : "/onboarding");
}

export async function signOutAction() {
  await signOut();
  redirect("/");
}

export async function selectStudyDayAction(planDate: string) {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) return;
  const tier = await accountTier(user.id);
  const dates = tier === "admin" ? courseDates(profile.createdAt, profile.testDate) : studyDates(profile.createdAt);
  const allowed = dates.some((item) => item.planDate === planDate);
  if (!allowed) return;
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  const jar = await cookies();
  jar.set("gre-plan-date", planDate, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: proto === "https",
    maxAge: 60 * 60 * 24 * 40,
  });
  revalidatePath("/", "layout");
}

export async function saveProfileAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const existing = await getProfile(user.id);
  const hours = numberOrNull(formData.get("hours"));
  if (!hours || hours < 0.5 || hours > 8) return { error: "Hours per day should be between 0.5 and 8." };
  const quant = numberOrNull(formData.get("quant"));
  const verbal = numberOrNull(formData.get("verbal"));
  const target = numberOrNull(formData.get("target"));
  if (quant !== null && (quant < 130 || quant > 170)) return { error: "Quant scores run from 130 to 170." };
  if (verbal !== null && (verbal < 130 || verbal > 170)) return { error: "Verbal scores run from 130 to 170." };
  if (target !== null && (target < 260 || target > 340)) return { error: "Target total scores run from 260 to 340." };
  const weak = String(formData.get("weak") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const profile: Profile = {
    userId: user.id,
    testDate: String(formData.get("testDate") ?? "").trim() || null,
    currentQuant: quant,
    currentVerbal: verbal,
    targetScore: target,
    hoursPerDay: hours,
    weakAreas: existing?.weakAreas?.length ? existing.weakAreas : weak,
    diagnosticDone: existing?.diagnosticDone ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await saveProfile(profile);
  redirect("/onboarding?saved=1");
}

export async function skipProfileAction() {
  const user = await requireUser();
  const existing = await getProfile(user.id);
  if (!existing) {
    await saveProfile({
      userId: user.id,
      testDate: null,
      currentQuant: null,
      currentVerbal: null,
      targetScore: null,
      hoursPerDay: 2,
      weakAreas: [],
      diagnosticDone: false,
      createdAt: new Date().toISOString(),
    });
  }
  redirect("/today");
}

function normalizeSelection(selected: string) {
  const letters = selected.toUpperCase().match(/[A-I]/g);
  if (letters && letters.length === selected.replace(/[^a-z0-9-]/gi, "").length) {
    return [...new Set(letters)].sort().join("");
  }
  return selected.trim();
}

export async function submitAnswerAction(input: { questionId: string; selected: string; seconds: number }) {
  const user = await requireUser();
  const generated = await listGenerated(user.id);
  const question = findQuestion(input.questionId, generated);
  if (!question) return { error: "That question is not in the bank." };
  const tier = await accountTier(user.id);
  if (tier === "free" && !isDiagnosticId(question.id)) {
    const today = todayKey();
    const used = (await listAttempts(user.id)).filter(
      (attempt) => dateKey(attempt.createdAt) === today && !isDiagnosticId(attempt.questionId),
    ).length;
    if (used >= FREE_DAILY_LIMIT) {
      return { error: "The free plan includes 5 bank questions a day. The 30-day pass opens the full bank." };
    }
  }
  const selected = question.questionType === "numeric" ? input.selected.trim() : normalizeSelection(input.selected);
  const expected = question.questionType === "numeric" ? question.answer.trim() : normalizeSelection(question.answer);
  const correct = selected.length > 0 && selected === expected;
  await addAttempt({
    id: randomUUID(),
    userId: user.id,
    questionId: question.id,
    section: question.section,
    category: question.category,
    selected,
    correct,
    seconds: Math.max(1, Math.round(input.seconds)),
    createdAt: new Date().toISOString(),
  });
  return { correct, answer: question.answer };
}

export async function tagWrongAction(questionId: string, tag: ErrorTag) {
  const user = await requireUser();
  await tagWrong(user.id, questionId, tag);
}

export async function retagWrongAction(formData: FormData) {
  const user = await requireUser();
  const questionId = String(formData.get("questionId") ?? "");
  const tag = String(formData.get("tag") ?? "") as ErrorTag;
  const allowed: ErrorTag[] = ["concept", "careless", "vocabulary", "logic", "time"];
  if (!questionId || !allowed.includes(tag)) return;
  await tagWrong(user.id, questionId, tag);
}

export async function toggleBookmarkAction(questionId: string) {
  const user = await requireUser();
  return toggleBookmark(user.id, questionId);
}

export async function askAiAction(input: {
  questionId: string;
  kind: "why_correct" | "why_wrong" | "faster" | "zh" | "similar" | "translate" | "choices" | "logic" | "why_fit" | "eliminate";
  selected: string;
}) {
  const user = await requireUser();
  if (!aiConfigured()) return { error: "Nova Pro is not configured on this server." };
  const question = findQuestion(input.questionId, await listGenerated(user.id));
  if (!question) return { error: "That question is not in the bank." };
  if (input.kind === "similar") {
    const created = await similarQuestion(question, user.id);
    await addGenerated(user.id, created);
    return { text: "A similar question is ready.", href: `/practice/${created.id}` };
  }
  const text = await explainQuestion(question, input.selected, input.kind);
  return { text };
}

export async function askTutorAction(input: {
  questionId: string;
  selected: string;
  turns: { role: "user" | "assistant"; content: string }[];
  message: string;
}) {
  const user = await requireUser();
  if (!aiConfigured()) return { error: "Nova Pro is not configured on this server." };
  const message = input.message.trim();
  if (!message) return { error: "Type a question first." };
  const question = findQuestion(input.questionId, await listGenerated(user.id));
  if (!question) return { error: "That question is not in the bank." };
  const turns = (input.turns || [])
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .slice(-8);
  const text = await tutorReply(question, input.selected, turns, message);
  return { text };
}

export async function askEssayTutorAction(input: {
  prompt: string;
  task: string;
  draft: string;
  turns: { role: "user" | "assistant"; content: string }[];
  message: string;
}) {
  const user = await requireUser();
  const tier = await accountTier(user.id);
  if (!hasFullAccess(tier)) return { error: "Writing AI is part of the 90-day pass." };
  if (!aiConfigured()) return { error: "Nova Pro is not configured on this server." };
  const message = input.message.trim();
  if (!message) return { error: "Type a question first." };
  const turns = (input.turns || [])
    .filter((turn) => (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string")
    .slice(-8);
  const text = await essayTutorReply({
    prompt: String(input.prompt ?? "").slice(0, 2000),
    task: String(input.task ?? "").slice(0, 1000),
    draft: String(input.draft ?? "").slice(0, 6000),
    turns,
    message: message.slice(0, 800),
  });
  return { text };
}

const passes = {
  pass_30: { days: 30, amount: 999, name: "GRE Crash Prep · 30 days" },
  pass_90: { days: 90, amount: 1999, name: "GRE Crash Prep · 90 days" },
} as const;

function stripeClient() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const publishable = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!secret || !publishable) return null;
  return { stripe: new Stripe(secret), publishable };
}

async function requestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "127.0.0.1:3210";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function startCheckoutAction(plan: "pass_30" | "pass_90") {
  const user = await requireUser();
  const billing = stripeClient();
  if (!billing) return { error: "Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY before taking a card." };
  const offer = passes[plan];
  const origin = await requestOrigin();
  const session = await billing.stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    customer_email: user.email,
    return_url: `${origin}/pay?session_id={CHECKOUT_SESSION_ID}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: offer.amount,
          product_data: { name: offer.name },
        },
      },
    ],
    metadata: { userId: user.id, plan },
  });
  if (!session.client_secret) return { error: "Stripe did not return a card form." };
  return { clientSecret: session.client_secret, publishableKey: billing.publishable };
}

export async function fulfillCheckoutSession(sessionId: string) {
  const user = await requireUser();
  const billing = stripeClient();
  if (!billing) return { error: "Stripe is not configured." };
  if (!sessionId.startsWith("cs_")) return { error: "That payment session is not valid." };
  const session = await billing.stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.userId !== user.id) return { error: "This payment belongs to another account." };
  const plan = session.metadata?.plan;
  if (plan !== "pass_30" && plan !== "pass_90") return { error: "This payment has no pass attached." };
  if (session.payment_status !== "paid") return { error: "The card payment is not complete yet." };
  await setSubscription({
    userId: user.id,
    plan,
    accessUntil: new Date(Date.now() + passes[plan].days * 86_400_000).toISOString(),
    stripeSessionId: session.id,
  });
  return { plan };
}

export async function finishDiagnosticAction() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const attempts = await listAttempts(user.id);
  const diagnostic = attempts.filter((attempt) => isDiagnosticId(attempt.questionId));
  const byCategory = new Map<string, { correct: number; total: number }>();
  for (const attempt of diagnostic) {
    const bucket = byCategory.get(attempt.category) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (attempt.correct) bucket.correct += 1;
    byCategory.set(attempt.category, bucket);
  }
  const weakAreas = [...byCategory.entries()]
    .filter(([, bucket]) => bucket.total > 0 && bucket.correct / bucket.total < 0.6)
    .map(([category]) => category);
  await saveProfile({ ...profile, weakAreas, diagnosticDone: true });
  redirect("/today");
}

const rubricScores = new Set<RubricScore>(["Good", "Needs work", "Weak"]);

function rubricText(rubric: EssayRubric) {
  return `Thesis: ${rubric.thesis}\nOrganization: ${rubric.organization}\nEvidence: ${rubric.evidence}\nCounterargument: ${rubric.counterargument}\n\n${rubric.advice}`;
}

function rubricFromForm(value: FormDataEntryValue | null): EssayRubric | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  try {
    const parsed = JSON.parse(text) as Partial<EssayRubric>;
    if (!rubricScores.has(parsed.thesis as RubricScore)) return undefined;
    if (!rubricScores.has(parsed.organization as RubricScore)) return undefined;
    if (!rubricScores.has(parsed.evidence as RubricScore)) return undefined;
    if (!rubricScores.has(parsed.counterargument as RubricScore)) return undefined;
    return {
      thesis: parsed.thesis as RubricScore,
      organization: parsed.organization as RubricScore,
      evidence: parsed.evidence as RubricScore,
      counterargument: parsed.counterargument as RubricScore,
      advice: typeof parsed.advice === "string" ? parsed.advice : "",
    };
  } catch {
    return undefined;
  }
}

export async function scoreEssayAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const tier = await accountTier(user.id);
  if (!hasFullAccess(tier)) return { error: "Writing AI is part of the 90-day pass." };
  if (!aiConfigured()) return { error: "Nova Pro is not configured on this server." };
  const id = String(formData.get("id") ?? "");
  let essay = String(formData.get("essay") ?? "").trim();
  let day = Number(formData.get("day") ?? 1);
  const existing = id ? await getWriting(user.id, id) : null;
  if (id && (!existing || existing.userId !== user.id)) return { error: "That essay is no longer saved." };
  if (existing) {
    if (!essay) essay = existing.essay;
    day = existing.day;
  }
  if (!essay) return { error: "Write something before scoring." };
  const prompt = String(formData.get("prompt") ?? "").trim() || loadWriting().prompts.find((item) => item.day === day)?.prompt || "";
  const rubric = await gradeEssay(prompt, essay);
  if (existing) {
    await updateWriting({ ...existing, essay, rubric });
    revalidatePath("/writing");
  }
  return { message: rubricText(rubric), rubric };
}

export async function saveEssayAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const essay = String(formData.get("essay") ?? "").trim();
  if (!essay) return { error: "Write something before saving." };
  const day = Number(formData.get("day") ?? 1);
  await addWriting(user.id, day, essay, rubricFromForm(formData.get("rubric")));
  revalidatePath("/writing");
  return { message: "Saved to history." };
}

export async function updateEssayAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const essay = String(formData.get("essay") ?? "").trim();
  if (!essay) return { error: "Write something before saving." };
  const existing = await getWriting(user.id, id);
  if (!existing || existing.userId !== user.id) return { error: "That essay is no longer saved." };
  await updateWriting({ ...existing, essay });
  revalidatePath("/writing");
  return { message: "Saved." };
}

export async function deleteEssayAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const existing = await getWriting(user.id, id);
  if (existing && existing.userId === user.id) await deleteWriting(user.id, id);
  revalidatePath("/writing");
}
