import { getApiAuthToken, getApiBaseUrl } from "../settings/appSettings";

type RequestOptions = {
  baseUrl?: string;
  authToken?: string;
};

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim() || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function resolveBaseUrl(options?: RequestOptions): string {
  const baseUrl = (options?.baseUrl ?? getApiBaseUrl()).trim();
  if (!baseUrl) {
    throw new Error("请先填写服务器地址");
  }

  return baseUrl;
}

function buildHeaders(options?: RequestOptions, extras?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    ...(extras ?? {}),
  };

  const token = (options?.authToken ?? getApiAuthToken()).trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers["X-VNetPlay-Token"] = token;
  }

  return headers;
}

export async function getJson<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${resolveBaseUrl(options)}${path}`, {
    headers: buildHeaders(options),
  });
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: Record<string, unknown>, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${resolveBaseUrl(options)}${path}`, {
    method: "POST",
    headers: buildHeaders(options, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  return response.json() as Promise<T>;
}
