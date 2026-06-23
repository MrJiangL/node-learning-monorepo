const DEFAULT_API_BASE_URL = "/api";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "");
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildApiUrl(
  path: string,
  baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
): string {
  return `${normalizeBaseUrl(baseUrl)}${normalizePath(path)}`;
}
