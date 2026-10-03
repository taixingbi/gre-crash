import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { retagWrongAction } from "@/lib/actions";
import { getProfile, listAttempts, listWrongs } from "@/lib/data";
import { daysBetween, studyDayLabel, todayKey } from "@/lib/dates";
import { loadQuestions } from "@/lib/questions";
import { requireViewer } from "@/lib/viewer";
import type { ErrorTag, Section } from "@/lib/types";
import { redirect } from "next/navigation";

const tags: Array<ErrorTag | "all"> = ["all", "concept", "careless", "vocabulary", "logic", "time"];

function accuracy(attempts: { section: Section; correct: boolean }[], section: Section) {
  const rows = attempts.filter((attempt) => attempt.section === section);
  if (rows.length === 0) return "—";
  return `${Math.round((rows.filter((attempt) => attempt.correct).length / rows.length) * 100)}%`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; upgraded?: string; billing?: string }>;
}) {
  const query = await searchParams;
  const { user, tier } = await requireViewer();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const attempts = await listAttempts(user.id);
  const latest = new Map<string, (typeof attempts)[number]>();
  for (const attempt of attempts) latest.set(attempt.questionId, attempt);
  const latestRows = [...latest.values()];
  const bank = loadQuestions().filter((question) => !question.aiGenerated);
  const completed = latestRows.filter((attempt) => bank.some((question) => question.id === attempt.questionId)).length;
  const byCategory = new Map<string, { correct: number; total: number }>();
  for (const attempt of latestRows) {
    const bucket = byCategory.get(attempt.category) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (attempt.correct) bucket.correct += 1;
    byCategory.set(attempt.category, bucket);
  }
  const weak = [...byCategory.entries()]
    .filter(([, bucket]) => bucket.total >= 2)
    .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total)
    .slice(0, 2)
    .map(([category]) => category);
  const daysLeft = profile.testDate ? daysBetween(todayKey(), profile.testDate) : null;
  const activeTag = tags.includes(query.tag as ErrorTag) ? (query.tag as ErrorTag | "all") : "all";
  const wrongs = (await listWrongs(user.id)).filter((wrong) => !wrong.resolvedAt && (activeTag === "all" || wrong.tag === activeTag));

  return (
    <AppShell email={user.email} tier={tier} dayLabel={studyDayLabel(profile.createdAt)}>
      <main className="mx-auto max-w-5xl space-y-10 px-6 py-12">
        {query.upgraded ? <p className="text-sm text-pine">Payment received. Your pass is active.</p> : null}
        {query.billing ? <p className="text-sm text-clay">{query.billing}</p> : null}
        <h1 className="font-serif text-5xl">Dashboard</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="Quant accuracy" value={accuracy(latestRows, "quant")} />
          <Tile label="Verbal accuracy" value={accuracy(latestRows, "verbal")} />
          <Tile label="Questions" value={`${completed} / ${bank.length || 300}`} />
          <Tile label="Days until GRE" value={daysLeft === null ? "—" : String(Math.max(daysLeft, 0))} />
        </div>
        <p className="text-muted">Weak: {weak.length ? weak.join(" / ") : profile.weakAreas.join(" / ") || "Not enough answers yet."}</p>
        <section className="space-y-4">
          <h2 className="font-serif text-3xl">Passes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Pass name="30 days" price="$9.99" copy="Full question bank, AI explanations, and a fixed 10-day plan." plan="pass_30" current={tier === "pass_30"} />
            <Pass name="90 days" price="$19.99" copy="The day rebuilds from yesterday's misses, and writing gets a score." plan="pass_90" current={tier === "pass_90"} />
          </div>
        </section>
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl">Wrong questions</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {tags.map((tag) => (
                <Link key={tag} href={tag === "all" ? "/dashboard" : `/dashboard?tag=${tag}`} className={`rounded-full border px-3 py-1 capitalize ${activeTag === tag ? "border-pine bg-pine text-paper" : "border-line"}`}>
                  {tag}
                </Link>
              ))}
            </div>
          </div>
          {wrongs.length === 0 ? (
            <p className="text-muted">No open misses in this group.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-card">
              {wrongs.map((wrong) => {
                const question = bank.find((item) => item.id === wrong.questionId);
                return (
                  <li key={wrong.questionId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <Link href={`/practice/${wrong.questionId}`}>
                      <span className="block text-sm text-muted">{question?.category}</span>
                      <span>{question ? `${question.section} ${question.number}` : wrong.questionId}</span>
                    </Link>
                    <form action={retagWrongAction} className="flex items-center gap-2 text-sm">
                      <input type="hidden" name="questionId" value={wrong.questionId} />
                      <select name="tag" defaultValue={wrong.tag} className="rounded-md border border-line bg-paper px-2 py-1 capitalize">
                        {tags
                          .filter((tag) => tag !== "all")
                          .map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                      </select>
                      <button className="text-pine">Save</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  );
}

function Pass({ name, price, copy, plan, current }: { name: string; price: string; copy: string; plan: "pass_30" | "pass_90"; current: boolean }) {
  return (
    <article className="rounded-lg border border-line bg-card p-5">
      <h3 className="font-serif text-2xl">{name}</h3>
      <p className="mt-1 font-serif text-4xl">{price}</p>
      <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
      {current ? (
        <p className="mt-4 text-sm font-semibold text-pine">Current pass</p>
      ) : (
        <Link href={`/pay?plan=${plan}`} className="mt-4 inline-block rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper">
          Buy {name}
        </Link>
      )}
    </article>
  );
}
