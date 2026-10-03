"use client";

import { useActionState } from "react";
import { saveProfileAction, type ActionState } from "@/lib/actions";
import type { Profile } from "@/lib/types";

const initial: ActionState = {};

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, action, pending] = useActionState(saveProfileAction, initial);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        Test date
        <input name="testDate" type="date" defaultValue={profile?.testDate ?? ""} className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <label className="text-sm">
        Hours per day
        <input name="hours" type="number" min="0.5" max="8" step="0.5" required defaultValue={profile?.hoursPerDay ?? 2} className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <label className="text-sm">
        Current Quant
        <input name="quant" type="number" min="130" max="170" defaultValue={profile?.currentQuant ?? ""} className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <label className="text-sm">
        Current Verbal
        <input name="verbal" type="number" min="130" max="170" defaultValue={profile?.currentVerbal ?? ""} className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <label className="text-sm sm:col-span-2">
        Target total
        <input name="target" type="number" min="260" max="340" defaultValue={profile?.targetScore ?? ""} className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" />
      </label>
      <label className="text-sm sm:col-span-2">
        Weak areas, optional
        <input name="weak" placeholder="Probability, Multi-blank TC" defaultValue={profile?.weakAreas.join(", ") ?? ""} className="mt-1 w-full rounded-md border border-line bg-card px-3 py-2" />
      </label>
      {state.error ? <p className="text-sm text-clay sm:col-span-2">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-paper sm:col-span-2">
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
