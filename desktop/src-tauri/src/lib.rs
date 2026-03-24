mod app {
    pub mod commands;
    pub mod services {
        pub mod n2n_service;
        pub mod system_identity;
    }
    pub mod state;
}
mod ipc {
    pub mod models;
}

use std::sync::Mutex;

use app::commands::{get_system_identity, inspect_network, start_network, stop_network};
use app::state::DesktopState;
use ipc::models::{CommandResponse, StartNetworkRequest, SystemIdentityResponse};

#[tauri::command]
fn get_system_identity_command() -> SystemIdentityResponse {
    get_system_identity()
}

#[tauri::command]
fn inspect_network_command(state: tauri::State<Mutex<DesktopState>>) -> CommandResponse {
    let mut state = state.lock().expect("desktop state mutex poisoned");
    inspect_network(&mut state)
}

#[tauri::command]
fn start_network_command(
    payload: StartNetworkRequest,
    state: tauri::State<Mutex<DesktopState>>,
) -> CommandResponse {
    let mut state = state.lock().expect("desktop state mutex poisoned");
    start_network(&mut state, payload)
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
            get_system_identity_command,
            inspect_network_command,
            start_network_command,
            stop_network_command
        ])
        .run(tauri::generate_context!())
        .expect("failed to run vnetplay tauri app");
}
