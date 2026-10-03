import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const signup = mode === "signup";
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-violet px-8 py-10 text-white lg:px-14 lg:py-12">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M3 4.5h10M3 8h10M3 11.5h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-lg font-semibold">GREMastery</span>
        </div>
        <div className="max-w-md py-12">
          <h1 className="font-serif text-5xl leading-tight tracking-tight">
            Welcome back.
            <br />
            Ready to master the GRE?
          </h1>
          <p className="mt-5 max-w-sm text-base text-white/80">Pick up today&apos;s practice questions and track your progress toward a top score.</p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            <Stat value="48%" label="Verbal" />
            <Stat value="61%" label="Quant" />
            <Stat value="+12" label="This week" />
          </div>
        </div>
        <div />
      </section>
      <section className="flex items-center bg-paper px-6 py-16 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">{signup ? "Create your account" : "Sign in to your account"}</h2>
          <p className="mt-2 text-sm text-muted">{signup ? "Then tell us your test date." : "Enter your credentials to continue practicing."}</p>
          <div className="mt-8">
            <AuthForm mode={signup ? "signup" : "login"} />
          </div>
          <p className="mt-6 text-sm text-muted">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <Link href={signup ? "/login" : "/login?mode=signup"} className="font-semibold text-violet">
              {signup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3 py-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-white/75">{label}</p>
    </div>
  );
}
