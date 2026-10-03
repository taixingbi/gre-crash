import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { Header } from "@/components/header";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const signup = mode === "signup";
  return (
    <>
      <Header />
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-serif text-4xl">{signup ? "Create your plan" : "Welcome back"}</h1>
        <p className="mt-2 text-muted">{signup ? "Then tell us your test date." : "Pick up today's questions."}</p>
        <div className="mt-8">
          <AuthForm mode={signup ? "signup" : "login"} />
        </div>
        <p className="mt-4 text-sm text-muted">
          {signup ? (
            <Link href="/login" className="text-pine">
              I already have an account
            </Link>
          ) : (
            <Link href="/login?mode=signup" className="text-pine">
              Create an account
            </Link>
          )}
        </p>
      </main>
    </>
  );
}
