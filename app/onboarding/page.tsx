import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Diagnostic } from "@/components/diagnostic";
import { ProfileForm } from "@/components/profile-form";
import { getProfile } from "@/lib/data";
import { studyDayLabel } from "@/lib/dates";
import { diagnosticQuestions, toPublic } from "@/lib/questions";
import { requireViewer } from "@/lib/viewer";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { user, tier } = await requireViewer();
  const profile = await getProfile(user.id);
  const showDiagnostic = Boolean(profile) && !profile?.diagnosticDone && (saved === "1" || profile?.diagnosticDone === false);
  return (
    <AppShell email={user.email} tier={tier} dayLabel={profile ? studyDayLabel(profile.createdAt) : "Day 1"}>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <div>
          <p className="text-sm font-semibold text-pine">Onboarding</p>
          <h1 className="mt-2 font-serif text-4xl">Tell us the test, not your whole history.</h1>
        </div>
        <ProfileForm profile={profile} />
        {showDiagnostic ? (
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl">Optional diagnostic</h2>
                <p className="text-sm text-muted">Twelve questions, one from each category. Skip it if you already know the weak spots.</p>
              </div>
              <Link href="/today" className="text-sm font-semibold text-pine">
                Skip to today
              </Link>
            </div>
            <Diagnostic questions={diagnosticQuestions().map(toPublic)} />
          </section>
        ) : null}
      </main>
    </AppShell>
  );
}
