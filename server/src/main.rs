mod api {
    pub mod router;
}
mod config;
mod models;
mod nodes;
mod rooms;

use api::router::build_router;
use config::AppConfig;
use models::AppState;

#[tokio::main]
async fn main() {
    let config = AppConfig::from_env();
    let state = AppState::new();
    let listener = tokio::net::TcpListener::bind(&config.bind_addr)
        .await
        .expect("failed to bind vnetplay server");

    println!("vnetplay server listening on {}", config.bind_addr);

    axum::serve(listener, build_router(state))
        .await
        .expect("failed to run vnetplay server");
}
