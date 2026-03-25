use std::process::{Command, Stdio};

pub fn current_route(supernode: &str, latency_ms: Option<u32>) -> String {
    match latency_ms {
        Some(latency_ms) => format!(
            "supernode {} reachable in {} ms",
            parse_supernode_host(supernode).unwrap_or_else(|| supernode.to_string()),
            latency_ms
        ),
        None => format!(
            "supernode {} latency probe unavailable",
            parse_supernode_host(supernode).unwrap_or_else(|| supernode.to_string())
        ),
    }
}

pub fn parse_supernode_host(supernode: &str) -> Option<String> {
    let trimmed = supernode.trim();
    if trimmed.is_empty() {
        return None;
    }

    if let Some(stripped) = trimmed.strip_prefix('[') {
        return stripped
            .split(']')
            .next()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(str::to_string);
    }

    if let Some((host, port)) = trimmed.rsplit_once(':') {
        if port.chars().all(|char| char.is_ascii_digit()) && !host.contains(':') {
            return Some(host.trim().to_string());
        }
    }

    Some(trimmed.to_string())
}

fn extract_latency_ms(output: &str) -> Option<u32> {
    output.match_indices("ms").find_map(|(index, _)| {
        let prefix = &output[..index];
        let mut value = String::new();

        for char in prefix.chars().rev() {
            if char.is_ascii_digit() || char == '.' {
                value.insert(0, char);
            } else if value.is_empty() {
                continue;
            } else {
                break;
            }
        }

        value
            .parse::<f32>()
            .ok()
            .filter(|parsed| *parsed >= 0.0)
            .map(|parsed| parsed.round() as u32)
    })
}

pub fn probe_latency_ms(supernode: &str) -> Option<u32> {
    let host = parse_supernode_host(supernode)?;

    #[cfg(target_os = "windows")]
    let output = Command::new("ping")
        .args(["-n", "1", "-w", "1200", &host])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    #[cfg(not(target_os = "windows"))]
    let output = Command::new("ping")
        .args(["-c", "1", "-W", "1", &host])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    extract_latency_ms(&stdout)
}
