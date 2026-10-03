import Link from "next/link";
import { Header } from "@/components/header";
import { accountTier, currentUser, getProfile } from "@/lib/data";
import { studyDayLabel } from "@/lib/dates";

const points = [
  ["150 Quant", "Six categories, not a thousand mixed problems."],
  ["150 Verbal", "Text completion, sentence equivalence, and reading."],
  ["Writing practice", "Ten issue prompts, a four-paragraph template, a 3-minute plan."],
  ["AI explanations", "Why the answer is right, why yours missed, and a Chinese explanation."],
  ["A study plan", "Today's work is chosen from yesterday's mistakes."],
];

const prices = [
  ["Free", "$0", "Diagnostic and a few questions a day.", "Start My Plan"],
  ["30 days", "$9.99", "Full bank, AI explanations, and a fixed 10-day plan.", "Get 30 days"],
  ["90 days", "$19.99", "The plan rebuilds every day, plus writing scores.", "Get 90 days"],
];

export default async function HomePage() {
  const user = await currentUser();
  const tier = user ? await accountTier(user.id) : undefined;
  const profile = user ? await getProfile(user.id) : null;
  const dayLabel = profile ? studyDayLabel(profile.createdAt) : "Today";
  return (
    <>
      <Header email={user?.email} tier={tier} dayLabel={dayLabel} />
      <main>
        <section className="mx-auto max-w-5xl px-6 py-20">
          <p className="text-sm font-semibold tracking-wide text-pine">AI-Powered GRE Crash Prep</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
            GRE in 10 Days. Only What You Need.
          </h1>
          <p className="mt-6 max-w-2xl text-xl leading-8 text-muted">
            You don&apos;t need more GRE questions. You need to know which questions matter.
          </p>
          <Link href={user ? "/today" : "/login"} className="mt-8 inline-block rounded-md bg-pine px-5 py-3 font-semibold text-paper">
            {user ? `Go to ${dayLabel}` : "Start My Plan"}
          </Link>
        </section>
        <section className="border-y border-line">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 py-14 sm:grid-cols-2">
            {points.map(([title, copy]) => (
              <div key={title}>
                <h2 className="font-serif text-2xl">{title}</h2>
                <p className="mt-2 text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-5xl gap-4 px-6 py-14 md:grid-cols-3">
          {prices.map(([name, price, copy]) => (
            <article key={name} className="rounded-lg border border-line bg-card p-5">
              <h2 className="font-serif text-2xl">{name}</h2>
              <p className="mt-2 font-serif text-4xl">{price}</p>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
