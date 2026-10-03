import { cookies } from "next/headers";
import { localDb } from "./local-db";
import { remoteDb } from "./remote-db";
import { supabaseConfig } from "./supabase";
import type { Attempt, ErrorTag, EssayRubric, Profile, Question, StudyPlan, Subscription, User } from "./types";

export const SESSION_COOKIE = "gre_session";

function remote() {
  return Boolean(supabaseConfig());
}

async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  if (remote()) return remoteDb.currentUser();
  return localDb.userBySession(await sessionToken());
}

export async function signUp(email: string, password: string) {
  if (remote()) return remoteDb.signUp(email, password);
  const result = localDb.signUp(email, password);
  if ("token" in result && result.token) await setSessionCookie(result.token);
  return result;
}

export async function signIn(email: string, password: string) {
  if (remote()) return remoteDb.signIn(email, password);
  const result = localDb.signIn(email, password);
  if ("token" in result && result.token) await setSessionCookie(result.token);
  return result;
}

export async function signOut() {
  if (remote()) {
    await remoteDb.signOut();
    return;
  }
  localDb.signOut(await sessionToken());
  await clearSessionCookie();
}

export async function getProfile(userId: string) {
  return remote() ? remoteDb.getProfile(userId) : localDb.getProfile(userId);
}

export async function saveProfile(profile: Profile) {
  return remote() ? remoteDb.saveProfile(profile) : localDb.saveProfile(profile);
}

export async function listAttempts(userId: string): Promise<Attempt[]> {
  return remote() ? remoteDb.attempts(userId) : localDb.attempts(userId);
}

export async function addAttempt(attempt: Attempt) {
  return remote() ? remoteDb.addAttempt(attempt) : localDb.addAttempt(attempt);
}

export async function listBookmarks(userId: string) {
  return remote() ? remoteDb.bookmarks(userId) : localDb.bookmarks(userId);
}

export async function toggleBookmark(userId: string, questionId: string) {
  return remote() ? remoteDb.toggleBookmark(userId, questionId) : localDb.toggleBookmark(userId, questionId);
}

export async function listWrongs(userId: string) {
  return remote() ? remoteDb.wrongs(userId) : localDb.wrongs(userId);
}

export async function tagWrong(userId: string, questionId: string, tag: ErrorTag) {
  return remote() ? remoteDb.tagWrong(userId, questionId, tag) : localDb.tagWrong(userId, questionId, tag);
}

export async function getPlan(userId: string, planDate: string) {
  return remote() ? remoteDb.getPlan(userId, planDate) : localDb.getPlan(userId, planDate);
}

export async function savePlan(plan: StudyPlan) {
  return remote() ? remoteDb.savePlan(plan) : localDb.savePlan(plan);
}

export async function addWriting(userId: string, day: number, essay: string, rubric: EssayRubric) {
  return remote() ? remoteDb.addWriting(userId, day, essay, rubric) : localDb.addWriting(userId, day, essay, rubric);
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  return remote() ? remoteDb.subscription(userId) : localDb.subscription(userId);
}

export async function setSubscription(subscription: Subscription) {
  return remote() ? remoteDb.setSubscription(subscription) : localDb.setSubscription(subscription);
}

export async function cacheGet(key: string) {
  return remote() ? remoteDb.cacheGet(key) : localDb.cacheGet(key);
}

export async function cacheSet(key: string, content: string) {
  return remote() ? remoteDb.cacheSet(key, content) : localDb.cacheSet(key, content);
}

export async function listGenerated(userId: string): Promise<Question[]> {
  return remote() ? remoteDb.generated(userId) : localDb.generated(userId);
}

export async function addGenerated(userId: string, question: Question) {
  return remote() ? remoteDb.addGenerated(userId, question) : localDb.addGenerated(userId, question);
}

export function usingSupabase() {
  return remote();
}
