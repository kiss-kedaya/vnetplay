export type AppSettings = {
  serverBaseUrl: string;
  defaultRoomName: string;
  defaultCommunity: string;
  supernodeAddress: string;
  autoConnectOnLaunch: boolean;
};

const serverBaseUrlKey = "vnetplay.settings.server-base-url";
const defaultRoomNameKey = "vnetplay.settings.default-room-name";
const defaultCommunityKey = "vnetplay.settings.default-community";
const supernodeAddressKey = "vnetplay.settings.supernode-address";
const autoConnectOnLaunchKey = "vnetplay.settings.auto-connect-on-launch";

const defaultSettings: AppSettings = {
  serverBaseUrl: "http://127.0.0.1:9080",
  defaultRoomName: "my-new-room",
  defaultCommunity: "vnetplay-room",
  supernodeAddress: "127.0.0.1:7777",
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

function normalizeCommunity(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : defaultSettings.defaultCommunity;
}

function normalizeSupernode(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : defaultSettings.supernodeAddress;
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
    defaultCommunity: normalizeCommunity(window.localStorage.getItem(defaultCommunityKey)),
    supernodeAddress: normalizeSupernode(window.localStorage.getItem(supernodeAddressKey)),
    autoConnectOnLaunch: normalizeAutoConnect(window.localStorage.getItem(autoConnectOnLaunchKey)),
  };
}

export function saveAppSettings(input: Partial<AppSettings>): AppSettings {
  const current = resolveAppSettings();
  const nextSettings: AppSettings = {
    serverBaseUrl: normalizeServerBaseUrl(input.serverBaseUrl ?? current.serverBaseUrl),
    defaultRoomName: normalizeRoomName(input.defaultRoomName ?? current.defaultRoomName),
    defaultCommunity: normalizeCommunity(input.defaultCommunity ?? current.defaultCommunity),
    supernodeAddress: normalizeSupernode(input.supernodeAddress ?? current.supernodeAddress),
    autoConnectOnLaunch: normalizeAutoConnect(input.autoConnectOnLaunch ?? current.autoConnectOnLaunch),
  };

  window.localStorage.setItem(serverBaseUrlKey, nextSettings.serverBaseUrl);
  window.localStorage.setItem(defaultRoomNameKey, nextSettings.defaultRoomName);
  window.localStorage.setItem(defaultCommunityKey, nextSettings.defaultCommunity);
  window.localStorage.setItem(supernodeAddressKey, nextSettings.supernodeAddress);
  window.localStorage.setItem(autoConnectOnLaunchKey, String(nextSettings.autoConnectOnLaunch));
  return nextSettings;
}

export function getApiBaseUrl(): string {
  return resolveAppSettings().serverBaseUrl;
}
