mod app {
    pub mod commands;
    pub mod services {
        pub mod n2n_service;
    }
    pub mod state;
}
mod game {
    pub mod detector;
}
mod ipc {
    pub mod models;
}
mod network {
    pub mod edge_manager;
    pub mod node_status;
    pub mod route_probe;
}

use std::sync::Mutex;

use app::commands::{inspect_network, start_network, stop_network};
use app::state::DesktopState;
use ipc::models::CommandResponse;

#[tauri::command]
fn inspect_network_command() -> CommandResponse {
    inspect_network()
}

#[tauri::command]
fn start_network_command(state: tauri::State<Mutex<DesktopState>>) -> CommandResponse {
    let mut state = state.lock().expect("desktop state mutex poisoned");
    start_network(&mut state)
}

#[tauri::command]
fn stop_network_command(state: tauri::State<Mutex<DesktopState>>) -> CommandResponse {
    let mut state = state.lock().expect("desktop state mutex poisoned");
    stop_network(&mut state)
}

pub fn run() {
    tauri::Builder::default()
        .manage(Mutex::new(DesktopState::default()))
        .invoke_handler(tauri::generate_handler![
            inspect_network_command,
            start_network_command,
            stop_network_command
        ])
        .run(tauri::generate_context!())
        .expect("failed to run vnetplay tauri app");
}
