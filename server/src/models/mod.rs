use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use chrono::Utc;

use crate::nodes::NodeHeartbeat;
use crate::rooms::RoomSummary;
use crate::storage::{default_state_path, load_state, save_state, PersistedState};

#[derive(Clone, Debug)]
pub struct NetworkProfile {
    pub community: String,
    pub secret_masked: String,
    pub supernode: String,
}

fn default_source() -> String {
    "server".to_string()
}

const MAX_RECENT_ACTIONS: usize = 80;

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
pub struct RecentAction {
    pub action: String,
    pub room_id: String,
    pub username: String,
    pub detail: String,
    pub success: bool,
    pub updated_at: String,
    #[serde(default = "default_source")]
    pub source: String,
    #[serde(default)]
    pub pid: Option<u32>,
}

impl RecentAction {
    pub fn new(action: &str, room_id: &str, username: &str, detail: &str, success: bool) -> Self {
        Self {
            action: action.to_string(),
            room_id: room_id.to_string(),
            username: username.to_string(),
            detail: detail.to_string(),
            success,
            updated_at: Utc::now().to_rfc3339(),
            source: default_source(),
            pid: None,
        }
    }

    pub fn with_source(mut self, source: &str) -> Self {
        self.source = source.to_string();
        self
    }

    pub fn with_pid(mut self, pid: Option<u32>) -> Self {
        self.pid = pid;
        self
    }

    pub fn idle() -> Self {
        Self::new("idle", "未连接", "player", "尚未收到服务端侧最近动作", true)
    }
}

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<Mutex<Vec<RoomSummary>>>,
    pub heartbeats: Arc<Mutex<HashMap<String, NodeHeartbeat>>>,
    pub recent_action: Arc<Mutex<RecentAction>>,
    pub recent_actions: Arc<Mutex<Vec<RecentAction>>>,
    pub profile: Arc<NetworkProfile>,
    pub state_path: Arc<PathBuf>,
}

impl AppState {
    pub fn new() -> Self {
        let state_path = default_state_path();
        let persisted = load_state(&state_path);

        Self {
            rooms: Arc::new(Mutex::new(persisted.rooms)),
            heartbeats: Arc::new(Mutex::new(persisted.heartbeats)),
            recent_action: Arc::new(Mutex::new(persisted.recent_action)),
            recent_actions: Arc::new(Mutex::new(persisted.recent_actions)),
            profile: Arc::new(NetworkProfile {
                community: "vnetplay-room".to_string(),
                secret_masked: "********".to_string(),
                supernode: "127.0.0.1:7777".to_string(),
            }),
            state_path: Arc::new(state_path),
        }
    }

    pub fn set_recent_action(&self, action: RecentAction) {
        let mut recent = self
            .recent_action
            .lock()
            .expect("recent_action mutex poisoned");
        *recent = action.clone();
        drop(recent);

        let mut history = self
            .recent_actions
            .lock()
            .expect("recent_actions mutex poisoned");
        history.insert(0, action);
        history.truncate(MAX_RECENT_ACTIONS);
    }

    pub fn persist(&self) {
        let rooms = self.rooms.lock().expect("rooms mutex poisoned").clone();
        let heartbeats = self
            .heartbeats
            .lock()
            .expect("heartbeats mutex poisoned")
            .clone();
        let recent_action = self
            .recent_action
            .lock()
            .expect("recent_action mutex poisoned")
            .clone();
        let recent_actions = self
            .recent_actions
            .lock()
            .expect("recent_actions mutex poisoned")
            .clone();

        save_state(
            &self.state_path,
            &PersistedState {
                rooms,
                heartbeats,
                recent_action,
                recent_actions,
            },
        );
    }
}
