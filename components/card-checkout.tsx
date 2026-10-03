"use client";

import { loadStripe, type StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useEffect, useRef, useState } from "react";
import { startCheckoutAction } from "@/lib/actions";

export function CardCheckout({ plan }: { plan: "pass_30" | "pass_90" }) {
  const mount = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const slot = mount.current;
    if (!slot) return;
    let checkout: StripeEmbeddedCheckout | null = null;
    let cancelled = false;
    setError("");
    slot.replaceChildren();
    void (async () => {
      const started = await startCheckoutAction(plan);
      if (cancelled) return;
      if ("error" in started && started.error) {
        setError(started.error);
        return;
      }
      if (!("clientSecret" in started) || !started.clientSecret || !started.publishableKey) {
        setError("Stripe did not return a card form.");
        return;
      }
      const stripe = await loadStripe(started.publishableKey);
      if (!stripe || cancelled) return;
      checkout = await stripe.createEmbeddedCheckoutPage({ clientSecret: started.clientSecret });
      if (cancelled) {
        checkout.destroy();
        return;
      }
      checkout.mount(slot);
    })().catch(() => {
      if (!cancelled) setError("The card form could not be loaded.");
    });
    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [plan]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Card number, expiry, and CVC are entered in Stripe. This site does not store the card.</p>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <div ref={mount} />
    </div>
  );
}
