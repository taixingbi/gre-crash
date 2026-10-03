import type { Subscription, Tier } from "./types";

export function tierFromSubscription(subscription: Subscription | null, now = new Date()): Tier {
  const unlocked = process.env.DEV_UNLOCK;
  if (unlocked === "pass_30" || unlocked === "pass_90") return unlocked;
  if (!subscription) return "free";
  if (Date.parse(subscription.accessUntil) <= now.getTime()) return "free";
  return subscription.plan;
}

export function tierLabel(tier: Tier) {
  if (tier === "pass_90") return "90-day pass";
  if (tier === "pass_30") return "30-day pass";
  return "Free";
}

export const FREE_DAILY_LIMIT = 5;
