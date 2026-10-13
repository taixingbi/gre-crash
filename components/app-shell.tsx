import { MainPane } from "@/components/main-pane";
import { Sidebar, type SidebarDay, type SidebarModule } from "@/components/sidebar";
import { tierLabel } from "@/lib/access";
import { accountTier, currentUser, getProfile, listAttempts, listBookmarks, usingDynamo } from "@/lib/data";
import { dateKey, studyDayLabel } from "@/lib/dates";
import { courseDates, studyDates } from "@/lib/study-day";
import { ensureTodayPlan } from "@/lib/today";
import type { Tier } from "@/lib/types";

export async function AppShell({
  email,
  tier,
  dayLabel,
  children,
}: {
  email: string;
  tier: Tier;
  dayLabel: string;
  children: React.ReactNode;
}) {
  const viewer = await currentUser();
  const note = `${viewer?.role === "admin" ? "Admin" : tierLabel(tier)}${process.env.DEV_UNLOCK ? " · dev unlock" : ""} · ${usingDynamo() ? "DynamoDB" : "Local"}`;
  const study = await studySidebar(dayLabel);
  const modules = await todayModules();
  return (
    <div className="flex min-h-screen flex-col bg-paper lg:h-dvh lg:flex-row lg:overflow-hidden">
      <Sidebar email={email} dayLabel={study.label} planDate={study.planDate} days={study.days} note={note} modules={modules} />
      <MainPane>{children}</MainPane>
    </div>
  );
}

async function studySidebar(fallback: string): Promise<{ label: string; planDate: string; days: SidebarDay[] }> {
  const user = await currentUser();
  const profile = user ? await getProfile(user.id) : null;
  if (!user || !profile) return { label: fallback, planDate: "", days: [] };
  const tier = await accountTier(user.id);
  const days = tier === "admin" ? courseDates(profile.createdAt, profile.testDate) : studyDates(profile.createdAt);
  const plan = await ensureTodayPlan(user.id);
  const planDate = plan?.planDate ?? days.at(-1)?.planDate ?? "";
  return { label: studyDayLabel(profile.createdAt, planDate || undefined), planDate, days };
}

async function todayModules(): Promise<SidebarModule[]> {
  const user = await currentUser();
  if (!user) return [];
  const plan = await ensureTodayPlan(user.id);
  if (!plan) return [];
  const attempts = await listAttempts(user.id);
  const bookmarks = new Set(await listBookmarks(user.id));
  const done = new Set(attempts.filter((attempt) => dateKey(attempt.createdAt) === plan.planDate).map((attempt) => attempt.questionId));
  const questions = plan.items.filter((item) => item.kind === "question");
  const modules: SidebarModule[] = [];
  for (const section of ["quant", "verbal"] as const) {
    const rows = questions.filter((item) => item.section === section);
    if (!rows.length) continue;
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
    const seen = new Map<string, number>();
    modules.push({
      id: section,
      kicker: section === "quant" ? "Quant" : "Verbal",
      title: section === "quant" ? "Problem solving" : "Reading and vocabulary",
      lessons: rows.map((row) => {
        const index = (seen.get(row.category) ?? 0) + 1;
        seen.set(row.category, index);
        const repeated = (counts.get(row.category) ?? 0) > 1;
        const finished = done.has(row.questionId);
        const bookmarked = bookmarks.has(row.questionId);
        const marks = [finished ? "Done" : "", bookmarked ? "Bookmarked" : ""].filter(Boolean);
        return {
          id: row.questionId,
          href: `/practice/${row.questionId}`,
          title: repeated ? `${row.category} ${index}` : row.category,
          meta: marks.length ? marks.join(" · ") : "Question",
          done: finished,
          bookmarked,
        };
      }),
    });
  }
  const writing = plan.items.find((item) => item.kind === "writing");
  if (writing && writing.kind === "writing") {
    modules.push({
      id: "writing",
      kicker: "Writing",
      title: "Issue essay",
      lessons: [
        {
          id: `writing-${writing.day}`,
          href: "/writing",
          title: writing.title,
          meta: "Outline",
          done: false,
        },
      ],
    });
  }
  return modules;
}
