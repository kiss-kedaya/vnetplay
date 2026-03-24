export type AppSettings = {
  serverBaseUrl: string;
  defaultRoomName: string;
};

const serverBaseUrlKey = "vnetplay.settings.server-base-url";
const defaultRoomNameKey = "vnetplay.settings.default-room-name";

const defaultSettings: AppSettings = {
  serverBaseUrl: "http://127.0.0.1:9080",
  defaultRoomName: "my-new-room",
};

function normalizeServerBaseUrl(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized.replace(/\/$/, "") : defaultSettings.serverBaseUrl;
}

function normalizeRoomName(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : defaultSettings.defaultRoomName;
}

export function resolveAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  return {
    serverBaseUrl: normalizeServerBaseUrl(window.localStorage.getItem(serverBaseUrlKey)),
    defaultRoomName: normalizeRoomName(window.localStorage.getItem(defaultRoomNameKey)),
  };
}

export function saveAppSettings(input: Partial<AppSettings>): AppSettings {
  const nextSettings: AppSettings = {
    serverBaseUrl: normalizeServerBaseUrl(input.serverBaseUrl),
    defaultRoomName: normalizeRoomName(input.defaultRoomName),
  };

  window.localStorage.setItem(serverBaseUrlKey, nextSettings.serverBaseUrl);
  window.localStorage.setItem(defaultRoomNameKey, nextSettings.defaultRoomName);
  return nextSettings;
}

export function getApiBaseUrl(): string {
  return resolveAppSettings().serverBaseUrl;
}
