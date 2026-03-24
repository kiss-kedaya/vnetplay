#[derive(Clone, Debug)]
pub struct NodeHeartbeat {
    pub node_id: String,
    pub overlay_ip: String,
    pub latency_ms: u32,
}
