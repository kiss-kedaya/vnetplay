use std::env;

fn read_env(keys: &[&str]) -> Option<String> {
    keys.iter()
        .find_map(|key| env::var(key).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

pub fn current_system_username() -> String {
    read_env(&["USERNAME", "USER", "LOGNAME"]).unwrap_or_else(|| "player".to_string())
}
