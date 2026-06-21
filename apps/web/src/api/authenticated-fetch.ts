import { refreshAuthToken } from "./auth";
import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken
} from "../auth/token-storage";

function withAuthHeader(headers: HeadersInit | undefined, accessToken: string): HeadersInit {
  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`
  };
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = getAuthToken();

  const firstResponse = await fetch(input, {
    ...init,
    headers: accessToken ? withAuthHeader(init.headers, accessToken) : init.headers
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthToken();
    return firstResponse;
  }

  try {
    const refreshResult = await refreshAuthToken(refreshToken);

    setAuthToken(refreshResult.data.accessToken);
    setRefreshToken(refreshResult.data.refreshToken);

    return fetch(input, {
      ...init,
      headers: withAuthHeader(init.headers, refreshResult.data.accessToken)
    });
  } catch {
    clearAuthToken();
    return firstResponse;
  }
}
