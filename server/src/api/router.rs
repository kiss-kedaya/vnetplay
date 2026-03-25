use std::collections::HashMap;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::DateTime;
use serde::{Deserialize, Serialize};

use crate::models::{AppState, RecentAction};
use crate::nodes::NodeHeartbeat;
use crate::rooms::RoomSummary;

const HEARTBEAT_TTL_SECONDS: i64 = 30;

fn heartbeat_timestamp_millis(heartbeat: &NodeHeartbeat) -> i64 {
    DateTime::parse_from_rfc3339(&heartbeat.received_at)
        .map(|timestamp| timestamp.timestamp_millis())
        .unwrap_or(0)
}

fn latest_heartbeat(heartbeats: &HashMap<String, NodeHeartbeat>) -> Option<&NodeHeartbeat> {
    heartbeats
        .values()
        .filter(|heartbeat| heartbeat.is_recent(HEARTBEAT_TTL_SECONDS))
        .max_by_key(|heartbeat| heartbeat_timestamp_millis(heartbeat))
}

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
    recent_action: RecentAction,
}

#[derive(Serialize)]
struct RecentActionList {
    items: Vec<RecentAction>,
}

#[derive(Serialize)]
struct HeartbeatResponse {
    accepted: bool,
    node_id: String,
}

#[derive(Serialize)]
struct LeaveRoomResponse {
    room_id: String,
    room_exists: bool,
    removed_client: bool,
    members: usize,
}

#[derive(Deserialize)]
struct CreateRoomRequest {
    room_id: String,
    game: String,
    mode: String,
    username: String,
    client_id: String,
    password: Option<String>,
}

#[derive(Deserialize)]
struct JoinRoomRequest {
    room_id: String,
    username: String,
    client_id: String,
    password: Option<String>,
}

#[derive(Deserialize)]
struct LeaveRoomRequest {
    room_id: String,
    username: String,
    client_id: String,
}

#[derive(Deserialize)]
struct SyncRecentActionRequest {
    action: String,
    room_id: String,
    username: String,
    detail: String,
    success: bool,
    source: Option<String>,
    pid: Option<u32>,
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
    let latest_heartbeat = latest_heartbeat(&heartbeats);

    let active_room = rooms.first().cloned().unwrap_or(RoomSummary::new(
        "empty-room".to_string(),
        "Unknown".to_string(),
        "LAN Overlay".to_string(),
        "system".to_string(),
        "unknown-machine".to_string(),
    ));

    let overlay_ip = latest_heartbeat
        .map(|item| item.overlay_ip.clone())
        .unwrap_or_else(|| "10.24.8.12".to_string());

    let latency_ms = latest_heartbeat.map(|item| item.latency_ms).unwrap_or(32);

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
    let client_id = payload.client_id.trim();

    if room_id.is_empty() || username.is_empty() || client_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "room_id, username, and client_id are required".to_string(),
        ));
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
        client_id.to_string(),
    );
    room.set_password(payload.password);
    room.ensure_participant(username, client_id);
    rooms.insert(0, room.clone());
    drop(rooms);
    state.set_recent_action(
        RecentAction::new(
            "room-created",
            &room.room_id,
            username,
            &format!("room {} created and joined", room.room_id),
            true,
        )
        .with_source("server-room")
        .with_pid(None),
    );
    state.persist();

    Ok(Json(room))
}

async fn join_room(
    State(state): State<AppState>,
    Json(payload): Json<JoinRoomRequest>,
) -> Result<Json<RoomSummary>, (StatusCode, String)> {
    let room_id = payload.room_id.trim();
    let username = payload.username.trim();
    let client_id = payload.client_id.trim();

    if room_id.is_empty() || username.is_empty() || client_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "room_id, username, and client_id are required".to_string(),
        ));
    }

    let mut rooms = state.rooms.lock().expect("rooms mutex poisoned");

    if let Some(room) = rooms.iter_mut().find(|item| item.room_id == room_id) {
        if !room.password_matches(payload.password.as_deref()) {
            return Err((
                StatusCode::UNAUTHORIZED,
                "room password is required or incorrect".to_string(),
            ));
        }

        room.ensure_participant(username, client_id);
        let updated = room.clone();
        drop(rooms);
        state.set_recent_action(
            RecentAction::new(
                "room-joined",
                &updated.room_id,
                username,
                &format!("user {} joined room {}", username, updated.room_id),
                true,
            )
            .with_source("server-room")
            .with_pid(None),
        );
        state.persist();
        return Ok(Json(updated));
    }

    Err((StatusCode::NOT_FOUND, "room not found".to_string()))
}

async fn leave_room(
    State(state): State<AppState>,
    Json(payload): Json<LeaveRoomRequest>,
) -> Result<Json<LeaveRoomResponse>, (StatusCode, String)> {
    let room_id = payload.room_id.trim();
    let username = payload.username.trim();
    let client_id = payload.client_id.trim();

    if room_id.is_empty() || username.is_empty() || client_id.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "room_id, username, and client_id are required".to_string(),
        ));
    }

    let mut rooms = state.rooms.lock().expect("rooms mutex poisoned");

    if let Some(index) = rooms.iter().position(|item| item.room_id == room_id) {
        let mut room = rooms[index].clone();
        let removed_client = room.remove_participant(client_id);
        let response = if room.is_empty() {
            rooms.remove(index);
            LeaveRoomResponse {
                room_id: room_id.to_string(),
                room_exists: false,
                removed_client,
                members: 0,
            }
        } else {
            let members = room.members;
            rooms[index] = room;
            LeaveRoomResponse {
                room_id: room_id.to_string(),
                room_exists: true,
                removed_client,
                members,
            }
        };

        drop(rooms);

        let detail = if response.removed_client {
            if response.room_exists {
                format!("user {} left room {}", username, room_id)
            } else {
                format!("user {} left room {} and the room closed", username, room_id)
            }
        } else {
            format!(
                "user {} attempted to leave room {} but was not present",
                username, room_id
            )
        };

        state.set_recent_action(
            RecentAction::new(
                if response.removed_client {
                    "room-left"
                } else {
                    "room-leave-skipped"
                },
                room_id,
                username,
                &detail,
                response.removed_client,
            )
            .with_source("server-room")
            .with_pid(None),
        );
        state.persist();

        return Ok(Json(response));
    }

    Ok(Json(LeaveRoomResponse {
        room_id: room_id.to_string(),
        room_exists: false,
        removed_client: false,
        members: 0,
    }))
}

async fn network_status(State(state): State<AppState>) -> Json<NetworkStatus> {
    let heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");
    let latest_heartbeat = latest_heartbeat(&heartbeats);
    let recent_action = state
        .recent_action
        .lock()
        .expect("recent_action mutex poisoned")
        .clone();
    let overlay_ip = latest_heartbeat
        .map(|item| item.overlay_ip.clone())
        .unwrap_or_else(|| "10.24.8.12".to_string());
    let latency_ms = latest_heartbeat.map(|item| item.latency_ms).unwrap_or(32);

    Json(NetworkStatus {
        overlay_ip,
        relay: "Tokyo Relay / VPS".to_string(),
        route_mode: "relay-preferred",
        edge_state: if latest_heartbeat.is_none() {
            "idle"
        } else {
            "running"
        },
        latency: format!("{} ms", latency_ms),
        community: state.profile.community.clone(),
        supernode: state.profile.supernode.clone(),
        secret_masked: state.profile.secret_masked.clone(),
        recent_action,
    })
}

async fn sync_recent_action(
    State(state): State<AppState>,
    Json(payload): Json<SyncRecentActionRequest>,
) -> Result<Json<RecentAction>, (StatusCode, String)> {
    let action = payload.action.trim();
    let room_id = payload.room_id.trim();
    let username = payload.username.trim();
    let detail = payload.detail.trim();

    if action.is_empty() || room_id.is_empty() || username.is_empty() || detail.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "action, room_id, username, and detail are required".to_string(),
        ));
    }

    let recent_action = RecentAction::new(action, room_id, username, detail, payload.success)
        .with_source(payload.source.as_deref().unwrap_or("desktop-bridge"))
        .with_pid(payload.pid);
    state.set_recent_action(recent_action.clone());
    state.persist();

    Ok(Json(recent_action))
}

async fn recent_actions(State(state): State<AppState>) -> Json<RecentActionList> {
    let items = state
        .recent_actions
        .lock()
        .expect("recent_actions mutex poisoned")
        .clone();

    Json(RecentActionList { items })
}

async fn node_heartbeat(
    State(state): State<AppState>,
    Json(mut payload): Json<NodeHeartbeat>,
) -> Json<HeartbeatResponse> {
    payload.received_at = chrono::Utc::now().to_rfc3339();
    let mut heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");
    heartbeats.insert(payload.node_id.clone(), payload.clone());
    drop(heartbeats);
    state.set_recent_action(
        RecentAction::new(
            "node-heartbeat",
            "heartbeat",
            &payload.node_id,
            &format!(
                "node {} heartbeat overlay {} {}ms",
                payload.node_id, payload.overlay_ip, payload.latency_ms
            ),
            true,
        )
        .with_source("server-heartbeat")
        .with_pid(None),
    );
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
        .route("/api/rooms/leave", post(leave_room))
        .route("/api/network/status", get(network_status))
        .route("/api/network/actions", get(recent_actions))
        .route("/api/network/action", post(sync_recent_action))
        .route("/api/nodes/heartbeat", post(node_heartbeat))
        .with_state(state)
}
