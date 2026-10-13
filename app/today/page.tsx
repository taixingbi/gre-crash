import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getProfile, listAttempts, listBookmarks } from "@/lib/data";
import { dateKey, studyDayLabel } from "@/lib/dates";
import { ensureTodayPlan } from "@/lib/today";
import { requireViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${rest.toString().padStart(2, "0")}m`;
}

export default async function TodayPage() {
  const { user, tier } = await requireViewer();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const plan = await ensureTodayPlan(user.id);
  if (!plan) redirect("/onboarding");
  const attempts = await listAttempts(user.id);
  const bookmarks = new Set(await listBookmarks(user.id));
  const done = new Set(attempts.filter((attempt) => dateKey(attempt.createdAt) === plan.planDate).map((attempt) => attempt.questionId));
  const questions = plan.items.filter((item) => item.kind === "question");
  const writingItem = plan.items.find((item): item is Extract<(typeof plan.items)[number], { kind: "writing" }> => item.kind === "writing");
  const quant = questions.filter((item) => item.section === "quant");
  const verbal = questions.filter((item) => item.section === "verbal");
  const dayLabel = studyDayLabel(profile.createdAt, plan.planDate);
  const resumeId = questions.find((item) => !done.has(item.questionId))?.questionId;

  return (
    <AppShell email={user.email} tier={tier} dayLabel={dayLabel}>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-10 lg:px-10 lg:py-12">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">{plan.mode === "adaptive" ? "Adjusted from yesterday" : "10-day rotation"}</p>
          <h1 className="mt-3 font-serif text-5xl tracking-tight">{dayLabel}</h1>
          <p className="mt-2 text-muted">About {formatMinutes(plan.minutes)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Quant" value={String(quant.length)} />
          <Stat label="Verbal" value={String(verbal.length)} />
          <Stat label="Writing" value={writingItem ? "1 outline" : "—"} />
        </div>
        <ol className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          {questions.map((item, index) => {
            const next = questions[index + 1];
            const href = `/practice/${item.questionId}${next ? `?next=${next.questionId}` : ""}`;
            const resume = item.questionId === resumeId;
            const finished = done.has(item.questionId);
            const bookmarked = bookmarks.has(item.questionId);
            return (
              <li key={item.questionId} className={index > 0 && !resume ? "border-t border-line" : ""}>
                <Link href={href} className={`flex items-center justify-between gap-4 px-5 py-4 ${resume ? "bg-pine text-white" : finished ? "bg-[#f3f2ef] text-muted" : "hover:bg-paper"}`}>
                  <span>
                    <span className={`flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase ${resume ? "text-white/70" : "text-muted"}`}>
                      {item.section === "quant" ? "Quant" : "Verbal"}
                      {bookmarked ? <BookmarkMark light={resume} /> : null}
                    </span>
                    <span className={`mt-0.5 block font-medium ${finished && !resume ? "text-muted" : ""}`}>{item.category}</span>
                  </span>
                  <span className={`shrink-0 text-sm font-semibold ${resume ? "rounded-full bg-white px-4 py-1.5 text-ink" : finished ? "text-[#8d8a96]" : "text-muted"}`}>
                    {finished ? "Done" : resume ? "Continue" : "Start"}
                  </span>
                </Link>
              </li>
            );
          })}
          {writingItem ? (
            <li className={questions.length ? "border-t border-line" : ""}>
              <Link href="/writing" className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper">
                <span>
                  <span className="block text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Writing</span>
                  <span className="mt-0.5 block font-medium">{writingItem.title}</span>
                </span>
                <span className="shrink-0 text-sm font-semibold text-muted">Start</span>
              </Link>
            </li>
          ) : null}
        </ol>
      </main>
    </AppShell>
  );
}

function BookmarkMark({ light }: { light: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-label="Bookmarked" className={`h-3.5 w-3.5 ${light ? "text-white" : "text-[#8d8a96]"}`}>
      <path d="M4 2.5h8v11l-4-2.4-4 2.4v-11z" fill="currentColor" />
    </svg>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-5 py-4 shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-serif text-4xl tracking-tight">{value}</p>
    </div>
  );
}
