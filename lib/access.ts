import type { Subscription, Tier } from "./types";

export function resolveTier(role: string | undefined, subscription: Subscription | null, now = new Date()): Tier {
  if (role === "admin") return "admin";
  return tierFromSubscription(subscription, now);
}

export function tierFromSubscription(subscription: Subscription | null, now = new Date()): Tier {
  const unlocked = process.env.DEV_UNLOCK;
  if (unlocked === "pass_30" || unlocked === "pass_90") return unlocked;
  if (!subscription) return "free";
  if (Date.parse(subscription.accessUntil) <= now.getTime()) return "free";
  return subscription.plan;
}

export function tierLabel(tier: Tier) {
  if (tier === "admin") return "Admin";
  if (tier === "pass_90") return "90-day pass";
  if (tier === "pass_30") return "30-day pass";
  return "Free";
}

export function hasFullAccess(tier: Tier) {
  return tier === "admin" || tier === "pass_90";
}

export const FREE_DAILY_LIMIT = 5;
