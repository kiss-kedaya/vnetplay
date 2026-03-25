use crate::app::services::system_identity::current_machine_id;

#[derive(Clone, Debug)]
pub struct DesktopState {
    pub active_room: String,
    pub current_username: String,
    pub current_community: String,
    pub current_supernode: String,
    pub current_server_base_url: String,
    pub current_machine_id: String,
    pub heartbeat_generation: u64,
    pub last_command: String,
    pub last_pid: Option<u32>,
    pub runtime_started_at: String,
    pub last_started_at: String,
    pub last_stopped_at: String,
}

impl Default for DesktopState {
    fn default() -> Self {
        Self {
            active_room: "未连接".to_string(),
            current_username: "player".to_string(),
            current_community: "vnetplay-room".to_string(),
            current_supernode: "127.0.0.1:7777".to_string(),
            current_server_base_url: "http://127.0.0.1:9080".to_string(),
            current_machine_id: current_machine_id(),
            heartbeat_generation: 0,
            last_command: "idle".to_string(),
            last_pid: None,
            runtime_started_at: "--".to_string(),
            last_started_at: "--".to_string(),
            last_stopped_at: "--".to_string(),
        }
    }
}
