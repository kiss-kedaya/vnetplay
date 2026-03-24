#[derive(Clone, Debug)]
pub struct DesktopState {
    pub active_room: String,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            active_room: "sts2-night-run".to_string(),
        }
    }
}
