use std::collections::HashMap;

use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
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

#[derive(Serialize)]
struct RoomMemberDetail {
    client_id: String,
    username: String,
    is_host: bool,
    presence: String,
    last_action: String,
    last_seen_at: String,
    detail: String,
}

#[derive(Serialize)]
struct RoomResponse {
    #[serde(flatten)]
    room: RoomSummary,
    member_details: Vec<RoomMemberDetail>,
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

#[derive(Deserialize)]
struct RoomScopedQuery {
    room_id: Option<String>,
}

fn normalized_room_scope(query: &RoomScopedQuery) -> Option<&str> {
    query
        .room_id
        .as_deref()
        .map(str::trim)
        .filter(|room_id| !room_id.is_empty())
}

fn fallback_recent_action(room_id: Option<&str>) -> RecentAction {
    match room_id {
        Some(room_id) => RecentAction {
            action: "idle".to_string(),
            room_id: room_id.to_string(),
            username: "player".to_string(),
            detail: format!("尚未收到房间 {} 的最近动作", room_id),
            success: true,
            updated_at: "--".to_string(),
            source: "server".to_string(),
            pid: None,
        },
        None => RecentAction::idle(),
    }
}

fn latest_recent_action_for_room(items: &[RecentAction], room_id: Option<&str>) -> RecentAction {
    match room_id {
        Some(room_id) => items
            .iter()
            .find(|item| item.room_id == room_id)
            .cloned()
            .unwrap_or_else(|| fallback_recent_action(Some(room_id))),
        None => items
            .first()
            .cloned()
            .unwrap_or_else(RecentAction::idle),
    }
}

fn recent_action_age_seconds(action: &RecentAction) -> Option<i64> {
    DateTime::parse_from_rfc3339(&action.updated_at)
        .ok()
        .map(|timestamp| (Utc::now() - timestamp.with_timezone(&Utc)).num_seconds().max(0))
}

fn build_room_member_detail(
    room: &RoomSummary,
    username: &str,
    client_id: &str,
    recent_actions: &[RecentAction],
) -> RoomMemberDetail {
    let latest_action = recent_actions.iter().find(|item| {
        item.room_id == room.room_id && (item.username == username || item.username == client_id)
    });

    let (presence, last_action, last_seen_at, detail) = match latest_action {
        Some(action) => {
            let age = recent_action_age_seconds(action).unwrap_or(i64::MAX);
            let presence = if action.source.starts_with("desktop")
                && !action.action.contains("stop")
                && age <= HEARTBEAT_TTL_SECONDS
            {
                "online"
            } else if matches!(action.action.as_str(), "room-created" | "room-joined") && age <= 1800 {
                "joined"
            } else if age <= 7200 {
                "recent"
            } else {
                "offline"
            };

            let detail = match presence {
                "online" => format!("最近一次动作是 {}，当前视为在线", action.action),
                "joined" => format!("最近一次动作是 {}，已加入房间但未确认网络在线", action.action),
                "recent" => format!("最近一次动作是 {}，但已超过实时在线窗口", action.action),
                _ => format!("最近一次动作是 {}，当前无在线迹象", action.action),
            };

            (
                presence.to_string(),
                action.action.clone(),
                action.updated_at.clone(),
                detail,
            )
        }
        None => (
            "joined".to_string(),
            "room-snapshot".to_string(),
            room.last_active_at.clone(),
            "已在房间列表中登记，但尚未收到该成员的运行态回写".to_string(),
        ),
    };

    RoomMemberDetail {
        client_id: client_id.to_string(),
        username: username.to_string(),
        is_host: room.host_id == client_id || room.host == username,
        presence,
        last_action,
        last_seen_at,
        detail,
    }
}

fn build_room_response(room: RoomSummary, recent_actions: &[RecentAction]) -> RoomResponse {
    let member_count = room.participants.len().max(room.participant_ids.len());
    let member_details = (0..member_count)
        .map(|index| {
            let username = room
                .participants
                .get(index)
                .cloned()
                .unwrap_or_else(|| room.host.clone());
            let client_id = room
                .participant_ids
                .get(index)
                .cloned()
                .unwrap_or_else(|| format!("{}-{}", room.host_id, index));

            build_room_member_detail(&room, &username, &client_id, recent_actions)
        })
        .collect();

    RoomResponse { room, member_details }
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
        "未连接".to_string(),
        "Unknown".to_string(),
        "LAN Overlay".to_string(),
        "system".to_string(),
        "unknown-machine".to_string(),
    ));

    let overlay_ip = latest_heartbeat
        .map(|item| item.overlay_ip.clone())
        .unwrap_or_else(|| "--".to_string());

    let latency = latest_heartbeat
        .map(|item| format!("{} ms", item.latency_ms))
        .unwrap_or_else(|| "--".to_string());

    Json(DashboardSummary {
        overlay_ip,
        relay: if latest_heartbeat.is_some() {
            "Tokyo Relay / VPS".to_string()
        } else {
            "服务端未连接".to_string()
        },
        latency,
        packet_loss: if latest_heartbeat.is_some() {
            "0.2%".to_string()
        } else {
            "--".to_string()
        },
        active_room: active_room.room_id,
        room_members: active_room.members as u32,
        supported_games: ["Minecraft", "Slay the Spire 2"],
    })
}

async fn rooms(State(state): State<AppState>) -> Json<Vec<RoomResponse>> {
    let rooms = state.rooms.lock().expect("rooms mutex poisoned");
    let room_items = rooms.clone();
    drop(rooms);

    let recent_actions = state
        .recent_actions
        .lock()
        .expect("recent_actions mutex poisoned")
        .clone();

    Json(
        room_items
            .into_iter()
            .map(|room| build_room_response(room, &recent_actions))
            .collect(),
    )
}

async fn create_room(
    State(state): State<AppState>,
    Json(payload): Json<CreateRoomRequest>,
) -> Result<Json<RoomResponse>, (StatusCode, String)> {
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

    let recent_actions = state
        .recent_actions
        .lock()
        .expect("recent_actions mutex poisoned")
        .clone();

    Ok(Json(build_room_response(room, &recent_actions)))
}

async fn join_room(
    State(state): State<AppState>,
    Json(payload): Json<JoinRoomRequest>,
) -> Result<Json<RoomResponse>, (StatusCode, String)> {
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
        let recent_actions = state
            .recent_actions
            .lock()
            .expect("recent_actions mutex poisoned")
            .clone();
        return Ok(Json(build_room_response(updated, &recent_actions)));
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

async fn network_status(
    State(state): State<AppState>,
    Query(query): Query<RoomScopedQuery>,
) -> Json<NetworkStatus> {
    let heartbeats = state.heartbeats.lock().expect("heartbeats mutex poisoned");
    let latest_heartbeat = latest_heartbeat(&heartbeats);
    let room_scope = normalized_room_scope(&query);
    let recent_action = {
        let recent_actions = state
            .recent_actions
            .lock()
            .expect("recent_actions mutex poisoned");
        latest_recent_action_for_room(&recent_actions, room_scope)
    };
    let overlay_ip = latest_heartbeat
        .map(|item| item.overlay_ip.clone())
        .unwrap_or_else(|| "--".to_string());
    let latency = latest_heartbeat
        .map(|item| format!("{} ms", item.latency_ms))
        .unwrap_or_else(|| "--".to_string());

    Json(NetworkStatus {
        overlay_ip,
        relay: if latest_heartbeat.is_some() {
            "Tokyo Relay / VPS".to_string()
        } else {
            "服务端未连接".to_string()
        },
        route_mode: if latest_heartbeat.is_some() {
            "relay-preferred"
        } else {
            "unknown"
        },
        edge_state: if latest_heartbeat.is_none() {
            "idle"
        } else {
            "running"
        },
        latency,
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

async fn recent_actions(
    State(state): State<AppState>,
    Query(query): Query<RoomScopedQuery>,
) -> Json<RecentActionList> {
    let room_scope = normalized_room_scope(&query);
    let items = state
        .recent_actions
        .lock()
        .expect("recent_actions mutex poisoned")
        .iter()
        .filter(|item| room_scope.is_none_or(|room_id| item.room_id == room_id))
        .cloned()
        .collect();

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
