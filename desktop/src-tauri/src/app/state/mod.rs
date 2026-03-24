#[derive(Clone, Debug)]
pub struct DesktopState {
    pub active_room: String,
    pub current_username: String,
    pub last_command: String,
    pub last_pid: Option<u32>,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            active_room: "sts2-night-run".to_string(),
            current_username: "player".to_string(),
            last_command: "idle".to_string(),
            last_pid: None,
        }
    }
}
