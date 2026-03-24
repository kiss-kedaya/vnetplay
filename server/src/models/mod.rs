use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use crate::nodes::NodeHeartbeat;
use crate::rooms::{default_rooms, RoomSummary};

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
}

impl AppState {
    pub fn new() -> Self {
        Self {
            rooms: Arc::new(Mutex::new(default_rooms())),
            heartbeats: Arc::new(Mutex::new(HashMap::new())),
            profile: Arc::new(NetworkProfile {
                community: "vnetplay-room".to_string(),
                secret_masked: "********".to_string(),
                supernode: "127.0.0.1:7777".to_string(),
            }),
        }
    }
}
