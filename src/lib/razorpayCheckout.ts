import { getApiBase } from "./apiBase";
import type { RazorpayCreateResult } from "./razorpayFlow";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export type RazorpayUiResult =
  | { step: "paid"; appOrderId: string }
  | { step: "dismissed" }
  | { step: "error"; message: string };

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("No window"));
  }
  const w = window as Window & { Razorpay?: RazorpayConstructor };
  if (w.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = CHECKOUT_SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.head.appendChild(s);
  });
}

type RazorpayResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };

/** Opens Razorpay Standard Checkout (UPI, cards, netbanking, wallets). */
export async function openRazorpayPaymentModal(
  prep: Exclude<RazorpayCreateResult, { skipped: true }>,
): Promise<RazorpayUiResult> {
  await loadRazorpayScript();
  const w = window as Window & { Razorpay?: RazorpayConstructor };
  const Ctor = w.Razorpay;
  if (!Ctor) {
    return { step: "error", message: "Razorpay Checkout failed to load" };
  }

  return new Promise((resolve) => {
    let settled = false;
    let checkoutHandlerInvoked = false;
    const done = (r: RazorpayUiResult) => {
      if (settled) return;
      settled = true;
      resolve(r);
    };

    const options: Record<string, unknown> = {
      key: prep.keyId,
      amount: prep.amountPaise,
      currency: prep.currency,
      name: "WebMCP Shop",
      description: "Secure payment (UPI, cards & more)",
      order_id: prep.razorpayOrderId,
      handler(response: RazorpayResponse) {
        checkoutHandlerInvoked = true;
        void (async () => {
          try {
            const res = await fetch(`${getApiBase()}/api/razorpay-verify`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                appOrderId: prep.appOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const data = (await res.json()) as { error?: string };
            if (!res.ok) {
              done({ step: "error", message: data.error ?? "Could not verify payment" });
              return;
            }
            done({ step: "paid", appOrderId: prep.appOrderId });
          } catch {
            done({ step: "error", message: "Network error verifying payment" });
          }
        })();
      },
      modal: {
        ondismiss() {
          if (checkoutHandlerInvoked) return;
          done({ step: "dismissed" });
        },
      },
      theme: { color: "#2563eb" },
    };

    const instance = new Ctor(options);
    instance.open();
  });
}
