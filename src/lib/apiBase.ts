/** Base URL for API calls (empty = same origin). */
export function getApiBase(): string {
  return import.meta.env.VITE_API_BASE ?? "";
}
