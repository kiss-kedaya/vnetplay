use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

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
    secret_masked: String,
}

#[derive(Serialize)]
struct HeartbeatResponse {
    accepted: bool,
    node_id: String,
}

#[derive(Deserialize)]
struct CreateRoomRequest {
    room_id: String,
    game: String,
    mode: String,
    username: String,
}

#[derive(Deserialize)]
struct JoinRoomRequest {
    room_id: String,
    username: String,
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

    let active_room = rooms.first().cloned().unwrap_or(RoomSummary::new(
        "empty-room".to_string(),
        "Unknown".to_string(),
        "LAN Overlay".to_string(),
        "system".to_string(),
    ));

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

async fn create_room(
    State(state): State<AppState>,
    Json(payload): Json<CreateRoomRequest>,
) -> Result<Json<RoomSummary>, (StatusCode, String)> {
    let room_id = payload.room_id.trim();
    let username = payload.username.trim();

    if room_id.is_empty() || username.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "room_id and username are required".to_string()));
    }

    let mut rooms = state.rooms.lock().expect("rooms mutex poisoned");

    if rooms.iter().any(|item| item.room_id == room_id) {
        return Err((StatusCode::CONFLICT, "room already exists".to_string()));
    }

    let mut room = RoomSummary::new(
        room_id.to_string(),
        payload.game.trim().to_string(),
        payload.mode.trim().to_string(),
        username.to_string(),
    );
    room.ensure_participant(username);
    rooms.insert(0, room.clone());
    drop(rooms);
    state.persist();

    Ok(Json(room))
}

async fn join_room(
    State(state): State<AppState>,
    Json(payload): Json<JoinRoomRequest>,
) -> Result<Json<RoomSummary>, (StatusCode, String)> {
    let room_id = payload.room_id.trim();
    let username = payload.username.trim();

    if room_id.is_empty() || username.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "room_id and username are required".to_string()));
    }

    let mut rooms = state.rooms.lock().expect("rooms mutex poisoned");

    if let Some(room) = rooms.iter_mut().find(|item| item.room_id == room_id) {
        room.ensure_participant(username);
        let updated = room.clone();
        drop(rooms);
        state.persist();
        return Ok(Json(updated));
    }

    Err((StatusCode::NOT_FOUND, "room not found".to_string()))
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
        secret_masked: state.profile.secret_masked.clone(),
    })
}

async fn node_heartbeat(
    State(state): State<AppState>,
    Json(payload): Json<NodeHeartbeat>,
) -> Json<HeartbeatResponse> {
    let mut heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");
    heartbeats.insert(payload.node_id.clone(), payload.clone());
    drop(heartbeats);
    state.persist();

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
        .route("/api/rooms/create", post(create_room))
        .route("/api/rooms/join", post(join_room))
        .route("/api/network/status", get(network_status))
        .route("/api/nodes/heartbeat", post(node_heartbeat))
        .with_state(state)
}
