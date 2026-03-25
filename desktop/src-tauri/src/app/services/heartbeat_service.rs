use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use reqwest::blocking::Client;
use serde::Serialize;

use crate::app::services::n2n_service::is_edge_pid_alive;
use crate::app::state::DesktopState;
use crate::network::node_status::current_node_status;

const HEARTBEAT_INTERVAL_SECONDS: u64 = 8;
const REQUEST_TIMEOUT_SECONDS: u64 = 5;

#[derive(Clone, Debug, Serialize)]
struct HeartbeatPayload {
    node_id: String,
    room_id: String,
    username: String,
    client_id: String,
    overlay_ip: String,
    latency_ms: u32,
    relay_hint: String,
    active: bool,
}

fn normalize_server_base_url(value: &str) -> Option<String> {
    let trimmed = value.trim().trim_end_matches('/');
    (!trimmed.is_empty()).then(|| trimmed.to_string())
}

fn build_payload(state: &DesktopState, active: bool) -> Option<HeartbeatPayload> {
    let room_id = state.active_room.trim();
    let username = state.current_username.trim();
    let client_id = state.current_machine_id.trim();

    if room_id.is_empty() || room_id == "未连接" || username.is_empty() || client_id.is_empty() {
        return None;
    }

    let node_status = active.then(|| current_node_status(&state.current_supernode));

    Some(HeartbeatPayload {
        node_id: client_id.to_string(),
        room_id: room_id.to_string(),
        username: username.to_string(),
        client_id: client_id.to_string(),
        overlay_ip: node_status
            .as_ref()
            .map(|status| status.overlay_ip.clone())
            .unwrap_or_else(|| "--".to_string()),
        latency_ms: node_status
            .as_ref()
            .and_then(|status| status.latency_ms)
            .unwrap_or(0),
        relay_hint: node_status
            .map(|status| status.relay_hint)
            .unwrap_or_else(|| "stopped".to_string()),
        active,
    })
}

fn post_payload(
    client: &Client,
    server_base_url: &str,
    payload: &HeartbeatPayload,
) -> Result<(), String> {
    let target = format!("{}/api/nodes/heartbeat", server_base_url);
    client
        .post(target)
        .json(payload)
        .send()
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;

    Ok(())
}

pub fn send_heartbeat_once(state: &DesktopState, active: bool) -> Result<(), String> {
    let Some(server_base_url) = normalize_server_base_url(&state.current_server_base_url) else {
        return Ok(());
    };

    let Some(payload) = build_payload(state, active) else {
        return Ok(());
    };

    let client = Client::builder()
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
        .build()
        .map_err(|error| error.to_string())?;

    post_payload(&client, &server_base_url, &payload)
}

pub fn spawn_heartbeat_loop(state: Arc<Mutex<DesktopState>>, generation: u64) {
    thread::spawn(move || {
        let client = match Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
            .build()
        {
            Ok(client) => client,
            Err(_) => return,
        };

        loop {
            let snapshot = {
                let state = state.lock().expect("desktop state mutex poisoned");
                state.clone()
            };

            if snapshot.heartbeat_generation != generation {
                break;
            }

            let Some(pid) = snapshot.last_pid else {
                break;
            };

            if !is_edge_pid_alive(pid) {
                let _ = send_heartbeat_once(&snapshot, false);
                break;
            }

            let Some(server_base_url) =
                normalize_server_base_url(&snapshot.current_server_base_url)
            else {
                break;
            };

            let Some(payload) = build_payload(&snapshot, true) else {
                break;
            };

            let _ = post_payload(&client, &server_base_url, &payload);
            thread::sleep(Duration::from_secs(HEARTBEAT_INTERVAL_SECONDS));
        }
    });
}
