import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CardCheckout } from "@/components/card-checkout";
import { fulfillCheckoutSession } from "@/lib/actions";
import { getProfile } from "@/lib/data";
import { studyDayLabel } from "@/lib/dates";
import { requireViewer } from "@/lib/viewer";
import { redirect } from "next/navigation";

const offers = [
  ["pass_30", "30 days", "$9.99", "Full question bank, AI explanations, and a fixed 10-day plan."],
  ["pass_90", "90 days", "$19.99", "The day rebuilds from yesterday's misses, and writing gets a score."],
] as const;

export default async function PayPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; session_id?: string }>;
}) {
  const query = await searchParams;
  const { user, tier } = await requireViewer();
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const plan = query.plan === "pass_90" ? "pass_90" : "pass_30";
  const paid = query.session_id ? await fulfillCheckoutSession(query.session_id) : null;

  return (
    <AppShell email={user.email} tier={tier} dayLabel={studyDayLabel(profile.createdAt)}>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12">
        <div>
          <p className="text-sm font-semibold text-pine">One-time pass</p>
          <h1 className="mt-2 font-serif text-5xl">Pay</h1>
        </div>
        {paid && "plan" in paid ? (
          <div className="rounded-lg border border-line bg-card p-5">
            <p className="font-serif text-2xl text-pine">Payment received.</p>
            <p className="mt-2 text-sm text-muted">The {paid.plan === "pass_90" ? "90-day" : "30-day"} pass is active.</p>
            <Link href="/today" className="mt-4 inline-block rounded-md bg-pine px-4 py-2 text-sm font-semibold text-paper">
              Back to {studyDayLabel(profile.createdAt)}
            </Link>
          </div>
        ) : (
          <>
            {paid && "error" in paid ? <p className="text-sm text-clay">{paid.error}</p> : null}
            {tier !== "free" ? <p className="text-sm text-muted">You already have a pass. A new payment replaces the end date from today.</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              {offers.map(([id, name, price, copy]) => (
                <Link
                  key={id}
                  href={`/pay?plan=${id}`}
                  className={`rounded-lg border p-5 ${plan === id ? "border-pine bg-card" : "border-line bg-card"}`}
                >
                  <h2 className="font-serif text-2xl">{name}</h2>
                  <p className="mt-1 font-serif text-4xl">{price}</p>
                  <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
                </Link>
              ))}
            </div>
            <CardCheckout key={plan} plan={plan} />
          </>
        )}
      </main>
    </AppShell>
  );
}
