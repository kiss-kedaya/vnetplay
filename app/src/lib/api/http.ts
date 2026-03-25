import { getApiBaseUrl } from "../settings/appSettings";

type RequestOptions = {
  baseUrl?: string;
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

export async function getJson<T>(path: string, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${resolveBaseUrl(options)}${path}`);
  if (!response.ok) {
    throw new Error(await readErrorDetail(response));
  }

  return response.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: Record<string, unknown>, options?: RequestOptions): Promise<T> {
  const response = await fetch(`${resolveBaseUrl(options)}${path}`, {
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
