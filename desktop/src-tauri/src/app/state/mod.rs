#[derive(Clone, Debug)]
pub struct DesktopState {
    pub active_room: String,
    pub last_command: String,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            active_room: "sts2-night-run".to_string(),
            last_command: "idle".to_string(),
        }
    }
}
