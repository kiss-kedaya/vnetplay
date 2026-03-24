use chrono::Utc;

fn now_string() -> String {
    Utc::now().to_rfc3339()
}

#[derive(Clone, Debug)]
pub struct DesktopState {
    pub active_room: String,
    pub current_username: String,
    pub current_community: String,
    pub current_supernode: String,
    pub last_command: String,
    pub last_pid: Option<u32>,
    pub runtime_started_at: String,
    pub last_started_at: String,
    pub last_stopped_at: String,
}

impl Default for DesktopState {
    fn default() -> Self {
        let now = now_string();

        Self {
            active_room: "sts2-night-run".to_string(),
            current_username: "player".to_string(),
            current_community: "vnetplay-room".to_string(),
            current_supernode: "127.0.0.1:7777".to_string(),
            last_command: "idle".to_string(),
            last_pid: None,
            runtime_started_at: now.clone(),
            last_started_at: now.clone(),
            last_stopped_at: "--".to_string(),
        }
    }
}
