import { createAuthClient } from "better-auth/react";
import { getApiBase } from "./apiBase";

const baseURL = getApiBase() || undefined;

export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: "include",
  },
});
