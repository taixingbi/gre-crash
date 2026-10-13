import { AppShell } from "@/components/app-shell";
import { SavedEssays, WritingDesk } from "@/components/writing-panel";
import { getProfile, listWritings } from "@/lib/data";
import { studyDayLabel } from "@/lib/dates";
import { loadWriting } from "@/lib/questions";
import { ensureTodayPlan } from "@/lib/today";
import { requireViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

export default async function WritingPage() {
  const { user, tier } = await requireViewer();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const plan = await ensureTodayPlan(user.id);
  if (!plan) redirect("/onboarding");
  const writingItem = plan.items.find((item): item is Extract<(typeof plan.items)[number], { kind: "writing" }> => item.kind === "writing");
  const writing = loadWriting();
  const essays = await listWritings(user.id);
  const prompt = writingItem ? writing.prompts.find((item) => item.day === writingItem.day) : undefined;
  const dayLabel = studyDayLabel(profile.createdAt, plan.planDate);

  return (
    <AppShell email={user.email} tier={tier} dayLabel={dayLabel}>
      <main>
        {prompt && writingItem ? (
          <WritingDesk
            key={plan.planDate}
            day={prompt.day}
            planDate={plan.planDate}
            theme={prompt.theme}
            prompt={prompt.prompt}
            task={prompt.task}
            template={writing.template}
            canGrade={tier === "pass_90" || tier === "admin"}
            essays={essays}
          />
        ) : essays.length ? (
          <section className="mx-auto mt-10 max-w-3xl space-y-4 rounded-lg border border-line bg-card p-5">
            <SavedEssays essays={essays} canGrade={tier === "pass_90" || tier === "admin"} />
          </section>
        ) : (
          <section className="mx-auto mt-10 max-w-3xl rounded-lg border border-line bg-card p-5">
            <h1 className="font-serif text-3xl tracking-tight">Issue essay</h1>
            <p className="mt-2 text-muted">No essay is scheduled for this day.</p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
