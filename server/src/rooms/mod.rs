use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RoomSummary {
    pub room_id: String,
    pub game: String,
    pub mode: String,
    pub members: usize,
    pub host: String,
    #[serde(default)]
    pub participants: Vec<String>,
}

impl RoomSummary {
    pub fn ensure_participant(&mut self, username: &str) {
        if !self.participants.iter().any(|item| item == username) {
            self.participants.push(username.to_string());
        }

        self.members = self.participants.len();

        if self.host.trim().is_empty() {
            self.host = username.to_string();
        }
    }
}

pub fn default_rooms() -> Vec<RoomSummary> {
    vec![
        RoomSummary {
            room_id: "sts2-night-run".to_string(),
            game: "Slay the Spire 2".to_string(),
            mode: "LAN Overlay".to_string(),
            members: 3,
            host: "kedaya-main".to_string(),
            participants: vec![
                "kedaya-main".to_string(),
                "kedaya-vps".to_string(),
                "relay-preferred".to_string(),
            ],
        },
        RoomSummary {
            room_id: "mc-build-world".to_string(),
            game: "Minecraft".to_string(),
            mode: "Overlay + Direct Join".to_string(),
            members: 5,
            host: "kedaya-vps".to_string(),
            participants: vec![
                "kedaya-vps".to_string(),
                "kedaya-main".to_string(),
                "builder-01".to_string(),
                "builder-02".to_string(),
                "builder-03".to_string(),
            ],
        },
    ]
}
