#[derive(Clone, Debug)]
pub struct AppConfig {
    pub bind_addr: String,
    pub auth_token: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let bind_addr =
            std::env::var("VNETPLAY_BIND").unwrap_or_else(|_| "127.0.0.1:9080".to_string());
        let auth_token = std::env::var("VNETPLAY_AUTH_TOKEN")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        Self {
            bind_addr,
            auth_token,
        }
    }

    pub fn bind_scope_label(&self) -> &'static str {
        if self.bind_addr.starts_with("127.0.0.1:") || self.bind_addr.starts_with("localhost:") {
            "仅本机"
        } else {
            "允许远程访问"
        }
    }
}
