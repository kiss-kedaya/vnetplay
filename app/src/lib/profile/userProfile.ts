export type UserProfile = {
  systemUsername: string;
  username: string;
  source: "system" | "custom";
};

const storageKey = "vnetplay.user-profile.override";

function normalizeUsername(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "player";
}

export function resolveUserProfile(systemUsername: string): UserProfile {
  const normalizedSystem = normalizeUsername(systemUsername);
  const override = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
  const normalizedOverride = override?.trim();

  if (normalizedOverride) {
    return {
      systemUsername: normalizedSystem,
      username: normalizedOverride,
      source: "custom",
    };
  }

  return {
    systemUsername: normalizedSystem,
    username: normalizedSystem,
    source: "system",
  };
}

export function saveUserOverride(username: string, systemUsername: string): UserProfile {
  const normalized = normalizeUsername(username);
  const normalizedSystem = normalizeUsername(systemUsername);

  if (normalized === normalizedSystem) {
    clearUserOverride();
    return {
      systemUsername: normalizedSystem,
      username: normalizedSystem,
      source: "system",
    };
  }

  window.localStorage.setItem(storageKey, normalized);

  return {
    systemUsername: normalizedSystem,
    username: normalized,
    source: "custom",
  };
}

export function clearUserOverride(): void {
  window.localStorage.removeItem(storageKey);
}
