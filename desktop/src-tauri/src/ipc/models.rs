use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize)]
pub struct CommandResponse {
    pub ok: bool,
    pub detail: String,
    pub pid: Option<u32>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SystemIdentityResponse {
    pub system_username: String,
}

#[derive(Clone, Debug, Deserialize)]
pub struct StartNetworkRequest {
    pub room_id: String,
    pub username: String,
}
