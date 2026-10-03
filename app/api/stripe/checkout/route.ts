import { NextResponse } from "next/server";
import Stripe from "stripe";
import { currentUser } from "@/lib/data";

export async function POST(request: Request) {
  const user = await currentUser();
  const origin = originFrom(request);
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  const form = await request.formData();
  const plan = form.get("plan") === "pass_90" ? "pass_90" : form.get("plan") === "pass_30" ? "pass_30" : null;
  if (!plan) return NextResponse.redirect(new URL("/dashboard?billing=Choose+a+pass.", origin));
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.redirect(new URL("/dashboard?billing=Add+STRIPE_SECRET_KEY+before+checkout.", origin));
  }
  const stripe = new Stripe(secret);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: plan === "pass_90" ? 1999 : 999,
          product_data: {
            name: plan === "pass_90" ? "GRE Crash Prep · 90 days" : "GRE Crash Prep · 30 days",
          },
        },
      },
    ],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/dashboard`,
    metadata: { userId: user.id, plan },
  });
  if (!session.url) {
    return NextResponse.redirect(new URL("/dashboard?billing=Stripe+did+not+return+a+checkout+URL.", origin));
  }
  return NextResponse.redirect(session.url, 303);
}

function originFrom(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
