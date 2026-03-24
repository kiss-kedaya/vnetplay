use axum::{extract::State, routing::{get, post}, Json, Router};
use serde::Serialize;

use crate::models::AppState;
use crate::nodes::NodeHeartbeat;
use crate::rooms::RoomSummary;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

#[derive(Serialize)]
struct DashboardSummary {
    overlay_ip: String,
    relay: String,
    latency: String,
    packet_loss: String,
    active_room: String,
    room_members: u32,
    supported_games: [&'static str; 2],
}

#[derive(Serialize)]
struct NetworkStatus {
    overlay_ip: String,
    relay: String,
    route_mode: &'static str,
    edge_state: &'static str,
    latency: String,
    community: String,
    supernode: String,
}

#[derive(Serialize)]
struct HeartbeatResponse {
    accepted: bool,
    node_id: String,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "vnetplay-server",
    })
}

async fn dashboard_summary(State(state): State<AppState>) -> Json<DashboardSummary> {
    let rooms = state.rooms.lock().expect("rooms mutex poisoned");
    let heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");

    let active_room = rooms.first().cloned().unwrap_or(RoomSummary {
        room_id: "empty-room".to_string(),
        game: "Unknown".to_string(),
        mode: "LAN Overlay".to_string(),
        members: 0,
        host: "system".to_string(),
    });

    let overlay_ip = heartbeats
        .values()
        .next()
        .map(|item| item.overlay_ip.clone())
        .unwrap_or_else(|| "10.24.8.12".to_string());

    let latency_ms = heartbeats.values().next().map(|item| item.latency_ms).unwrap_or(32);

    Json(DashboardSummary {
        overlay_ip,
        relay: "Tokyo Relay / VPS".to_string(),
        latency: format!("{} ms", latency_ms),
        packet_loss: "0.2%".to_string(),
        active_room: active_room.room_id,
        room_members: active_room.members as u32,
        supported_games: ["Minecraft", "Slay the Spire 2"],
    })
}

async fn rooms(State(state): State<AppState>) -> Json<Vec<RoomSummary>> {
    let rooms = state.rooms.lock().expect("rooms mutex poisoned");
    Json(rooms.clone())
}

async fn network_status(State(state): State<AppState>) -> Json<NetworkStatus> {
    let heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");
    let overlay_ip = heartbeats
        .values()
        .next()
        .map(|item| item.overlay_ip.clone())
        .unwrap_or_else(|| "10.24.8.12".to_string());
    let latency_ms = heartbeats.values().next().map(|item| item.latency_ms).unwrap_or(32);

    Json(NetworkStatus {
        overlay_ip,
        relay: "Tokyo Relay / VPS".to_string(),
        route_mode: "relay-preferred",
        edge_state: if heartbeats.is_empty() { "idle" } else { "running" },
        latency: format!("{} ms", latency_ms),
        community: state.profile.community.clone(),
        supernode: state.profile.supernode.clone(),
    })
}

async fn node_heartbeat(
    State(state): State<AppState>,
    Json(payload): Json<NodeHeartbeat>,
) -> Json<HeartbeatResponse> {
    let mut heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");
    heartbeats.insert(payload.node_id.clone(), payload.clone());

    Json(HeartbeatResponse {
        accepted: true,
        node_id: payload.node_id,
    })
}

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/dashboard/summary", get(dashboard_summary))
        .route("/api/rooms", get(rooms))
        .route("/api/network/status", get(network_status))
        .route("/api/nodes/heartbeat", post(node_heartbeat))
        .with_state(state)
}
