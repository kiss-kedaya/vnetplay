use chrono::Utc;

use crate::app::services::n2n_service::{preview_edge_command, start_edge, stop_edge};
use crate::app::services::system_identity::current_system_username;
use crate::app::state::DesktopState;
use crate::ipc::models::{CommandResponse, InspectSnapshot, StartNetworkRequest, SystemIdentityResponse};

fn now_string() -> String {
    Utc::now().to_rfc3339()
}

pub fn command_summary() -> &'static str {
    "desktop command bridge ready"
}

pub fn get_system_identity() -> SystemIdentityResponse {
    SystemIdentityResponse {
        system_username: current_system_username(),
    }
}

pub fn start_network(state: &mut DesktopState, payload: StartNetworkRequest) -> CommandResponse {
    state.last_command = "start-network".to_string();
    state.active_room = payload.room_id.clone();
    state.current_username = payload.username.clone();
    state.current_community = payload.community.clone();
    state.current_supernode = payload.supernode.clone();
    let outcome = start_edge(
        &state.active_room,
        &state.current_username,
        &state.current_community,
        &state.current_supernode,
    );
    state.last_pid = outcome.pid;
    if outcome.ok {
        state.last_started_at = now_string();
    }

    CommandResponse {
        ok: outcome.ok,
        detail: outcome.detail,
        pid: outcome.pid,
        inspect: Some(build_inspect_snapshot(state)),
    }
}

pub fn stop_network(state: &mut DesktopState) -> CommandResponse {
    state.last_command = "stop-network".to_string();

    match state.last_pid {
        Some(pid) => {
            let outcome = stop_edge(pid);
            if outcome.ok {
                state.last_pid = None;
                state.last_stopped_at = now_string();
            }

            CommandResponse {
                ok: outcome.ok,
                detail: outcome.detail,
                pid: outcome.pid,
                inspect: Some(build_inspect_snapshot(state)),
            }
        }
        None => CommandResponse {
            ok: true,
            detail: "no running n2n edge pid recorded".to_string(),
            pid: None,
            inspect: Some(build_inspect_snapshot(state)),
        },
    }
}

pub fn inspect_network(state: &DesktopState) -> CommandResponse {
    CommandResponse {
        ok: true,
        detail: preview_edge_command(
            &state.active_room,
            &state.current_username,
            &state.current_community,
            &state.current_supernode,
        ),
        pid: state.last_pid,
        inspect: Some(build_inspect_snapshot(state)),
    }
}

fn build_inspect_snapshot(state: &DesktopState) -> InspectSnapshot {
    InspectSnapshot {
        room_id: state.active_room.clone(),
        username: state.current_username.clone(),
        community: state.current_community.clone(),
        supernode: state.current_supernode.clone(),
        command_preview: preview_edge_command(
            &state.active_room,
            &state.current_username,
            &state.current_community,
            &state.current_supernode,
        ),
        edge_state: if state.last_pid.is_some() {
            "running".to_string()
        } else {
            "idle".to_string()
        },
        last_command: state.last_command.clone(),
        runtime_started_at: state.runtime_started_at.clone(),
        last_started_at: state.last_started_at.clone(),
        last_stopped_at: state.last_stopped_at.clone(),
        last_pid: state.last_pid,
    }
}
