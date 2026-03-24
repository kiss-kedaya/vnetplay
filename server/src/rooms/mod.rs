use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
pub struct RoomSummary {
    pub room_id: String,
    pub game: String,
    pub mode: String,
    pub members: usize,
    pub host: String,
}

pub fn default_rooms() -> Vec<RoomSummary> {
    vec![
        RoomSummary {
            room_id: "sts2-night-run".to_string(),
            game: "Slay the Spire 2".to_string(),
            mode: "LAN Overlay".to_string(),
            members: 3,
            host: "kedaya-main".to_string(),
        },
        RoomSummary {
            room_id: "mc-build-world".to_string(),
            game: "Minecraft".to_string(),
            mode: "Overlay + Direct Join".to_string(),
            members: 5,
            host: "kedaya-vps".to_string(),
        },
    ]
}
