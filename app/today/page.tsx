import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { WritingPanel } from "@/components/writing-panel";
import { getProfile, listAttempts } from "@/lib/data";
import { dateKey, studyDayLabel } from "@/lib/dates";
import { loadWriting } from "@/lib/questions";
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
  const done = new Set(attempts.filter((attempt) => dateKey(attempt.createdAt) === plan.planDate).map((attempt) => attempt.questionId));
  const questions = plan.items.filter((item) => item.kind === "question");
  const writingItem = plan.items.find((item) => item.kind === "writing");
  const writing = loadWriting();
  const prompt = writingItem ? writing.prompts.find((item) => item.day === writingItem.day) : undefined;
  const quant = questions.filter((item) => item.section === "quant");
  const verbal = questions.filter((item) => item.section === "verbal");
  const dayLabel = studyDayLabel(profile.createdAt);
  const resumeId = questions.find((item) => !done.has(item.questionId))?.questionId;

  return (
    <AppShell email={user.email} tier={tier} dayLabel={dayLabel}>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <div>
          <p className="text-sm font-semibold text-pine">{plan.mode === "adaptive" ? "Adjusted from yesterday" : "10-day rotation"}</p>
          <h1 className="mt-2 font-serif text-5xl">{dayLabel}</h1>
          <p className="mt-3 text-muted">About {formatMinutes(plan.minutes)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Quant" value={String(quant.length)} />
          <Stat label="Verbal" value={String(verbal.length)} />
          <Stat label="Writing" value={writingItem ? "1 outline" : "—"} />
        </div>
        <ol className="divide-y divide-line rounded-lg border border-line bg-card">
          {questions.map((item, index) => {
            const next = questions[index + 1];
            const href = `/practice/${item.questionId}${next ? `?next=${next.questionId}` : ""}`;
            const resume = item.questionId === resumeId;
            return (
              <li key={item.questionId}>
                <Link href={href} className={`flex items-center justify-between px-4 py-3 ${resume ? "bg-pine text-paper" : "hover:bg-paper"}`}>
                  <span>
                    <span className={`text-sm ${resume ? "text-paper/80" : "text-muted"}`}>{item.section === "quant" ? "Quant" : "Verbal"}</span>
                    <span className="mt-0.5 block">{item.category}</span>
                  </span>
                  <span className={`text-sm font-semibold ${resume ? "text-paper" : "text-muted"}`}>
                    {done.has(item.questionId) ? "Done" : resume ? "Continue" : "Start"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        {prompt && writingItem ? (
          <WritingPanel
            day={prompt.day}
            theme={prompt.theme}
            prompt={prompt.prompt}
            task={prompt.task}
            template={writing.template}
            canGrade={tier === "pass_90"}
          />
        ) : null}
      </main>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  );
}
