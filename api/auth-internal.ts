import type { VercelRequest, VercelResponse } from "@vercel/node";
import { toNodeHandler } from "better-auth/node";
import { auth } from "../auth.js";

const authHandler = toNodeHandler(auth);

/** Rewrite entry: restore the public path Better Auth expects (`/api/auth/...`). */
function restoreAuthUrl(req: VercelRequest): void {
  const full = req.url ?? "/";
  const u = new URL(full, "http://127.0.0.1");
  const captured = u.searchParams.get("p") ?? "";
  u.searchParams.delete("p");
  const sub = captured.replace(/^\/+|\/+$/g, "");
  const pathname = sub ? `/api/auth/${sub}` : "/api/auth";
  const search = u.searchParams.toString();
  req.url = `${pathname}${search ? `?${search}` : ""}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  restoreAuthUrl(req);
  return authHandler(req, res);
}
