import { getJson } from "./http";

export type ServerHealth = {
  status: string;
  service: string;
};

export function fetchServerHealth(baseUrl?: string): Promise<ServerHealth> {
  return getJson<ServerHealth>("/health", { baseUrl });
}
