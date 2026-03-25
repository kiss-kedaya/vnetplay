use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

fn current_timestamp() -> String {
    Utc::now().to_rfc3339()
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct NodeHeartbeat {
    pub node_id: String,
    pub overlay_ip: String,
    pub latency_ms: u32,
    #[serde(default = "current_timestamp")]
    pub received_at: String,
}

impl NodeHeartbeat {
    pub fn is_recent(&self, max_age_seconds: i64) -> bool {
        DateTime::parse_from_rfc3339(&self.received_at)
            .map(|timestamp| {
                (Utc::now() - timestamp.with_timezone(&Utc)).num_seconds() <= max_age_seconds
            })
            .unwrap_or(false)
    }
}
