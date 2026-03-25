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
    pub host_id: String,
    #[serde(default)]
    pub participants: Vec<String>,
    #[serde(default)]
    pub participant_ids: Vec<String>,
    #[serde(default = "current_timestamp")]
    pub created_at: String,
    #[serde(default = "current_timestamp")]
    pub last_active_at: String,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub requires_password: bool,
}

impl RoomSummary {
    pub fn new(room_id: String, game: String, mode: String, host: String, host_id: String) -> Self {
        let timestamp = current_timestamp();

        Self {
            room_id,
            game,
            mode,
            members: 0,
            host,
            host_id,
            participants: Vec::new(),
            participant_ids: Vec::new(),
            created_at: timestamp.clone(),
            last_active_at: timestamp,
            password: None,
            requires_password: false,
        }
    }

    pub fn ensure_participant(&mut self, username: &str, client_id: &str) {
        if let Some(index) = self
            .participant_ids
            .iter()
            .position(|item| item == client_id)
        {
            self.participants[index] = username.to_string();
        } else {
            self.participant_ids.push(client_id.to_string());
            self.participants.push(username.to_string());
        }

        self.members = self.participant_ids.len();
        self.last_active_at = current_timestamp();

        if self.host.trim().is_empty() {
            self.host = username.to_string();
        }

        if self.host_id.trim().is_empty() {
            self.host_id = client_id.to_string();
        }
    }

    pub fn remove_participant(&mut self, client_id: &str) -> bool {
        if let Some(index) = self
            .participant_ids
            .iter()
            .position(|item| item == client_id)
        {
            self.participant_ids.remove(index);
            self.participants.remove(index);
            self.members = self.participant_ids.len();
            self.last_active_at = current_timestamp();

            if self.host_id == client_id {
                if let Some(next_host_id) = self.participant_ids.first() {
                    self.host_id = next_host_id.clone();
                    self.host = self
                        .participants
                        .first()
                        .cloned()
                        .unwrap_or_else(|| "system".to_string());
                } else {
                    self.host.clear();
                    self.host_id.clear();
                }
            }

            return true;
        }

        false
    }

    pub fn is_empty(&self) -> bool {
        self.participant_ids.is_empty()
    }

    pub fn set_password(&mut self, password: Option<String>) {
        self.password = password.filter(|value| !value.trim().is_empty());
        self.requires_password = self.password.is_some();
    }

    pub fn password_matches(&self, password: Option<&str>) -> bool {
        match self.password.as_deref() {
            Some(expected) => password.map(|value| value.trim()) == Some(expected),
            None => true,
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

        if self.host_id.trim().is_empty() {
            self.host_id = "unknown-machine".to_string();
        }

        self.members = self
            .participant_ids
            .len()
            .max(self.participants.len())
            .max(self.members);
        self.requires_password = self
            .password
            .as_ref()
            .is_some_and(|value| !value.trim().is_empty());
    }
}

pub fn default_rooms() -> Vec<RoomSummary> {
    let mut first = RoomSummary::new(
        "sts2-night-run".to_string(),
        "Slay the Spire 2".to_string(),
        "LAN Overlay".to_string(),
        "kedaya-main".to_string(),
        "machine-main".to_string(),
    );
    first.ensure_participant("kedaya-main", "machine-main");
    first.ensure_participant("kedaya-vps", "machine-vps");
    first.ensure_participant("relay-preferred", "machine-relay");
    first.set_password(Some("123456".to_string()));
    first.normalize();

    let mut second = RoomSummary::new(
        "mc-build-world".to_string(),
        "Minecraft".to_string(),
        "Overlay + Direct Join".to_string(),
        "kedaya-vps".to_string(),
        "machine-vps".to_string(),
    );
    second.ensure_participant("kedaya-vps", "machine-vps");
    second.ensure_participant("kedaya-main", "machine-main");
    second.ensure_participant("builder-01", "machine-builder-01");
    second.ensure_participant("builder-02", "machine-builder-02");
    second.ensure_participant("builder-03", "machine-builder-03");
    second.normalize();

    vec![first, second]
}
