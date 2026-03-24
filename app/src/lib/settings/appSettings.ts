export type AppSettings = {
  serverBaseUrl: string;
  defaultRoomName: string;
  autoConnectOnLaunch: boolean;
};

const serverBaseUrlKey = "vnetplay.settings.server-base-url";
const defaultRoomNameKey = "vnetplay.settings.default-room-name";
const autoConnectOnLaunchKey = "vnetplay.settings.auto-connect-on-launch";

const defaultSettings: AppSettings = {
  serverBaseUrl: "http://127.0.0.1:9080",
  defaultRoomName: "my-new-room",
  autoConnectOnLaunch: false,
};

function normalizeServerBaseUrl(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized.replace(/\/$/, "") : defaultSettings.serverBaseUrl;
}

function normalizeRoomName(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : defaultSettings.defaultRoomName;
}

function normalizeAutoConnect(value: boolean | string | null | undefined): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return value === "true";
}

export function resolveAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  return {
    serverBaseUrl: normalizeServerBaseUrl(window.localStorage.getItem(serverBaseUrlKey)),
    defaultRoomName: normalizeRoomName(window.localStorage.getItem(defaultRoomNameKey)),
    autoConnectOnLaunch: normalizeAutoConnect(window.localStorage.getItem(autoConnectOnLaunchKey)),
  };
}

export function saveAppSettings(input: Partial<AppSettings>): AppSettings {
  const current = resolveAppSettings();
  const nextSettings: AppSettings = {
    serverBaseUrl: normalizeServerBaseUrl(input.serverBaseUrl ?? current.serverBaseUrl),
    defaultRoomName: normalizeRoomName(input.defaultRoomName ?? current.defaultRoomName),
    autoConnectOnLaunch: normalizeAutoConnect(input.autoConnectOnLaunch ?? current.autoConnectOnLaunch),
  };

  window.localStorage.setItem(serverBaseUrlKey, nextSettings.serverBaseUrl);
  window.localStorage.setItem(defaultRoomNameKey, nextSettings.defaultRoomName);
  window.localStorage.setItem(autoConnectOnLaunchKey, String(nextSettings.autoConnectOnLaunch));
  return nextSettings;
}

export function getApiBaseUrl(): string {
  return resolveAppSettings().serverBaseUrl;
}
