use chrono::Utc;
use serde::{Deserialize, Serialize};

fn current_timestamp() -> String {
    Utc::now().to_rfc3339()
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RoomSummary {
    pub room_id: String,
    pub game: String,
    pub mode: String,
    pub members: usize,
    pub host: String,
    #[serde(default)]
    pub participants: Vec<String>,
    #[serde(default = "current_timestamp")]
    pub created_at: String,
    #[serde(default = "current_timestamp")]
    pub last_active_at: String,
}

impl RoomSummary {
    pub fn new(room_id: String, game: String, mode: String, host: String) -> Self {
        let timestamp = current_timestamp();

        Self {
            room_id,
            game,
            mode,
            members: 0,
            host,
            participants: Vec::new(),
            created_at: timestamp.clone(),
            last_active_at: timestamp,
        }
    }

    pub fn ensure_participant(&mut self, username: &str) {
        if !self.participants.iter().any(|item| item == username) {
            self.participants.push(username.to_string());
        }

        self.members = self.participants.len();
        self.last_active_at = current_timestamp();

        if self.host.trim().is_empty() {
            self.host = username.to_string();
        }
    }

    pub fn normalize(&mut self) {
        if self.created_at.trim().is_empty() {
            self.created_at = current_timestamp();
        }

        if self.last_active_at.trim().is_empty() {
            self.last_active_at = self.created_at.clone();
        }

        if self.host.trim().is_empty() {
            self.host = "system".to_string();
        }

        self.members = self.participants.len().max(self.members);
    }
}

pub fn default_rooms() -> Vec<RoomSummary> {
    let mut first = RoomSummary::new(
        "sts2-night-run".to_string(),
        "Slay the Spire 2".to_string(),
        "LAN Overlay".to_string(),
        "kedaya-main".to_string(),
    );
    first.participants = vec![
        "kedaya-main".to_string(),
        "kedaya-vps".to_string(),
        "relay-preferred".to_string(),
    ];
    first.normalize();

    let mut second = RoomSummary::new(
        "mc-build-world".to_string(),
        "Minecraft".to_string(),
        "Overlay + Direct Join".to_string(),
        "kedaya-vps".to_string(),
    );
    second.participants = vec![
        "kedaya-vps".to_string(),
        "kedaya-main".to_string(),
        "builder-01".to_string(),
        "builder-02".to_string(),
        "builder-03".to_string(),
    ];
    second.normalize();

    vec![first, second]
}
