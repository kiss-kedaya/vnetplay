export type UserProfile = {
  systemUsername: string;
  username: string;
  source: "system" | "custom" | "qq";
  machineId: string;
  machineLabel: string;
  // QQ登录信息
  qqNickname?: string;
  qqAvatar?: string;
  qqUid?: string;
};

const storageKey = "vnetplay.user-profile.override";
const qqLoginKey = "vnetplay.qq-login";

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

function getQQLoginInfo(): { nickname: string; avatar: string; qqUid: string } | null {
  if (typeof window === "undefined") {
    return null;
  }
  
  try {
    const stored = localStorage.getItem(qqLoginKey);
    if (stored) {
      const data = JSON.parse(stored);
      return {
        nickname: data.nickname || "",
        avatar: data.avatar || "",
        qqUid: data.qqUid || "",
      };
    }
  } catch (error) {
    console.error("Error reading QQ login info:", error);
  }
  
  return null;
}

export function resolveUserProfile(
  systemUsername: string,
  machineId: string,
  machineLabel: string
): UserProfile {
  const normalizedSystem = normalizeUsername(systemUsername);
  const normalizedMachineId = normalizeMachineId(machineId);
  const normalizedMachineLabel = normalizeMachineLabel(machineLabel);
  
  // 优先检查QQ登录
  const qqInfo = getQQLoginInfo();
  if (qqInfo && qqInfo.nickname) {
    return {
      systemUsername: normalizedSystem,
      username: qqInfo.nickname,
      source: "qq",
      machineId: normalizedMachineId,
      machineLabel: normalizedMachineLabel,
      qqNickname: qqInfo.nickname,
      qqAvatar: qqInfo.avatar,
      qqUid: qqInfo.qqUid,
    };
  }
  
  // 检查自定义用户名
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

export function saveUserOverride(
  username: string,
  systemUsername: string,
  machineId: string,
  machineLabel: string
): UserProfile {
  const normalized = normalizeUsername(username);
  const normalizedSystem = normalizeUsername(systemUsername);
  const normalizedMachineId = normalizeMachineId(machineId);
  const normalizedMachineLabel = normalizeMachineLabel(machineLabel);
  
  // 如果已登录QQ，不允许手动修改用户名
  const qqInfo = getQQLoginInfo();
  if (qqInfo && qqInfo.nickname) {
    return {
      systemUsername: normalizedSystem,
      username: qqInfo.nickname,
      source: "qq",
      machineId: normalizedMachineId,
      machineLabel: normalizedMachineLabel,
      qqNickname: qqInfo.nickname,
      qqAvatar: qqInfo.avatar,
      qqUid: qqInfo.qqUid,
    };
  }
  
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

export function getDisplayUsername(profile: UserProfile): string {
  return profile.username;
}

export function getDisplayAvatar(profile: UserProfile): string | null {
  return profile.qqAvatar || null;
}

export function getProfileIdentityLabel(profile: UserProfile): string {
  if (profile.source === "qq" && profile.qqUid) {
    return `QQ UID · ${profile.qqUid}`;
  }

  if (profile.machineLabel && profile.machineLabel !== "unknown") {
    return profile.machineLabel;
  }

  if (profile.machineId && profile.machineId !== "unknown-machine") {
    return `设备 ID · ${profile.machineId}`;
  }

  return "本机标识未识别";
}

export function isQQLoggedIn(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  
  try {
    const stored = localStorage.getItem(qqLoginKey);
    return stored !== null;
  } catch {
    return false;
  }
}
