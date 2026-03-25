use std::process::{Command, Stdio};

use crate::network::route_probe::{current_route, probe_latency_ms};

#[derive(Clone, Debug)]
pub struct NodeStatus {
    pub overlay_ip: String,
    pub relay_hint: String,
    pub latency_ms: Option<u32>,
}

fn is_overlay_adapter_name(line: &str) -> bool {
    let lower = line.to_ascii_lowercase();
    ["n2n", "tap", "tun", "wintun", "vnetplay"]
        .iter()
        .any(|keyword| lower.contains(keyword))
}

fn extract_ipv4(line: &str) -> Option<String> {
    line.split(|char: char| !(char.is_ascii_digit() || char == '.'))
        .find(|segment| {
            let mut parts = segment.split('.');
            parts.clone().count() == 4
                && parts.all(|part| !part.is_empty() && part.parse::<u8>().is_ok())
        })
        .map(str::to_string)
}

#[cfg(target_os = "windows")]
fn detect_overlay_ip() -> Option<String> {
    let output = Command::new("ipconfig")
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut overlay_adapter = false;

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.ends_with(':') {
            overlay_adapter = is_overlay_adapter_name(trimmed);
            continue;
        }

        if overlay_adapter && trimmed.contains("IPv4") {
            if let Some(ip) = extract_ipv4(trimmed) {
                return Some(ip);
            }
        }
    }

    None
}

#[cfg(not(target_os = "windows"))]
fn detect_overlay_ip() -> Option<String> {
    let output = Command::new("ip")
        .args(["addr", "show"])
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut overlay_adapter = false;

    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.contains(':') && !line.starts_with(' ') {
            overlay_adapter = is_overlay_adapter_name(trimmed);
            continue;
        }

        if overlay_adapter && trimmed.starts_with("inet ") {
            if let Some(address) = trimmed.split_whitespace().nth(1) {
                if let Some(ip) = address.split('/').next() {
                    return Some(ip.to_string());
                }
            }
        }
    }

    None
}

pub fn current_node_status(supernode: &str) -> NodeStatus {
    let overlay_ip = detect_overlay_ip().unwrap_or_else(|| "--".to_string());
    let latency_ms = probe_latency_ms(supernode);
    let relay_hint = current_route(supernode, latency_ms);

    NodeStatus {
        overlay_ip,
        relay_hint,
        latency_ms,
    }
}
