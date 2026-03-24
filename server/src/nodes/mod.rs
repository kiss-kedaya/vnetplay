use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct NodeHeartbeat {
    pub node_id: String,
    pub overlay_ip: String,
    pub latency_ms: u32,
}
