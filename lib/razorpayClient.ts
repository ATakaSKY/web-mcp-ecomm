import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type RazorpayInstance = {
  orders: {
    create: (params: {
      amount: number;
      currency: string;
      receipt?: string;
      notes?: Record<string, string>;
    }) => Promise<{ id: string; amount: number; currency: string }>;
  };
};

type RazorpayConstructor = new (config: {
  key_id: string;
  key_secret: string;
}) => RazorpayInstance;

const Razorpay = require("razorpay") as RazorpayConstructor;

export function getRazorpay(): RazorpayInstance | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}

export function getRazorpayKeySecret(): string | null {
  return process.env.RAZORPAY_KEY_SECRET ?? null;
}
