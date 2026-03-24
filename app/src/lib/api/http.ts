import { getApiBaseUrl } from "../settings/appSettings";

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim() || `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function resolveBaseUrl(): string {
  const baseUrl = getApiBaseUrl().trim();
  if (!baseUrl) {
    throw new Error("请先填写服务器地址");
  }

  return baseUrl;
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`);
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${resolveBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  return response.json() as Promise<T>;
}
