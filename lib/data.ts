import { cookies, headers } from "next/headers";
import { resolveTier } from "./access";
import { dynamoDb } from "./dynamo-db";
import { localDb } from "./local-db";
import type { Attempt, ErrorTag, EssayRubric, Profile, Question, StudyPlan, Subscription, Tier, User, WritingSubmission } from "./types";

export const SESSION_COOKIE = "gre_session";

function remote() {
  return Boolean(process.env.TABLE_NAME);
}

async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const proto = (await headers()).get("x-forwarded-proto")?.split(",")[0]?.trim();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: proto === "https",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const token = await sessionToken();
  return remote() ? dynamoDb.userBySession(token) : localDb.userBySession(token);
}

export async function getUser(userId: string): Promise<User | null> {
  return remote() ? dynamoDb.userById(userId) : localDb.userById(userId);
}

export async function accountTier(userId: string): Promise<Tier> {
  const user = await getUser(userId);
  return resolveTier(user?.role, await getSubscription(userId));
}

export async function signUp(email: string, password: string) {
  const result = remote() ? await dynamoDb.signUp(email, password) : localDb.signUp(email, password);
  if ("token" in result && result.token) await setSessionCookie(result.token);
  return result;
}

export async function signIn(email: string, password: string) {
  const result = remote() ? await dynamoDb.signIn(email, password) : localDb.signIn(email, password);
  if ("token" in result && result.token) await setSessionCookie(result.token);
  return result;
}

export async function signOut() {
  const token = await sessionToken();
  if (remote()) await dynamoDb.signOut(token);
  else localDb.signOut(token);
  await clearSessionCookie();
}

export async function getProfile(userId: string) {
  return remote() ? dynamoDb.getProfile(userId) : localDb.getProfile(userId);
}

export async function saveProfile(profile: Profile) {
  return remote() ? dynamoDb.saveProfile(profile) : localDb.saveProfile(profile);
}

export async function listAttempts(userId: string): Promise<Attempt[]> {
  return remote() ? dynamoDb.attempts(userId) : localDb.attempts(userId);
}

export async function addAttempt(attempt: Attempt) {
  return remote() ? dynamoDb.addAttempt(attempt) : localDb.addAttempt(attempt);
}

export async function listBookmarks(userId: string) {
  return remote() ? dynamoDb.bookmarks(userId) : localDb.bookmarks(userId);
}

export async function toggleBookmark(userId: string, questionId: string) {
  return remote() ? dynamoDb.toggleBookmark(userId, questionId) : localDb.toggleBookmark(userId, questionId);
}

export async function listWrongs(userId: string) {
  return remote() ? dynamoDb.wrongs(userId) : localDb.wrongs(userId);
}

export async function tagWrong(userId: string, questionId: string, tag: ErrorTag) {
  return remote() ? dynamoDb.tagWrong(userId, questionId, tag) : localDb.tagWrong(userId, questionId, tag);
}

export async function getPlan(userId: string, planDate: string) {
  return remote() ? dynamoDb.getPlan(userId, planDate) : localDb.getPlan(userId, planDate);
}

export async function listPlans(userId: string) {
  return remote() ? dynamoDb.listPlans(userId) : localDb.listPlans(userId);
}

export async function savePlan(plan: StudyPlan) {
  return remote() ? dynamoDb.savePlan(plan) : localDb.savePlan(plan);
}

export async function addWriting(userId: string, day: number, essay: string, rubric?: EssayRubric) {
  return remote() ? dynamoDb.addWriting(userId, day, essay, rubric) : localDb.addWriting(userId, day, essay, rubric);
}

export async function listWritings(userId: string) {
  const rows = remote() ? await dynamoDb.listWritings(userId) : localDb.writings(userId);
  return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getWriting(userId: string, id: string) {
  return remote() ? dynamoDb.getWriting(userId, id) : localDb.getWriting(userId, id);
}

export async function updateWriting(submission: WritingSubmission) {
  return remote() ? dynamoDb.updateWriting(submission) : localDb.updateWriting(submission);
}

export async function deleteWriting(userId: string, id: string) {
  return remote() ? dynamoDb.deleteWriting(userId, id) : localDb.deleteWriting(userId, id);
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  return remote() ? dynamoDb.subscription(userId) : localDb.subscription(userId);
}

export async function setSubscription(subscription: Subscription) {
  return remote() ? dynamoDb.setSubscription(subscription) : localDb.setSubscription(subscription);
}

export async function cacheGet(key: string) {
  return remote() ? dynamoDb.cacheGet(key) : localDb.cacheGet(key);
}

export async function cacheSet(key: string, content: string) {
  return remote() ? dynamoDb.cacheSet(key, content) : localDb.cacheSet(key, content);
}

export async function listGenerated(userId: string): Promise<Question[]> {
  return remote() ? dynamoDb.generated(userId) : localDb.generated(userId);
}

export async function addGenerated(userId: string, question: Question) {
  return remote() ? dynamoDb.addGenerated(userId, question) : localDb.addGenerated(userId, question);
}

export function usingDynamo() {
  return remote();
}
