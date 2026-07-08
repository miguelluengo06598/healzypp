import { loadStripe } from "@stripe/stripe-js";

const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

// loadStripe is memoized — safe to call at module level
export const stripePromise = key ? loadStripe(key) : null;
