"use client";

import { useActionState } from "react";
import { signInAction, signUpAction, type ActionState } from "@/lib/actions";

const initial: ActionState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Password
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2"
        />
      </label>
      {state.error ? <p className="text-sm text-clay">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-60"
      >
        {pending ? "Working…" : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
