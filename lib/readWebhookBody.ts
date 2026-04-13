import type { VercelRequest } from "@vercel/node";

/**
 * Razorpay webhook signature is computed over the **exact** raw body.
 * If the platform parses JSON before this runs, verification may fail.
 */
export async function readWebhookRawBody(req: VercelRequest): Promise<string> {
  if (typeof req.body === "string") return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString("utf8");
  if (req.body != null && typeof req.body === "object") {
    return JSON.stringify(req.body);
  }
  const chunks: Buffer[] = [];
  const readable = req as NodeJS.ReadableStream;
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks).toString("utf8");
}
