import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PracticeRunner } from "@/components/practice-runner";
import { FREE_DAILY_LIMIT } from "@/lib/access";
import { getProfile, listAttempts, listBookmarks, listGenerated } from "@/lib/data";
import { dateKey, studyDayLabel, todayKey } from "@/lib/dates";
import { findQuestion, isDiagnosticId, loadQuestions, toPublic } from "@/lib/questions";
import { ensureTodayPlan } from "@/lib/today";
import { requireViewer } from "@/lib/viewer";
import { notFound, redirect } from "next/navigation";

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { id } = await params;
  const { next } = await searchParams;
  const { user, tier } = await requireViewer();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const dayLabel = studyDayLabel(profile.createdAt);
  const question = findQuestion(id, await listGenerated(user.id));
  if (!question) notFound();
  const attempts = await listAttempts(user.id);
  const today = todayKey();
  const used = attempts.filter((attempt) => dateKey(attempt.createdAt) === today && !isDiagnosticId(attempt.questionId)).length;
  const answeredToday = attempts.some((attempt) => attempt.questionId === id && dateKey(attempt.createdAt) === today);
  const blocked = tier === "free" && !isDiagnosticId(id) && !answeredToday && used >= FREE_DAILY_LIMIT;
  const bookmarks = await listBookmarks(user.id);
  const plan = await ensureTodayPlan(user.id);
  const queue = plan?.items.filter((item) => item.kind === "question").map((item) => item.questionId) ?? [];
  const place = queue.indexOf(id);
  const bank = loadQuestions();
  const bankPlace = bank.findIndex((item) => item.id === id);
  const following =
    (place >= 0 ? queue[place + 1] : null) ??
    (next && (bank.some((item) => item.id === next) || next.startsWith("gen-")) ? next : null) ??
    (bankPlace >= 0 ? bank[bankPlace + 1]?.id : null);
  const nextHref = following ? `/practice/${following}` : "/today";
  const nextLabel = following ? "Next question" : `Back to ${dayLabel}`;

  return (
    <AppShell email={user.email} tier={tier} dayLabel={dayLabel}>
      <main>
        {blocked ? (
          <div className="mx-auto max-w-3xl space-y-4 px-6 py-10">
            <h1 className="font-serif text-4xl">Today&apos;s free questions are done.</h1>
            <p className="text-muted">The free plan is {FREE_DAILY_LIMIT} bank questions a day. The 30-day pass opens all 300.</p>
            <Link href="/dashboard" className="inline-block rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper">
              See passes
            </Link>
          </div>
        ) : (
          <PracticeRunner
            key={question.id}
            question={toPublic(question)}
            bookmarked={bookmarks.includes(id)}
            nextHref={nextHref}
            nextLabel={nextLabel}
            position={place >= 0 ? { current: place + 1, total: queue.length } : null}
            aiEnabled={tier !== "free"}
          />
        )}
      </main>
    </AppShell>
  );
}
