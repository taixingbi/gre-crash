import { randomUUID } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { adminAccount } from "./local-db";
import { hashPassword, verifyPassword } from "./passwords";
import type {
  Attempt,
  ErrorTag,
  EssayRubric,
  Profile,
  Question,
  StudyPlan,
  Subscription,
  User,
  WritingSubmission,
  WrongQuestion,
} from "./types";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

function table() {
  const name = process.env.TABLE_NAME;
  if (!name) throw new Error("TABLE_NAME is not set.");
  return name;
}

type Item = Record<string, unknown> & { pk: string; sk: string };

async function get(pk: string, sk: string) {
  const result = await client.send(new GetCommand({ TableName: table(), Key: { pk, sk } }));
  return (result.Item as Item | undefined) ?? null;
}

async function put(item: Item) {
  await client.send(new PutCommand({ TableName: table(), Item: item }));
}

async function query(pk: string, prefix: string) {
  const items: Item[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await client.send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
        ExpressionAttributeValues: { ":pk": pk, ":sk": prefix },
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...((page.Items as Item[] | undefined) ?? []));
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return items;
}

function asUser(item: Item): User {
  return {
    id: String(item.userId),
    email: String(item.email),
    role: item.role === "admin" ? "admin" : "user",
  };
}

let ready: Promise<void> | null = null;

function ensureAdmin() {
  ready ??= (async () => {
    const admin = adminAccount();
    const existing = await get(`LOGIN#${admin.name}`, "USER");
    if (existing) return;
    const userId = "admin";
    const passwordHash = hashPassword(admin.password);
    await put({ pk: `LOGIN#${admin.name}`, sk: "USER", userId, email: admin.name, role: "admin", passwordHash });
    await put({ pk: `USER#${userId}`, sk: "ACCOUNT", userId, email: admin.name, role: "admin", passwordHash });
    await put({
      pk: `USER#${userId}`,
      sk: "PROFILE",
      profile: {
        userId,
        testDate: null,
        currentQuant: null,
        currentVerbal: null,
        targetScore: null,
        hoursPerDay: 2,
        weakAreas: [],
        diagnosticDone: false,
        createdAt: new Date().toISOString(),
      } satisfies Profile,
    });
  })();
  return ready;
}

export const dynamoDb = {
  async userBySession(token: string | undefined): Promise<User | null> {
    await ensureAdmin();
    if (!token) return null;
    const session = await get(`SESSION#${token}`, "USER");
    if (!session) return null;
    const account = await get(`USER#${session.userId}`, "ACCOUNT");
    return account ? asUser(account) : null;
  },
  async userById(userId: string): Promise<User | null> {
    await ensureAdmin();
    const account = await get(`USER#${userId}`, "ACCOUNT");
    return account ? asUser(account) : null;
  },
  async signUp(email: string, password: string) {
    await ensureAdmin();
    const normalized = email.trim().toLowerCase();
    if (await get(`LOGIN#${normalized}`, "USER")) return { error: "An account with that email already exists." };
    const userId = randomUUID();
    const passwordHash = hashPassword(password);
    const user: User = { id: userId, email: normalized, role: "user" };
    await put({ pk: `LOGIN#${normalized}`, sk: "USER", userId, email: normalized, role: "user", passwordHash });
    await put({ pk: `USER#${userId}`, sk: "ACCOUNT", userId, email: normalized, role: "user", passwordHash });
    const token = randomUUID();
    await put({ pk: `SESSION#${token}`, sk: "USER", userId });
    return { token, user };
  },
  async signIn(email: string, password: string) {
    await ensureAdmin();
    const normalized = email.trim().toLowerCase();
    const login = await get(`LOGIN#${normalized}`, "USER");
    if (!login || !verifyPassword(password, String(login.passwordHash ?? ""))) {
      return { error: "Username or password is wrong." };
    }
    const token = randomUUID();
    await put({ pk: `SESSION#${token}`, sk: "USER", userId: login.userId });
    return { token, user: asUser(login) };
  },
  async signOut(token: string | undefined) {
    if (!token) return;
    await client.send(new DeleteCommand({ TableName: table(), Key: { pk: `SESSION#${token}`, sk: "USER" } }));
  },
  async getProfile(userId: string) {
    await ensureAdmin();
    const item = await get(`USER#${userId}`, "PROFILE");
    return (item?.profile as Profile | undefined) ?? null;
  },
  async saveProfile(profile: Profile) {
    await put({ pk: `USER#${profile.userId}`, sk: "PROFILE", profile });
  },
  async attempts(userId: string) {
    const items = await query(`USER#${userId}`, "ATTEMPT#");
    return items.map((item) => item.attempt as Attempt);
  },
  async addAttempt(attempt: Attempt) {
    await put({ pk: `USER#${attempt.userId}`, sk: `ATTEMPT#${attempt.id}`, attempt });
    if (!attempt.correct) return;
    const wrong = await get(`USER#${attempt.userId}`, `WRONG#${attempt.questionId}`);
    if (!wrong?.wrong) return;
    const current = wrong.wrong as WrongQuestion;
    if (current.resolvedAt) return;
    await put({
      pk: `USER#${attempt.userId}`,
      sk: `WRONG#${attempt.questionId}`,
      wrong: { ...current, resolvedAt: attempt.createdAt },
    });
  },
  async bookmarks(userId: string) {
    const items = await query(`USER#${userId}`, "BOOKMARK#");
    return items.map((item) => String(item.questionId));
  },
  async toggleBookmark(userId: string, questionId: string) {
    const key = { pk: `USER#${userId}`, sk: `BOOKMARK#${questionId}` };
    const existing = await get(key.pk, key.sk);
    if (existing) {
      await client.send(new DeleteCommand({ TableName: table(), Key: key }));
      return false;
    }
    await put({ ...key, questionId });
    return true;
  },
  async wrongs(userId: string) {
    const items = await query(`USER#${userId}`, "WRONG#");
    return items.map((item) => item.wrong as WrongQuestion);
  },
  async tagWrong(userId: string, questionId: string, tag: ErrorTag) {
    const existing = await get(`USER#${userId}`, `WRONG#${questionId}`);
    const current = existing?.wrong as WrongQuestion | undefined;
    const wrong: WrongQuestion = { userId, questionId, tag, resolvedAt: current?.resolvedAt ?? null };
    await put({ pk: `USER#${userId}`, sk: `WRONG#${questionId}`, wrong });
  },
  async getPlan(userId: string, planDate: string) {
    const item = await get(`USER#${userId}`, `PLAN#${planDate}`);
    return (item?.plan as StudyPlan | undefined) ?? null;
  },
  async savePlan(plan: StudyPlan) {
    await put({ pk: `USER#${plan.userId}`, sk: `PLAN#${plan.planDate}`, plan });
  },
  async addWriting(userId: string, day: number, essay: string, rubric: EssayRubric) {
    const submission: WritingSubmission = {
      id: randomUUID(),
      userId,
      day,
      essay,
      rubric,
      createdAt: new Date().toISOString(),
    };
    await put({ pk: `USER#${userId}`, sk: `WRITING#${submission.id}`, submission });
    return submission;
  },
  async subscription(userId: string) {
    const item = await get(`USER#${userId}`, "SUB");
    return (item?.subscription as Subscription | undefined) ?? null;
  },
  async setSubscription(subscription: Subscription) {
    await put({ pk: `USER#${subscription.userId}`, sk: "SUB", subscription });
  },
  async cacheGet(key: string) {
    const item = await get("CACHE", key);
    return typeof item?.content === "string" ? item.content : null;
  },
  async cacheSet(key: string, content: string) {
    await put({ pk: "CACHE", sk: key, content });
  },
  async generated(userId: string) {
    const items = await query(`USER#${userId}`, "GEN#");
    return items.map((item) => item.question as Question);
  },
  async addGenerated(userId: string, question: Question) {
    await put({ pk: `USER#${userId}`, sk: `GEN#${question.id}`, question });
  },
};
