use std::env;
use std::process::{Command, Stdio};

fn read_env(keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| env::var(key).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn read_whoami() -> Option<String> {
    let output = Command::new("whoami")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let raw = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if raw.is_empty() {
        return None;
    }

    raw.rsplit(['\\', '/'])
        .next()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn read_machine_guid() -> Option<String> {
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    stdout
        .lines()
        .find(|line| line.contains("MachineGuid"))
        .and_then(|line| line.split_whitespace().last())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn stable_hash(input: &str) -> String {
    let mut hash: u64 = 1469598103934665603;
    for byte in input.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(1099511628211);
    }
    format!("{:016x}", hash)
}

pub fn current_system_username() -> String {
    read_env(&["USERNAME", "USER", "LOGNAME"])
        .or_else(read_whoami)
        .unwrap_or_else(|| "player".to_string())
}

pub fn current_machine_id() -> String {
    let seed = read_machine_guid()
        .or_else(|| read_env(&["COMPUTERNAME", "HOSTNAME"]))
        .unwrap_or_else(|| "unknown-machine".to_string());

    stable_hash(&seed)
}

pub fn current_machine_label() -> String {
    current_machine_id().chars().take(8).collect()
}
