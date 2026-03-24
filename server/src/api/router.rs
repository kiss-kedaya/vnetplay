use axum::{routing::{get, post}, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

#[derive(Serialize)]
struct DashboardSummary {
    overlay_ip: &'static str,
    relay: &'static str,
    latency: &'static str,
    packet_loss: &'static str,
    active_room: &'static str,
    room_members: u32,
    supported_games: [&'static str; 2],
}

#[derive(Serialize)]
struct RoomItem {
    room_id: &'static str,
    game: &'static str,
    mode: &'static str,
    members: u32,
    host: &'static str,
}

#[derive(Serialize)]
struct NetworkStatus {
    overlay_ip: &'static str,
    relay: &'static str,
    route_mode: &'static str,
    edge_state: &'static str,
    latency: &'static str,
}

#[derive(Deserialize)]
struct HeartbeatRequest {
    node_id: String,
    overlay_ip: String,
    latency_ms: u32,
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

async fn dashboard_summary() -> Json<DashboardSummary> {
    Json(DashboardSummary {
        overlay_ip: "10.24.8.12",
        relay: "Tokyo Relay / VPS",
        latency: "32 ms",
        packet_loss: "0.2%",
        active_room: "sts2-night-run",
        room_members: 3,
        supported_games: ["Minecraft", "Slay the Spire 2"],
    })
}

async fn rooms() -> Json<Vec<RoomItem>> {
    Json(vec![
        RoomItem {
            room_id: "sts2-night-run",
            game: "Slay the Spire 2",
            mode: "LAN Overlay",
            members: 3,
            host: "kedaya-main",
        },
        RoomItem {
            room_id: "mc-build-world",
            game: "Minecraft",
            mode: "Overlay + Direct Join",
            members: 5,
            host: "kedaya-vps",
        },
    ])
}

async fn network_status() -> Json<NetworkStatus> {
    Json(NetworkStatus {
        overlay_ip: "10.24.8.12",
        relay: "Tokyo Relay / VPS",
        route_mode: "relay-preferred",
        edge_state: "running",
        latency: "32 ms",
    })
}

async fn node_heartbeat(Json(payload): Json<HeartbeatRequest>) -> Json<HeartbeatResponse> {
    let _ = (payload.overlay_ip.clone(), payload.latency_ms);

    Json(HeartbeatResponse {
        accepted: true,
        node_id: payload.node_id,
    })
}

pub fn build_router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/dashboard/summary", get(dashboard_summary))
        .route("/api/rooms", get(rooms))
        .route("/api/network/status", get(network_status))
        .route("/api/nodes/heartbeat", post(node_heartbeat))
}
