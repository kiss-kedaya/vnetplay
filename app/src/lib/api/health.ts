import { getJson } from "./http";

export type ServerHealth = {
  status: string;
  service: string;
};

export function fetchServerHealth(): Promise<ServerHealth> {
  return getJson<ServerHealth>("/health");
}
