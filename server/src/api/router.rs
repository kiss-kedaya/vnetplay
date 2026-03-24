use axum::{routing::get, Json, Router};
use serde::Serialize;

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

pub fn build_router() -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/api/dashboard/summary", get(dashboard_summary))
}
