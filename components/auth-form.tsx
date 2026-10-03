"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm font-medium">
        {mode === "login" ? "Username" : "Email"}
        <input
          name="email"
          type={mode === "login" ? "text" : "email"}
          required
          placeholder={mode === "login" ? "e.g. priya_patel" : "you@example.com"}
          autoComplete={mode === "login" ? "username" : "email"}
          className="mt-1.5 w-full rounded-xl border border-[#e4e1ea] bg-white px-3 py-2.5"
        />
      </label>
      <label className="block text-sm font-medium">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="mt-1.5 w-full rounded-xl border border-[#e4e1ea] bg-white px-3 py-2.5"
        />
      </label>
      {state.error ? <p className="text-sm text-clay">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-violet px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Working…" : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
