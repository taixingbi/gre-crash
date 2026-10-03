import Stripe from "stripe";
import { setSubscription } from "@/lib/data";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return new Response("Stripe is not configured.", { status: 500 });
  const stripe = new Stripe(secret);
  const event = stripe.webhooks.constructEvent(
    await request.text(),
    request.headers.get("stripe-signature") ?? "",
    webhookSecret,
  );
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (userId && (plan === "pass_30" || plan === "pass_90")) {
      const days = plan === "pass_90" ? 90 : 30;
      await setSubscription({
        userId,
        plan,
        accessUntil: new Date(Date.now() + days * 86_400_000).toISOString(),
        stripeSessionId: session.id,
      });
    }
  }
  return Response.json({ received: true });
}
