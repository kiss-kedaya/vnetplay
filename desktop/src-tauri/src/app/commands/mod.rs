use crate::app::services::n2n_service::{preview_edge_command, start_edge, stop_edge};
use crate::app::services::system_identity::current_system_username;
use crate::app::state::DesktopState;
use crate::ipc::models::{CommandResponse, StartNetworkRequest, SystemIdentityResponse};

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

    CommandResponse {
        ok: outcome.ok,
        detail: outcome.detail,
        pid: outcome.pid,
    }
}

pub fn stop_network(state: &mut DesktopState) -> CommandResponse {
    state.last_command = "stop-network".to_string();

    match state.last_pid {
        Some(pid) => {
            let outcome = stop_edge(pid);
            if outcome.ok {
                state.last_pid = None;
            }

            CommandResponse {
                ok: outcome.ok,
                detail: outcome.detail,
                pid: outcome.pid,
            }
        }
        None => CommandResponse {
            ok: true,
            detail: "no running n2n edge pid recorded".to_string(),
            pid: None,
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
    }
}
