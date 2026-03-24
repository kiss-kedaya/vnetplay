#[derive(Clone, Debug)]
pub struct AppConfig {
    pub bind_addr: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let bind_addr = std::env::var("VNETPLAY_BIND").unwrap_or_else(|_| "127.0.0.1:9080".to_string());
        Self { bind_addr }
    }
}
