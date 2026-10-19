import Stripe from "stripe";

export function stripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && !key.includes("replace_me") && key.startsWith("sk_"));
}

export function getStripe(): Stripe | null {
  if (!stripeConfigured()) return null;
  // Fetch-based client so the SDK also runs on Cloudflare Workers.
  return new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
