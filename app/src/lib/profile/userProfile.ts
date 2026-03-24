export type UserProfile = {
  systemUsername: string;
  username: string;
  source: "system" | "custom";
  machineId: string;
  machineLabel: string;
};

const storageKey = "vnetplay.user-profile.override";

function normalizeUsername(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "player";
}

function normalizeMachineId(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "unknown-machine";
}

function normalizeMachineLabel(value: string | null | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "unknown";
}

export function resolveUserProfile(systemUsername: string, machineId: string, machineLabel: string): UserProfile {
  const normalizedSystem = normalizeUsername(systemUsername);
  const normalizedMachineId = normalizeMachineId(machineId);
  const normalizedMachineLabel = normalizeMachineLabel(machineLabel);
  const override = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
  const normalizedOverride = override?.trim();

  if (normalizedOverride) {
    return {
      systemUsername: normalizedSystem,
      username: normalizedOverride,
      source: "custom",
      machineId: normalizedMachineId,
      machineLabel: normalizedMachineLabel,
    };
  }

  return {
    systemUsername: normalizedSystem,
    username: normalizedSystem,
    source: "system",
    machineId: normalizedMachineId,
    machineLabel: normalizedMachineLabel,
  };
}

export function saveUserOverride(username: string, systemUsername: string, machineId: string, machineLabel: string): UserProfile {
  const normalized = normalizeUsername(username);
  const normalizedSystem = normalizeUsername(systemUsername);
  const normalizedMachineId = normalizeMachineId(machineId);
  const normalizedMachineLabel = normalizeMachineLabel(machineLabel);

  if (normalized === normalizedSystem) {
    clearUserOverride();
    return {
      systemUsername: normalizedSystem,
      username: normalizedSystem,
      source: "system",
      machineId: normalizedMachineId,
      machineLabel: normalizedMachineLabel,
    };
  }

  window.localStorage.setItem(storageKey, normalized);

  return {
    systemUsername: normalizedSystem,
    username: normalized,
    source: "custom",
    machineId: normalizedMachineId,
    machineLabel: normalizedMachineLabel,
  };
}

export function clearUserOverride(): void {
  window.localStorage.removeItem(storageKey);
}
