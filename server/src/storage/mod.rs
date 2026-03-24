use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::nodes::NodeHeartbeat;
use crate::rooms::{default_rooms, RoomSummary};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct PersistedState {
    pub rooms: Vec<RoomSummary>,
    pub heartbeats: HashMap<String, NodeHeartbeat>,
}

impl PersistedState {
    pub fn default_state() -> Self {
        Self {
            rooms: default_rooms(),
            heartbeats: HashMap::new(),
        }
    }
}

pub fn default_state_path() -> PathBuf {
    PathBuf::from("data/runtime-state.json")
}

pub fn load_state(path: &Path) -> PersistedState {
    match fs::read_to_string(path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| PersistedState::default_state()),
        Err(_) => PersistedState::default_state(),
    }
}

pub fn save_state(path: &Path, state: &PersistedState) {
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    if let Ok(content) = serde_json::to_string_pretty(state) {
        let _ = fs::write(path, content);
    }
}
