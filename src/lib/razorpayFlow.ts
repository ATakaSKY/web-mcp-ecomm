import { getApiBase } from "./apiBase";

export type RazorpayCreateResult =
  | { skipped: true }
  | {
      skipped?: false;
      keyId: string;
      razorpayOrderId: string;
      amountPaise: number;
      currency: string;
      appOrderId: string;
    };

export async function createRazorpayOrderForCheckout(
  orderId: string,
): Promise<{ ok: true; data: RazorpayCreateResult } | { ok: false; message: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/razorpay-create-order`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = (await res.json()) as RazorpayCreateResult & { error?: string };
    if (!res.ok) {
      return { ok: false, message: data.error ?? res.statusText };
    }
    if ("skipped" in data && data.skipped === true) {
      return { ok: true, data: { skipped: true } };
    }
    if (
      typeof data.keyId === "string" &&
      typeof data.razorpayOrderId === "string" &&
      typeof data.amountPaise === "number" &&
      typeof data.currency === "string" &&
      typeof data.appOrderId === "string"
    ) {
      return {
        ok: true,
        data: {
          keyId: data.keyId,
          razorpayOrderId: data.razorpayOrderId,
          amountPaise: data.amountPaise,
          currency: data.currency,
          appOrderId: data.appOrderId,
        },
      };
    }
    return { ok: false, message: "Invalid Razorpay response from server" };
  } catch {
    return { ok: false, message: "Network error creating payment" };
  }
}
