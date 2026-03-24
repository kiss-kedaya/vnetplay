use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::nodes::NodeHeartbeat;
use crate::rooms::RoomSummary;
use crate::storage::{default_state_path, load_state, save_state, PersistedState};

#[derive(Clone, Debug)]
pub struct NetworkProfile {
    pub community: String,
    pub secret_masked: String,
    pub supernode: String,
}

#[derive(Clone)]
pub struct AppState {
    pub rooms: Arc<Mutex<Vec<RoomSummary>>>,
    pub heartbeats: Arc<Mutex<HashMap<String, NodeHeartbeat>>>,
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
            profile: Arc::new(NetworkProfile {
                community: "vnetplay-room".to_string(),
                secret_masked: "********".to_string(),
                supernode: "127.0.0.1:7777".to_string(),
            }),
            state_path: Arc::new(state_path),
        }
    }

    pub fn persist(&self) {
        let rooms = self.rooms.lock().expect("rooms mutex poisoned").clone();
        let heartbeats = self
            .heartbeats
            .lock()
            .expect("heartbeats mutex poisoned")
            .clone();

        save_state(
            &self.state_path,
            &PersistedState {
                rooms,
                heartbeats,
            },
        );
    }
}
