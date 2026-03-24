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

pub fn current_system_username() -> String {
    read_env(&["USERNAME", "USER", "LOGNAME"])
        .or_else(read_whoami)
        .unwrap_or_else(|| "player".to_string())
}
