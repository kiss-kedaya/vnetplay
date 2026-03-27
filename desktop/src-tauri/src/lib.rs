mod app {
    pub mod commands;
    pub mod services {
        pub mod heartbeat_service;
        pub mod n2n_service;
        pub mod system_identity;
    }
    pub mod state;
}
mod ipc {
    pub mod models;
}
mod network {
    pub mod node_status;
    pub mod route_probe;
}

use std::sync::{Arc, Mutex};

use app::commands::{get_system_identity, inspect_network, start_network, stop_network};
use app::services::heartbeat_service::{send_heartbeat_once, spawn_heartbeat_loop};
use app::state::{DesktopState, QqLoginState};
use ipc::models::{
    CommandResponse, QqLoginBridgePayload, StartNetworkRequest, SystemIdentityResponse,
};
use tauri::{Emitter, Manager};

#[tauri::command]
fn get_system_identity_command() -> SystemIdentityResponse {
    get_system_identity()
}

#[tauri::command]
fn inspect_network_command(state: tauri::State<Arc<Mutex<DesktopState>>>) -> CommandResponse {
    let shared_state = state.inner().clone();
    let mut state = shared_state.lock().expect("desktop state mutex poisoned");
    let had_pid_before = state.last_pid.is_some();
    let response = inspect_network(&mut state);
    let snapshot = state.clone();
    drop(state);

    if had_pid_before && snapshot.last_pid.is_none() {
        let _ = send_heartbeat_once(&snapshot, false);
    }

    response
}

#[tauri::command]
fn start_network_command(
    payload: StartNetworkRequest,
    state: tauri::State<Arc<Mutex<DesktopState>>>,
) -> CommandResponse {
    let shared_state = state.inner().clone();
    let mut state = shared_state.lock().expect("desktop state mutex poisoned");
    let response = start_network(&mut state, payload);
    let generation = state.heartbeat_generation;
    let snapshot = state.clone();
    drop(state);

    if response.ok {
        let _ = send_heartbeat_once(&snapshot, true);
        spawn_heartbeat_loop(shared_state, generation);
    }

    response
}

#[tauri::command]
fn stop_network_command(state: tauri::State<Arc<Mutex<DesktopState>>>) -> CommandResponse {
    let shared_state = state.inner().clone();
    let mut state = shared_state.lock().expect("desktop state mutex poisoned");
    let response = stop_network(&mut state);
    let snapshot = state.clone();
    drop(state);

    let _ = send_heartbeat_once(&snapshot, false);
    response
}

#[tauri::command]
fn close_qq_login_window_command(app: tauri::AppHandle) -> bool {
    if let Some(window) = app.get_webview_window("qq-login") {
        let _ = window.close();
        return true;
    }

    false
}

#[tauri::command]
fn save_qq_login_command(
    payload: QqLoginBridgePayload,
    state: tauri::State<Arc<Mutex<DesktopState>>>,
) -> bool {
    let shared_state = state.inner().clone();
    let mut state = shared_state.lock().expect("desktop state mutex poisoned");
    state.qq_login = Some(QqLoginState {
        nickname: payload.nickname,
        avatar: payload.avatar,
        qq_uid: payload.qq_uid,
        logged_at: payload.logged_at,
    });
    true
}

#[tauri::command]
fn read_qq_login_command(
    state: tauri::State<Arc<Mutex<DesktopState>>>,
) -> Option<QqLoginBridgePayload> {
    let shared_state = state.inner().clone();
    let state = shared_state.lock().expect("desktop state mutex poisoned");
    state.qq_login.as_ref().map(|login| QqLoginBridgePayload {
        nickname: login.nickname.clone(),
        avatar: login.avatar.clone(),
        qq_uid: login.qq_uid.clone(),
        logged_at: login.logged_at.clone(),
    })
}

#[tauri::command]
fn clear_qq_login_command(state: tauri::State<Arc<Mutex<DesktopState>>>) -> bool {
    let shared_state = state.inner().clone();
    let mut state = shared_state.lock().expect("desktop state mutex poisoned");
    state.qq_login = None;
    true
}

#[tauri::command]
fn complete_qq_login_command(
    payload: QqLoginBridgePayload,
    app: tauri::AppHandle,
    state: tauri::State<Arc<Mutex<DesktopState>>>,
) -> bool {
    let shared_state = state.inner().clone();
    let mut state = shared_state.lock().expect("desktop state mutex poisoned");
    state.qq_login = Some(QqLoginState {
        nickname: payload.nickname.clone(),
        avatar: payload.avatar.clone(),
        qq_uid: payload.qq_uid.clone(),
        logged_at: payload.logged_at.clone(),
    });
    drop(state);

    let _ = app.emit_to("main", "qq-login-success", payload.clone());
    let _ = app.emit("qq-login-success", payload);
    true
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::new(Mutex::new(DesktopState::default())))
        .invoke_handler(tauri::generate_handler![
            get_system_identity_command,
            inspect_network_command,
            start_network_command,
            stop_network_command,
            close_qq_login_window_command,
            save_qq_login_command,
            read_qq_login_command,
            clear_qq_login_command,
            complete_qq_login_command
        ])
        .run(tauri::generate_context!())
        .expect("failed to run vnetplay tauri app");
}
