import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { hashPassword, verifyPassword } from "./passwords";
import type {
  Attempt,
  ErrorTag,
  EssayRubric,
  Profile,
  Question,
  Role,
  StudyPlan,
  Subscription,
  User,
  WritingSubmission,
  WrongQuestion,
} from "./types";

type LocalUser = User & { passwordHash: string };

export function adminAccount() {
  return {
    name: (process.env.ADMIN_NAME || "taixingbi").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "123456",
  };
}

type Database = {
  users: LocalUser[];
  sessions: { token: string; userId: string }[];
  profiles: Profile[];
  attempts: Attempt[];
  bookmarks: { userId: string; questionId: string }[];
  wrongs: WrongQuestion[];
  plans: StudyPlan[];
  writings: WritingSubmission[];
  subscriptions: Subscription[];
  cache: { key: string; content: string }[];
  generated: Question[];
};

const file = path.join(process.cwd(), ".data", "db.json");

function empty(): Database {
  return {
    users: [],
    sessions: [],
    profiles: [],
    attempts: [],
    bookmarks: [],
    wrongs: [],
    plans: [],
    writings: [],
    subscriptions: [],
    cache: [],
    generated: [],
  };
}

function load(): Database {
  let db: Database;
  try {
    db = { ...empty(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    db = empty();
  }
  const admin = adminAccount();
  if (!db.users.some((user) => user.email === admin.name)) {
    const user: LocalUser = {
      id: "admin",
      email: admin.name,
      role: "admin",
      passwordHash: hashPassword(admin.password),
    };
    db.users.push(user);
    if (!db.profiles.some((profile) => profile.userId === user.id)) {
      db.profiles.push({
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
    save(db);
  }
  return db;
}

function publicUser(user: LocalUser): User {
  return { id: user.id, email: user.email, role: user.role === "admin" ? "admin" : "user" };
}

function save(db: Database) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

export const localDb = {
  userBySession(token: string | undefined): User | null {
    if (!token) return null;
    const db = load();
    const session = db.sessions.find((item) => item.token === token);
    const user = db.users.find((item) => item.id === session?.userId);
    return user ? publicUser(user) : null;
  },
  userById(userId: string): User | null {
    const user = load().users.find((item) => item.id === userId);
    return user ? publicUser(user) : null;
  },
  signUp(email: string, password: string) {
    const db = load();
    const normalized = email.trim().toLowerCase();
    if (db.users.some((user) => user.email === normalized)) {
      return { error: "An account with that email already exists." };
    }
    const user: LocalUser = { id: randomUUID(), email: normalized, role: "user" satisfies Role, passwordHash: hashPassword(password) };
    const token = randomUUID();
    db.users.push(user);
    db.sessions.push({ token, userId: user.id });
    save(db);
    return { token, user: publicUser(user) };
  },
  signIn(email: string, password: string) {
    const db = load();
    const user = db.users.find((item) => item.email === email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return { error: "Username or password is wrong." };
    }
    const token = randomUUID();
    db.sessions.push({ token, userId: user.id });
    save(db);
    return { token, user: publicUser(user) };
  },
  signOut(token: string | undefined) {
    if (!token) return;
    const db = load();
    db.sessions = db.sessions.filter((session) => session.token !== token);
    save(db);
  },
  getProfile(userId: string) {
    return load().profiles.find((profile) => profile.userId === userId) ?? null;
  },
  saveProfile(profile: Profile) {
    const db = load();
    const index = db.profiles.findIndex((item) => item.userId === profile.userId);
    if (index === -1) db.profiles.push(profile);
    else db.profiles[index] = profile;
    save(db);
  },
  attempts(userId: string) {
    return load().attempts.filter((attempt) => attempt.userId === userId);
  },
  addAttempt(attempt: Attempt) {
    const db = load();
    db.attempts.push(attempt);
    if (attempt.correct) {
      db.wrongs = db.wrongs.map((wrong) =>
        wrong.userId === attempt.userId && wrong.questionId === attempt.questionId
          ? { ...wrong, resolvedAt: wrong.resolvedAt ?? attempt.createdAt }
          : wrong,
      );
    }
    save(db);
  },
  bookmarks(userId: string) {
    return load().bookmarks.filter((item) => item.userId === userId).map((item) => item.questionId);
  },
  toggleBookmark(userId: string, questionId: string) {
    const db = load();
    const exists = db.bookmarks.some((item) => item.userId === userId && item.questionId === questionId);
    db.bookmarks = exists
      ? db.bookmarks.filter((item) => !(item.userId === userId && item.questionId === questionId))
      : [...db.bookmarks, { userId, questionId }];
    save(db);
    return !exists;
  },
  wrongs(userId: string) {
    return load().wrongs.filter((wrong) => wrong.userId === userId);
  },
  tagWrong(userId: string, questionId: string, tag: ErrorTag) {
    const db = load();
    const index = db.wrongs.findIndex((wrong) => wrong.userId === userId && wrong.questionId === questionId);
    const next: WrongQuestion = { userId, questionId, tag, resolvedAt: null };
    if (index === -1) db.wrongs.push(next);
    else db.wrongs[index] = { ...db.wrongs[index], tag, resolvedAt: db.wrongs[index].resolvedAt };
    save(db);
  },
  getPlan(userId: string, planDate: string) {
    return load().plans.find((plan) => plan.userId === userId && plan.planDate === planDate) ?? null;
  },
  savePlan(plan: StudyPlan) {
    const db = load();
    const index = db.plans.findIndex((item) => item.userId === plan.userId && item.planDate === plan.planDate);
    if (index === -1) db.plans.push(plan);
    else db.plans[index] = plan;
    save(db);
  },
  writings(userId: string) {
    return load().writings.filter((item) => item.userId === userId);
  },
  addWriting(userId: string, day: number, essay: string, rubric: EssayRubric) {
    const db = load();
    const submission: WritingSubmission = {
      id: randomUUID(),
      userId,
      day,
      essay,
      rubric,
      createdAt: new Date().toISOString(),
    };
    db.writings.push(submission);
    save(db);
    return submission;
  },
  subscription(userId: string) {
    return load().subscriptions.find((item) => item.userId === userId) ?? null;
  },
  setSubscription(subscription: Subscription) {
    const db = load();
    const index = db.subscriptions.findIndex((item) => item.userId === subscription.userId);
    if (index === -1) db.subscriptions.push(subscription);
    else db.subscriptions[index] = subscription;
    save(db);
  },
  cacheGet(key: string) {
    return load().cache.find((item) => item.key === key)?.content ?? null;
  },
  cacheSet(key: string, content: string) {
    const db = load();
    const index = db.cache.findIndex((item) => item.key === key);
    if (index === -1) db.cache.push({ key, content });
    else db.cache[index] = { key, content };
    save(db);
  },
  generated(userId: string) {
    return load().generated.flatMap((question) => {
      const row = question as Question & { userId?: string };
      if (row.userId !== userId) return [];
      const { userId: owner, ...rest } = row;
      void owner;
      return [rest];
    });
  },
  addGenerated(userId: string, question: Question) {
    const db = load();
    db.generated.push({ ...question, userId } as Question & { userId: string });
    save(db);
  },
};
