use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize)]
pub struct InspectSnapshot {
    pub room_id: String,
    pub username: String,
    pub community: String,
    pub supernode: String,
    pub command_preview: String,
    pub edge_state: String,
    pub last_command: String,
    pub runtime_started_at: String,
    pub last_started_at: String,
    pub last_stopped_at: String,
    pub last_pid: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
pub struct CommandResponse {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
    pub inspect: Option<InspectSnapshot>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SystemIdentityResponse {
    pub system_username: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct StartNetworkRequest {
    pub room_id: String,
    pub username: String,
    pub community: String,
    pub supernode: String,
}
